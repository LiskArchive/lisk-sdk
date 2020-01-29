/*
 * Copyright © 2019 Lisk Foundation
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

const { BaseSynchronizer } = require('./base_synchronizer');
const {
	clearBlocksTempTable,
	restoreBlocks,
	deleteBlocksAfterHeight,
} = require('./utils');
const {
	ApplyPenaltyAndAbortError,
	ApplyPenaltyAndRestartError,
	AbortError,
	BlockProcessingError,
	RestartError,
} = require('./errors');

class FastChainSwitchingMechanism extends BaseSynchronizer {
	constructor({
		storage,
		logger,
		channel,
		blocks,
		bft,
		processor,
		dpos,
		activeDelegates,
	}) {
		super(storage, logger, channel);
		this.dpos = dpos;
		this.blocks = blocks;
		this.bft = bft;
		this.processor = processor;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	// eslint-disable-next-line class-methods-use-this,no-empty-function
	async run(receivedBlock, peerId) {
		this.active = true;

		try {
			const highestCommonBlock = await this._requestLastCommonBlock(peerId);
			const blocks = await this._queryBlocks(
				receivedBlock,
				highestCommonBlock,
				peerId,
			);
			await this._validateBlocks(blocks, highestCommonBlock, peerId);
			await this._switchChain(highestCommonBlock, blocks, peerId);
		} catch (err) {
			if (err instanceof ApplyPenaltyAndRestartError) {
				return this._applyPenaltyAndRestartSync(
					err.peerId,
					receivedBlock,
					err.reason,
				);
			}

			if (err instanceof ApplyPenaltyAndAbortError) {
				this.logger.info(
					{ err, peerId, reason: err.reason },
					'Applying penalty to peer and aborting synchronization mechanism',
				);
				return this.channel.invoke('app:applyPenaltyOnPeer', {
					peerId,
					penalty: 100,
				});
			}

			if (err instanceof RestartError) {
				this.logger.info(
					{ err, reason: err.reason },
					`Restarting synchronization mechanism with reason: ${err.reason}`,
				);
				return this.channel.publish('app:processor:sync', {
					block: receivedBlock,
				});
			}

			if (err instanceof AbortError) {
				return this.logger.info(
					{ err, reason: err.reason },
					`Aborting synchronization mechanism with reason: ${err.reason}`,
				);
			}

			throw err;
		} finally {
			this.active = false;
		}

		return true;
	}

	async isValidFor(receivedBlock) {
		const { lastBlock } = this.blocks;

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const twoRounds = this.constants.activeDelegates * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > twoRounds) {
			return false;
		}

		const blockRound = this.dpos.rounds.calcRound(receivedBlock.height);
		const delegateList = await this.dpos.getForgerPublicKeysForRound(
			blockRound,
		);

		return delegateList.includes(receivedBlock.generatorPublicKey);
	}

	async _requestBlocksWithinIDs(peerId, fromId, toId) {
		const maxFailedAttempts = 10; // TODO: Probably expose this to the configuration layer?
		const blocks = [];
		let failedAttempts = 0; // Failed attempt === the peer doesn't return any block or there is a network failure (no response or takes too long to answer)
		let lastFetchedID = fromId;

		while (failedAttempts < maxFailedAttempts) {
			const { data: chunkOfBlocks } = await this.channel.invokeFromNetwork(
				'requestFromPeer',
				{
					procedure: 'getBlocksFromId',
					peerId,
					data: {
						blockId: lastFetchedID,
					},
				},
			); // Note that the block matching lastFetchedID is not returned but only higher blocks.

			if (chunkOfBlocks && chunkOfBlocks.length) {
				blocks.push(...chunkOfBlocks);
				[{ id: lastFetchedID }] = chunkOfBlocks.slice(-1);
				const index = blocks.findIndex(block => block.id === toId);
				if (index > -1) {
					return blocks.splice(0, index + 1); // Removes unwanted extra blocks
				}
			} else {
				failedAttempts += 1; // It's only considered a failed attempt if the target peer doesn't provide any blocks on a single request
			}
		}

		return blocks;
	}

	async _queryBlocks(receivedBlock, highestCommonBlock, peerId) {
		if (!highestCommonBlock) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't return a common block",
			);
		}

		if (highestCommonBlock.height < this.bft.finalizedHeight) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				`Common block height ${highestCommonBlock.height} is lower than the finalized height of the chain ${this.bft.finalizedHeight}`,
			);
		}

		if (
			this.blocks.lastBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2 ||
			receivedBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2
		) {
			throw new AbortError(
				`Height difference between both chains is higher than ${this.constants
					.activeDelegates * 2}`,
			);
		}

		this.logger.debug(
			{
				peerId,
				fromBlockId: highestCommonBlock.id,
				toBlockId: receivedBlock.id,
			},
			'Requesting blocks within ID range from peer',
		);

		const blocks = await this._requestBlocksWithinIDs(
			peerId,
			highestCommonBlock.id,
			receivedBlock.id,
		);

		if (!blocks || !blocks.length) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				`Peer didn't return any requested block within IDs ${highestCommonBlock.id} and ${receivedBlock.id}`,
			);
		}

		return blocks;
	}

	async _validateBlocks(blocks, commonBlock, peerId) {
		this.logger.debug(
			{
				blocks: blocks.map(block => ({
					blockId: block.id,
					height: block.height,
				})),
			},
			'Validating blocks',
		);
		try {
			const commonFullBlock = await this.storage.entities.Block.getOne(
				{
					id_eql: commonBlock.id,
				},
				{ extended: true },
			);
			let previousBlock = await this.processor.deserialize(commonFullBlock);
			for (const block of blocks) {
				this.logger.trace(
					{ blockId: block.id, height: block.height },
					'Validating block',
				);
				const blockInstance = await this.processor.deserialize(block);
				await this.processor.validate(blockInstance, {
					lastBlock: previousBlock,
				});
				previousBlock = blockInstance;
			}
		} catch (err) {
			throw new ApplyPenaltyAndAbortError(peerId, 'Block validation failed');
		}
		this.logger.debug('Successfully validated blocks');
	}

	async _applyBlocks(blocksToApply) {
		try {
			for (const block of blocksToApply) {
				this.logger.trace(
					{
						blockId: block.id,
						height: block.height,
					},
					'Applying blocks',
				);
				const blockInstance = await this.processor.deserialize(block);
				await this.processor.processValidated(blockInstance);
			}
		} catch (e) {
			throw new BlockProcessingError();
		}
	}

	async _handleBlockProcessingFailure(error, highestCommonBlock, peerId) {
		this.logger.error({ err: error }, 'Error while processing blocks');
		this.logger.debug(
			{ height: highestCommonBlock.height },
			'Deleting blocks after height',
		);
		await deleteBlocksAfterHeight(
			this.processor,
			this.blocks,
			this.logger,
			highestCommonBlock.height,
		);
		this.logger.debug('Restoring blocks from temporary table');
		await restoreBlocks(this.blocks, this.processor);
		throw new ApplyPenaltyAndRestartError(
			peerId,
			'Detected invalid block while processing list of requested blocks',
		);
	}

	async _switchChain(highestCommonBlock, blocksToApply, peerId) {
		this.logger.info('Switching chain');
		this.logger.debug(
			{ height: highestCommonBlock.height },
			`Deleting blocks after height ${highestCommonBlock.height}`,
		);

		await deleteBlocksAfterHeight(
			this.processor,
			this.blocks,
			this.logger,
			highestCommonBlock.height,
			true,
		);

		try {
			this.logger.debug(
				{
					blocks: blocksToApply.map(block => ({
						blockId: block.id,
						height: block.height,
					})),
				},
				'Applying blocks',
			);
			await this._applyBlocks(blocksToApply);
			this.logger.info(
				{
					currentHeight: this.blocks.lastBlock.height,
					highestCommonBlockHeight: highestCommonBlock.height,
				},
				'Successfully switched chains. Node is now up to date',
			);
		} catch (err) {
			if (err instanceof BlockProcessingError) {
				await this._handleBlockProcessingFailure(
					err,
					highestCommonBlock,
					peerId,
				);
			} else {
				throw err;
			}
		} finally {
			this.logger.debug('Cleaning blocks temp table');
			await clearBlocksTempTable(this.storage);
		}
	}

	_computeLastTwoRoundsHeights() {
		return new Array(
			Math.min(
				this.constants.activeDelegates * 2,
				this.blocks.lastBlock.height,
			),
		)
			.fill(0)
			.map((_, index) => this.blocks.lastBlock.height - index);
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one).
	 */
	async _requestLastCommonBlock(peerId) {
		this.logger.debug({ peerId }, 'Requesting the last common block with peer');
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer
		let numberOfRequests = 1; // Keeps track of the number of requests made to the remote peer

		const heightList = this._computeLastTwoRoundsHeights();

		while (numberOfRequests < requestLimit) {
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

			// Request the highest common block with the previously computed list
			// to the given peer
			try {
				const { data } = await this.channel.invokeFromNetwork(
					'requestFromPeer',
					{
						procedure: 'getHighestCommonBlock',
						peerId,
						data: {
							ids: blockIds,
						},
					},
				);

				if (data) {
					this.logger.debug(
						{ blockId: data.id, height: data.height },
						'Common block found',
					);
					return data;
				}
			} finally {
				numberOfRequests += 1;
			}
		}

		return undefined;
	}
}

module.exports = { FastChainSwitchingMechanism };
