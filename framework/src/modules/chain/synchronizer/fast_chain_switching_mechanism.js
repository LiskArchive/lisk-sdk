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
	RestartError,
} = require('./errors');

class FastChainSwitchingMechanism extends BaseSynchronizer {
	constructor({
		storage,
		logger,
		channel,
		slots,
		blocks,
		bft,
		processor,
		dpos,
		activeDelegates,
	}) {
		super(storage, logger, channel);
		this.slots = slots;
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
			await this._switchChain(highestCommonBlock, blocks);
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
				return this.channel.invoke('network:applyPenalty', {
					peerId,
					penalty: 100,
				});
			}

			if (err instanceof RestartError) {
				this.logger.info(
					{ err, reason: err.reason },
					`Restarting synchronization mechanism with reason: ${err.reason}`,
				);
				return this.channel.publish('chain:processor:sync', {
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

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {Object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	async isValidFor(receivedBlock) {
		const { lastBlock } = this.blocks;

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const twoRounds = this.constants.activeDelegates * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > twoRounds) {
			return false;
		}

		const blockRound = this.slots.calcRound(receivedBlock.height);
		const delegateList = await this.dpos.getForgerPublicKeysForRound(
			blockRound,
		);

		return delegateList.includes(receivedBlock.generatorPublicKey);
	}

	/**
	 * Queries the blocks from the selected peer.
	 * @param {Object} receivedBlock
	 * @param {Object} highestCommonBlock
	 * @param {string} peerId
	 * @return {Promise<Array<Object>>}
	 * @throws {ApplyPenaltyAndRestartError} - In case peer didn't return highest common block or its height is lower than the finalized height
	 * @throws {AbortError} - If the height difference between both chains is higher than ACTIVE_DELEGATES * 2
	 * @private
	 */
	async _queryBlocks(receivedBlock, highestCommonBlock, peerId) {
		if (
			!highestCommonBlock ||
			highestCommonBlock.height < this.bft.finalizedHeight
		) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't return a common block or its height is lower than the finalized height of the chain",
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
				`Peer didn't return any requested block within IDs ${
					highestCommonBlock.id
				} and ${receivedBlock.id}`,
			);
		}

		return blocks;
	}

	/**
	 * Validates a set of blocks
	 * @param {Array<Object>} blocks - The array of blocks to validate
	 * @param {object} commonBlock
	 * @param {string} peerId
	 * @return {Promise<void>}
	 * @throws {ApplyPenaltyAndAbortError} - In case any of the blocks fails to validate
	 * @private
	 */
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

	/**
	 * Switches to desired chain
	 * @param {Object} highestCommonBlock
	 * @param {Array<Object>} blocksToApply
	 * @return {Promise<void>}
	 * @private
	 */
	async _switchChain(highestCommonBlock, blocksToApply) {
		this.logger.info('Switching chain');
		this.logger.debug(
			{ height: highestCommonBlock.height },
			`Deleting blocks after height ${highestCommonBlock.height}`,
		);

		await deleteBlocksAfterHeight(
			this.processor,
			this.blocks,
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
			for (const block of blocksToApply) {
				this.logger.trace(
					{ blockId: block.id, height: block.height },
					'Applying blocks',
				);
				const blockInstance = await this.processor.deserialize(block);
				await this.processor.processValidated(blockInstance);
			}
		} catch (err) {
			this.logger.error({ err }, 'Error while processing blocks');
			this.logger.debug(
				{ height: highestCommonBlock.height },
				'Deleting blocks after height',
			);
			await deleteBlocksAfterHeight(
				this.processor,
				this.blocks,
				highestCommonBlock.height,
			);
			this.logger.debug('Restoring blocks from temporary table');
			await restoreBlocks(this.blocks, this.processor);
		} finally {
			this.logger.debug('Cleaning blocks temp table');
			await clearBlocksTempTable(this.storage);
		}

		this.logger.info('Successfully switched chains. Node is now up to date');
	}

	/**
	 * Computes the height values for the last two rounds
	 * @return {Array<number>}
	 * @private
	 */
	_computeLastTwoRoundsHeights() {
		return new Array(this.constants.activeDelegates * 2)
			.fill(0)
			.map((_, index) => this.blocks.lastBlock.height - index);
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
		this.logger.debug({ peerId }, 'Requesting the last common block with peer');
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer
		let numberOfRequests = 0; // Keeps track of the number of requests made to the remote peer

		const heightList = this._computeLastTwoRoundsHeights();

		while (numberOfRequests < requestLimit) {
			const blockIds = (await this.storage.entities.Block.get(
				{
					height_in: heightList,
				},
				{
					sort: 'height:asc',
				},
			)).map(block => block.id);

			// Request the highest common block with the previously computed list
			// to the given peer
			try {
				const { data } = await this.channel.invoke('network:requestFromPeer', {
					procedure: 'getHighestCommonBlock',
					peerId,
					data: {
						ids: blockIds,
					},
				});

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
