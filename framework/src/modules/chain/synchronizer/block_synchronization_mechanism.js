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

const { groupBy, cloneDeep } = require('lodash');
const { BaseSynchronizer } = require('./base_synchronizer');
const {
	computeLargestSubsetMaxBy,
	computeBlockHeightsList,
	deleteBlocksAfterHeight,
} = require('./utils');
const { FORK_STATUS_DIFFERENT_CHAIN } = require('../blocks');
const { ApplyPenaltyAndRestartError, RestartError } = require('./errors');

const PEER_STATE_CONNECTED = 2;

class BlockSynchronizationMechanism extends BaseSynchronizer {
	constructor({
		storage,
		logger,
		channel,
		slots,
		interfaceAdapters,
		bft,
		blocks,
		processorModule,
		activeDelegates,
	}) {
		super(storage, logger, channel);
		this.bft = bft;
		this.slots = slots;
		this.blocks = blocks;
		this.processorModule = processorModule;
		this.constants = {
			activeDelegates,
		};
		this.interfaceAdapters = interfaceAdapters;
		this.active = false;
	}

	// eslint-disable-next-line consistent-return
	async run(receivedBlock) {
		this.active = true;
		try {
			const bestPeer = await this._computeBestPeer();
			await this._requestAndValidateLastBlock(bestPeer.id);
			const lastCommonBlock = await this._revertToLastCommonBlock(bestPeer.id);
			await this._requestAndApplyBlocksToCurrentChain(
				receivedBlock,
				lastCommonBlock,
				bestPeer.id,
			);
		} catch (error) {
			if (error instanceof ApplyPenaltyAndRestartError) {
				return this.applyPenaltyAndRestartSync(
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
			throw error; // If the error is none of the mentioned above, throw.
		} finally {
			this.active = false;
		}
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {Object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	// eslint-disable-next-line no-unused-vars
	async isValidFor(receivedBlock) {
		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.storage.entities.Block.getOne({
			height_eql: this.bft.finalizedHeight,
		});
		const finalizedBlockSlot = this.slots.getSlotNumber(
			finalizedBlock.timestamp,
		);
		const currentBlockSlot = this.slots.getSlotNumber();
		const threeRounds = this.constants.activeDelegates * 3;

		return currentBlockSlot - finalizedBlockSlot > threeRounds;
	}

	/**
	 * Requests blocks from startingBlockID to an specific peer until endingBlockID
	 * is met and applies them on top of the current chain.
	 *
	 * @param {Object} receivedBlock
	 * @param {Object} lastCommonBlock
	 * @param {string} peerId - The ID of the peer to target
	 * @return {Promise<void | boolean>}
	 * @throws {ApplyPenaltyAndRestartError} - In case peer didn't return any blocks after a number of retries
	 * @throws {ApplyPenaltyAndRestartError} - If the new tip of the chain has no preference over the previous tip of the chain before synchronizing
	 * @throws {RestartError} - If any of the blocks fail to apply
	 * @private
	 */
	async _requestAndApplyBlocksToCurrentChain(
		receivedBlock,
		lastCommonBlock,
		peerId,
	) {
		this.logger.debug(
			{
				peerId,
				fromBlockId: lastCommonBlock.id,
				toBlockId: receivedBlock.id,
			},
			'Requesting blocks within ID range from peer',
		);

		const listOfFullBlocks = await this.requestBlocksWithinIDs(
			peerId,
			lastCommonBlock.id,
			receivedBlock.id,
		);
		const tipBeforeApplying = cloneDeep(this.blocks.lastBlock);

		if (!listOfFullBlocks.length) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't return any block after requesting blocks",
			);
		}

		this.logger.debug('Applying obtained blocks from peer');

		try {
			for (const block of listOfFullBlocks) {
				const deserializedBlock = await this.processorModule.deserialize(block);
				await this.processorModule.process(deserializedBlock);
			}
			this.logger.debug(
				'Successfully applied blocks obtained from peer to chain',
			);
		} catch (err) {
			this.logger.debug({ err }, 'Failed to apply obtained blocks from peer');
		}

		// If the list of blocks has not been fully applied
		if (!this.blocks.lastBlock.id === receivedBlock.id) {
			// Check if the new tip has priority over the last tip we had before applying
			const forkStatus = await this.processorModule.forkStatus(
				this.blocks.lastBlock, // New tip of the chain
				tipBeforeApplying, // Previous tip of the chain
			);

			const isDifferentChain =
				forkStatus === FORK_STATUS_DIFFERENT_CHAIN ||
				this.blocks.lastBlock.id === tipBeforeApplying.id;

			if (!isDifferentChain) {
				throw new ApplyPenaltyAndRestartError(
					peerId,
					'New tip of the chain has no preference over the previous tip before synchronizing',
				);
			}

			this.logger.info('Restarting block synchronization');

			throw new RestartError(
				'The list of blocks has not been fully applied. Trying again',
			);
		}

		this.logger.debug(
			{ peerId },
			'Successfully requested and applied blocks from peer',
		);

		return true;
	}

	/**
	 * Helper function that encapsulates:
	 * 1. applying a penalty to a peer.
	 * 2. restarting sync.
	 * 3. throwing the reason.
	 *
	 * @param {Object} peerId - The peer ID to target
	 * @param {Object} receivedBlock
	 * @param {string} reason
	 * a penalty and restarting sync
	 * @private
	 */
	async _applyPenaltyAndRestartSync(peerId, receivedBlock, reason) {
		this.logger.info(
			{ peerId, reason },
			'Applying penalty to peer and restarting synchronizer',
		);
		await this.channel.invoke('network:applyPenalty', {
			peerId,
			penalty: 100,
		});
		await this.channel.publish('chain:processor:sync', {
			block: receivedBlock,
		});
	}

	/**
	 * Reverts the current chain so the new tip of the chain corresponds to the
	 * last common block.
	 *
	 * @param {string} peerId - The ID of the selected peer to target.
	 * @return {Promise<object>} - Returns the last common block
	 * @throws {ApplyPenaltyAndRestartError} - In case no common block has been found
	 * @throws {ApplyPenaltyAndRestartError} - In case the common block height is lower than the finalized height
	 * @private
	 */
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

		this.logger.debug({ blockId: lastCommonBlock.id }, 'Found common block');

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
	 *
	 * @param {string} peerId - The ID of the peer to target.
	 * @return {Promise<Object | undefined>}
	 * @private
	 */
	async _requestLastCommonBlock(peerId) {
		const blocksPerRequestLimit = 10; // Maximum number of block IDs to be included in a single request
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer

		let numberOfRequests = 0; // Keeps track of the number of requests made to the remote peer
		let highestCommonBlock; // Holds the common block returned by the peer if found.
		let currentRound = this.slots.calcRound(this.blocks.lastBlock.height); // Holds the current round number
		let currentHeight = currentRound * this.constants.activeDelegates;

		while (
			!highestCommonBlock &&
			numberOfRequests < requestLimit &&
			currentHeight > this.bft.finalizedHeight
		) {
			const blockIds = (await this.storage.entities.Block.get(
				{
					height_in: computeBlockHeightsList(
						this.bft.finalizedHeight,
						this.constants.activeDelegates,
						blocksPerRequestLimit,
						currentRound,
					),
				},
				{
					sort: 'height:asc',
				},
			)).map(block => block.id);

			// Request the highest common block with the previously computed list
			// to the given peer
			const { data } = await this.channel.invoke('network:requestFromPeer', {
				procedure: 'getHighestCommonBlock',
				peerId,
				data: {
					ids: blockIds,
				},
			});

			highestCommonBlock = data; // If no common block, data is undefined.

			currentRound -= blocksPerRequestLimit;
			currentHeight = currentRound * this.constants.activeDelegates;
			numberOfRequests += 1;
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
	 * @param {string} peerId - Peer ID, used to target an specific peer
	 * the peer specifically to request its last block of its chain.
	 * @return {Promise<Object>}
	 * @throws {ApplyPenaltyAndRestartError} - in case the tip of the chain of the peer is not valid or is not a different chain
	 * @private
	 */
	async _requestAndValidateLastBlock(peerId) {
		this.logger.debug({ peerId }, 'Requesting tip of the chain from peer');

		const { data } = await this.channel.invoke('network:requestFromPeer', {
			procedure: 'getLastBlock',
			peerId,
		});

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
			forkStatus === FORK_STATUS_DIFFERENT_CHAIN ||
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
	 *
	 * @param {Object} networkLastBlock
	 * @return {Promise<{valid: boolean, err: null}|{valid: boolean, err: *}>}
	 * @private
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
	 * @return {Array<Object>}
	 * @private
	 */
	async _computeBestPeer() {
		const peers = await this.channel.invoke('network:getPeers', {
			state: PEER_STATE_CONNECTED,
		});

		this.logger.trace(
			{ peers: peers.map(peer => `${peer.ip}:${peer.wsPort}`) },
			'List of connected peers',
		);

		// TODO: Move this to validator
		const requiredProps = [
			'blockVersion',
			'prevotedConfirmedUptoHeight',
			'height',
		];
		const compatiblePeers = peers.filter(p =>
			requiredProps.every(prop => Object.keys(p).includes(prop)),
		);

		if (!compatiblePeers.length) {
			throw new Error('Connected compatible peers list is empty');
		}

		this.logger.trace(
			{ peers: compatiblePeers.map(peer => `${peer.ip}:${peer.wsPort}`) },
			'List of compatible peers connected peers',
		);
		this.logger.debug('Computing the best peer to synchronize from');
		// Largest subset of peers with largest prevotedConfirmedUptoHeight
		const largestSubsetByPrevotedConfirmedUptoHeight = computeLargestSubsetMaxBy(
			compatiblePeers,
			peer => peer.prevotedConfirmedUptoHeight,
		);
		// Largest subset of peers with largest height
		const largestSubsetByHeight = computeLargestSubsetMaxBy(
			largestSubsetByPrevotedConfirmedUptoHeight,
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
		// Find the largest subset
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
			prevotedConfirmedUptoHeight:
				selectedPeers[randomPeerIndex].prevotedConfirmedUptoHeight,
			height: selectedPeers[randomPeerIndex].height,
			version: selectedPeers[randomPeerIndex].blockVersion,
		};

		const forkStatus = await this.processorModule.forkStatus(peersTip);

		const inDifferentChain = forkStatus === FORK_STATUS_DIFFERENT_CHAIN;

		if (!inDifferentChain) {
			throw new Error('Violation of fork choice rule');
		}

		const bestPeer =
			selectedPeers[Math.floor(Math.random() * selectedPeers.length)];
		bestPeer.id = `${bestPeer.ip}:${bestPeer.wsPort}`;

		this.logger.debug(
			{ peer: bestPeer },
			'Successfully computed the best peer',
		);

		return bestPeer;
	}
}

module.exports = { BlockSynchronizationMechanism };
