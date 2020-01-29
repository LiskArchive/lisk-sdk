/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const { groupBy } = require('lodash');
const { ForkStatus } = require('@liskhq/lisk-bft');
const { BaseSynchronizer } = require('./base_synchronizer');
const {
	computeLargestSubsetMaxBy,
	computeBlockHeightsList,
	deleteBlocksAfterHeight,
	restoreBlocks,
	clearBlocksTempTable,
} = require('./utils');
const {
	AbortError,
	ApplyPenaltyAndRestartError,
	RestartError,
	BlockProcessingError,
} = require('./errors');

class BlockSynchronizationMechanism extends BaseSynchronizer {
	constructor({
		storage,
		logger,
		channel,
		rounds,
		bft,
		blocks,
		processorModule,
		activeDelegates,
	}) {
		super(storage, logger, channel);
		this.bft = bft;
		this.rounds = rounds;
		this.blocks = blocks;
		this.processorModule = processorModule;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	// eslint-disable-next-line consistent-return
	async run(receivedBlock) {
		this.active = true;
		try {
			const bestPeer = await this._computeBestPeer();
			await this._requestAndValidateLastBlock(bestPeer.peerId);
			const lastCommonBlock = await this._revertToLastCommonBlock(
				bestPeer.peerId,
			);
			await this._requestAndApplyBlocksToCurrentChain(
				receivedBlock,
				lastCommonBlock,
				bestPeer.peerId,
			);
		} catch (error) {
			if (error instanceof ApplyPenaltyAndRestartError) {
				return this._applyPenaltyAndRestartSync(
					error.peerId,
					receivedBlock,
					error.reason,
				);
			}

			if (error instanceof RestartError) {
				return this.channel.publish('chain:processor:sync', {
					block: receivedBlock,
				});
			}

			if (error instanceof AbortError) {
				return this.logger.info(
					{ error, reason: error.reason },
					'Aborting synchronization mechanism',
				);
			}

			throw error; // If the error is none of the mentioned above, throw.
		} finally {
			this.active = false;
		}
	}

	// eslint-disable-next-line no-unused-vars
	async isValidFor() {
		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.storage.entities.Block.getOne({
			height_eql: this.bft.finalizedHeight,
		});
		const finalizedBlockSlot = this.blocks.slots.getSlotNumber(
			finalizedBlock.timestamp,
		);
		const currentBlockSlot = this.blocks.slots.getSlotNumber();
		const threeRounds = this.constants.activeDelegates * 3;

		return currentBlockSlot - finalizedBlockSlot > threeRounds;
	}

	async _requestAndApplyBlocksWithinIDs(peerId, fromId, toId) {
		const maxFailedAttempts = 10; // TODO: Probably expose this to the configuration layer?
		let failedAttempts = 0; // Failed attempt === the peer doesn't return any block or there is a network failure (no response or takes too long to answer)
		let lastFetchedID = fromId;
		let finished = false;

		while (!finished && failedAttempts < maxFailedAttempts) {
			const { data: blocks } = await this.channel.invokeFromNetwork(
				'requestFromPeer',
				{
					procedure: 'getBlocksFromId',
					peerId,
					data: {
						blockId: lastFetchedID,
					},
				},
			); // Note that the block matching lastFetchedID is not returned but only higher blocks.

			if (blocks && blocks.length) {
				[{ id: lastFetchedID }] = blocks.slice(-1);
				const index = blocks.findIndex(block => block.id === toId);
				if (index > -1) {
					blocks.splice(index + 1); // Removes unwanted extra blocks
				}

				this.logger.debug(
					{ fromId: blocks[0].id, toId: blocks[blocks.length - 1].id },
					'Applying obtained blocks from peer',
				);

				try {
					for (const block of blocks) {
						const deserializedBlock = await this.processorModule.deserialize(
							block,
						);
						await this.processorModule.process(deserializedBlock);
					}
				} catch (err) {
					this.logger.error({ err }, 'Block processing failed');
					throw new BlockProcessingError();
				}

				finished = this.blocks.lastBlock.id === toId;
			} else {
				failedAttempts += 1; // It's only considered a failed attempt if the target peer doesn't provide any blocks on a single request
			}
		}

		if (failedAttempts === maxFailedAttempts) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't return any block after requesting blocks",
			);
		}
	}

	/**
	 * When there is a failure applying blocks received from the peer,
	 * it's needede to check whether the tip of the temp block chain has
	 * preference over the current tip. If so, the temporary chain is restored
	 * on top of the current chain and the blocks temp table is cleaned up
	 */
	async _handleBlockProcessingError(lastCommonBlock, peerId) {
		// If the list of blocks has not been fully applied
		this.logger.debug('Failed to apply obtained blocks from peer');
		const [tipBeforeApplying] = await this.storage.entities.TempBlock.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);

		if (!tipBeforeApplying) {
			this.logger.error('Blocks temp table should not be empty');
			throw new RestartError('Blocks temp table should not be empty');
		}

		const tipBeforeApplyingInstance = await this.processorModule.deserialize(
			tipBeforeApplying.fullBlock,
		);
		// Check if the new tip has priority over the last tip we had before applying
		const forkStatus = await this.processorModule.forkStatus(
			this.blocks.lastBlock, // New tip of the chain
			tipBeforeApplyingInstance, // Previous tip of the chain
		);

		const newTipHasPreference = forkStatus === ForkStatus.DIFFERENT_CHAIN;

		if (!newTipHasPreference) {
			this.logger.debug(
				{
					currentTip: this.blocks.lastBlock.id,
					previousTip: tipBeforeApplyingInstance.id,
				},
				'Previous tip of the chain has preference over current tip. Restoring chain from temp table',
			);
			try {
				this.logger.debug(
					{ height: lastCommonBlock.height },
					'Deleting blocks after height',
				);
				await deleteBlocksAfterHeight(
					this.processorModule,
					this.blocks,
					this.logger,
					lastCommonBlock.height,
				);
				this.logger.debug('Restoring blocks from temporary table');
				await restoreBlocks(this.blocks, this.processorModule);

				this.logger.debug('Cleaning blocks temp table');
				await clearBlocksTempTable(this.storage);
			} catch (error) {
				this.logger.error(
					{ err: error },
					'Failed to restore blocks from blocks temp table',
				);
			}
			throw new ApplyPenaltyAndRestartError(
				peerId,
				'New tip of the chain has no preference over the previous tip before synchronizing',
			);
		}

		this.logger.debug(
			{
				currentTip: this.blocks.lastBlock.id,
				previousTip: tipBeforeApplyingInstance.id,
			},
			'Current tip of the chain has preference over previous tip',
		);

		this.logger.debug('Cleaning blocks temporary table');
		await clearBlocksTempTable(this.storage);

		this.logger.info('Restarting block synchronization');

		throw new RestartError(
			'The list of blocks has not been fully applied. Trying again',
		);
	}

	async _requestAndApplyBlocksToCurrentChain(
		receivedBlock,
		lastCommonBlock,
		peerId,
	) {
		this.logger.debug(
			{
				peerId,
				from: {
					blockId: lastCommonBlock.id,
					height: lastCommonBlock.height,
				},
				to: {
					blockId: receivedBlock.id,
					height: receivedBlock.height,
				},
			},
			'Requesting blocks within ID range from peer',
		);

		try {
			await this._requestAndApplyBlocksWithinIDs(
				peerId,
				lastCommonBlock.id,
				receivedBlock.id,
			);
		} catch (err) {
			if (!(err instanceof BlockProcessingError)) {
				throw err;
			}
			await this._handleBlockProcessingError(lastCommonBlock, peerId);
		}

		this.logger.debug('Cleaning up blocks temporary table');
		await clearBlocksTempTable(this.storage);

		this.logger.debug(
			{ peerId },
			'Successfully requested and applied blocks from peer',
		);

		return true;
	}

	async _revertToLastCommonBlock(peerId) {
		this.logger.debug(
			{ peerId },
			'Reverting chain to the last common block with peer',
		);

		this.logger.debug({ peerId }, 'Requesting the last common block from peer');
		const lastCommonBlock = await this._requestLastCommonBlock(peerId);

		if (!lastCommonBlock) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				'No common block has been found between the chain and the targeted peer',
			);
		}

		this.logger.debug(
			{ blockId: lastCommonBlock.id, height: lastCommonBlock.height },
			'Found common block',
		);

		if (lastCommonBlock.height < this.bft.finalizedHeight) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				'The last common block height is less than the finalized height of the current chain',
			);
		}

		this.logger.debug(
			{ blockId: lastCommonBlock.id, height: lastCommonBlock.height },
			'Deleting blocks after common block',
		);

		await deleteBlocksAfterHeight(
			this.processorModule,
			this.blocks,
			this.logger,
			lastCommonBlock.height,
			true,
		);

		this.logger.debug(
			{ lastBlockId: this.blocks.lastBlock.id },
			'Successfully deleted blocks',
		);

		return lastCommonBlock;
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one).
	 */
	async _requestLastCommonBlock(peerId) {
		const blocksPerRequestLimit = 10; // Maximum number of block IDs to be included in a single request
		const requestLimit = 3; // Maximum number of requests to be made to the remote peer

		let numberOfRequests = 1; // Keeps track of the number of requests made to the remote peer
		let highestCommonBlock; // Holds the common block returned by the peer if found.
		let currentRound = this.rounds.calcRound(this.blocks.lastBlock.height); // Holds the current round number
		let currentHeight = currentRound * this.constants.activeDelegates;

		while (
			!highestCommonBlock &&
			numberOfRequests < requestLimit &&
			currentHeight > this.bft.finalizedHeight
		) {
			const heightList = computeBlockHeightsList(
				this.bft.finalizedHeight,
				this.constants.activeDelegates,
				blocksPerRequestLimit,
				currentRound,
			);

			const blockIds = (
				await this.storage.entities.Block.get(
					{
						height_in: heightList,
					},
					{
						sort: 'height:asc',
						limit: heightList.length,
					},
				)
			).map(block => block.id);

			let data;

			try {
				// Request the highest common block with the previously computed list
				// to the given peer
				data = (
					await this.channel.invokeFromNetwork('requestFromPeer', {
						procedure: 'getHighestCommonBlock',
						peerId,
						data: {
							ids: blockIds,
						},
					})
				).data;
			} catch (e) {
				numberOfRequests += 1;
				// eslint-disable-next-line no-continue
				continue;
			}

			if (!data) {
				numberOfRequests += 1;
				// eslint-disable-next-line no-continue
				continue;
			}

			highestCommonBlock = data; // If no common block, data is undefined.

			currentRound -= blocksPerRequestLimit;
			currentHeight = currentRound * this.constants.activeDelegates;
		}

		return highestCommonBlock;
	}

	/**
	 * Requests the last full block from an specific peer and performs
	 * validations against this block after it has been received.
	 * If valid, the full block is returned.
	 * If invalid, an exception is thrown.
	 *
	 * This behavior is defined in section `2. Step: Obtain tip of chain` in LIP-0014
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 */
	async _requestAndValidateLastBlock(peerId) {
		this.logger.debug({ peerId }, 'Requesting tip of the chain from peer');

		const { data } = await this.channel.invokeFromNetwork('requestFromPeer', {
			procedure: 'getLastBlock',
			peerId,
		});

		if (!data) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't provide its last block",
			);
		}

		const networkLastBlock = await this.processorModule.deserialize(data);

		this.logger.debug(
			{ peerId, blockId: networkLastBlock.id },
			'Received tip of the chain from peer',
		);

		const { valid: validBlock } = await this._blockDetachedStatus(
			networkLastBlock,
		);

		const forkStatus = await this.processorModule.forkStatus(networkLastBlock);

		const inDifferentChain =
			forkStatus === ForkStatus.DIFFERENT_CHAIN ||
			networkLastBlock.id === this.blocks.lastBlock.id;
		if (!validBlock || !inDifferentChain) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				'The tip of the chain of the peer is not valid or is not in a different chain',
			);
		}
	}

	/**
	 * This wrappers allows us to check using an if
	 * instead of forcing us to use a try/catch block
	 * for branching code execution.
	 * The original method works well in the context
	 * of the Pipeline but not in other cases
	 * that's why we wrap it here.
	 */
	async _blockDetachedStatus(networkLastBlock) {
		try {
			await this.processorModule.validateDetached(networkLastBlock);
			return { valid: true, err: null };
		} catch (err) {
			return { valid: false, err };
		}
	}

	/**
	 * Computes the best peer to continue working with
	 * according to the set of rules defined in Step 1. of Block Synchronization Mechanism
	 *
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 */
	async _computeBestPeer() {
		const peers = await this.channel.invoke('app:getConnectedPeers');

		if (!peers || peers.length === 0) {
			throw new Error('List of connected peers is empty');
		}

		this.logger.trace(
			{ peers: peers.map(peer => peer.peerId) },
			'List of connected peers',
		);

		// TODO: Move this to validator
		const requiredProps = ['blockVersion', 'maxHeightPrevoted', 'height'];
		const compatiblePeers = peers.filter(p =>
			requiredProps.every(prop => Object.keys(p).includes(prop)),
		);

		if (!compatiblePeers.length) {
			throw new Error('Connected compatible peers list is empty');
		}

		this.logger.trace(
			{ peers: compatiblePeers.map(peer => peer.peerId) },
			'List of compatible peers connected peers',
		);
		this.logger.debug('Computing the best peer to synchronize from');
		// Largest subset of peers with largest maxHeightPrevoted
		const largestSubsetBymaxHeightPrevoted = computeLargestSubsetMaxBy(
			compatiblePeers,
			peer => peer.maxHeightPrevoted,
		);
		// Largest subset of peers with largest height
		const largestSubsetByHeight = computeLargestSubsetMaxBy(
			largestSubsetBymaxHeightPrevoted,
			peer => peer.height,
		);
		// Group peers by their block Id
		// Output: {{'lastBlockId':[peers], 'anotherBlockId': [peers]}
		const peersGroupedByBlockId = groupBy(
			largestSubsetByHeight,
			peer => peer.lastBlockId,
		);

		const blockIds = Object.keys(peersGroupedByBlockId);
		let maxNumberOfPeersInSet = 0;
		let selectedPeers = [];
		let selectedBlockId = blockIds[0];
		// Find the largest subset with same block ID
		// eslint-disable-next-line no-restricted-syntax
		for (const blockId of blockIds) {
			const peersByBlockId = peersGroupedByBlockId[blockId];
			const numberOfPeersInSet = peersByBlockId.length;
			if (
				numberOfPeersInSet > maxNumberOfPeersInSet ||
				(numberOfPeersInSet === maxNumberOfPeersInSet &&
					blockId < selectedBlockId)
			) {
				maxNumberOfPeersInSet = numberOfPeersInSet;
				selectedPeers = peersByBlockId;
				selectedBlockId = blockId;
			}
		}

		// Pick random peer from list
		const randomPeerIndex = Math.floor(Math.random() * selectedPeers.length);
		const peersTip = {
			maxHeightPrevoted: selectedPeers[randomPeerIndex].maxHeightPrevoted,
			height: selectedPeers[randomPeerIndex].height,
			version: selectedPeers[randomPeerIndex].blockVersion,
		};

		const forkStatus = await this.processorModule.forkStatus(peersTip);

		const tipHasPreference = forkStatus === ForkStatus.DIFFERENT_CHAIN;

		if (!tipHasPreference) {
			throw new AbortError(
				`Peer tip does not have preference over current tip. Fork status: ${forkStatus}`,
			);
		}

		const bestPeer =
			selectedPeers[Math.floor(Math.random() * selectedPeers.length)];

		this.logger.debug(
			{ peer: bestPeer },
			'Successfully computed the best peer',
		);

		return bestPeer;
	}
}

module.exports = { BlockSynchronizationMechanism };
