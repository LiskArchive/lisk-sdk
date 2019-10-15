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

const { addBlockProperties } = require('../blocks');
const { restoreBlocks, deleteBlocksAfterHeight } = require('./utils');
const { ApplyPenaltyAndRestartError, RestartError } = require('./errors');

class FastChainSwitchingMechanism {
	constructor({
		storage,
		logger,
		channel,
		blocks,
		processor,
		bft,
		slots,
		dpos,
		activeDelegates,
	}) {
		this.storage = storage;
		this.logger = logger;
		this.slots = slots;
		this.dpos = dpos;
		this.blocks = blocks;
		this.bft = bft;
		this.channel = channel;
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
			await this._validateBlocks(blocks);
			await this._switchChain(highestCommonBlock, blocks);
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
			throw error; // If the error is none of the mentioned above, throw.
		} finally {
			this.active = false;
		}

		return true;
	}

	/**
	 * Helper function that encapsulates:
	 * 1. applying a penalty to a peer.
	 * 2. restarting sync.
	 * 3. throwing the reason.
	 *
	 * @param {object} peerId - The peer ID to target
	 * @param receivedBlock
	 * @param reason
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
	 * Queries the blocks from the selected peer.
	 * @param receivedBlock
	 * @param highestCommonBlock
	 * @param peerId
	 * @return {Promise<Array<Object>>}
	 * @private
	 */
	async _queryBlocks(receivedBlock, highestCommonBlock, peerId) {
		if (
			!highestCommonBlock ||
			highestCommonBlock.height < this.bft.finalizedHeight
		) {
			// TODO: Ban the peer
		}

		if (
			this.blocks.lastBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2 ||
			receivedBlock.height - highestCommonBlock.height >
				this.constants.activeDelegates * 2
		) {
			throw new Error('Aborting the process'); // TODO: Use errors
		}

		const blocks = this._requestBlocksWithinIDs(
			peerId,
			highestCommonBlock.id,
			receivedBlock.id,
		);

		if (!blocks || !blocks.length) {
			// TODO: Check what to do
		}

		return blocks;
	}

	/**
	 * Validates a set of blocks
	 * @param blocks
	 * @return {Promise<void>}
	 * @private
	 */
	async _validateBlocks(blocks) {
		try {
			for (const block of blocks) {
				addBlockProperties(block);
				await this.processor.validate(block);
			}
		} catch (err) {
			throw new Error('Abort here'); // TODO: Use errors
		}
	}

	/**
	 * Switches to desired chain
	 * @param highestCommonBlock
	 * @param blocksToApply
	 * @return {Promise<void>}
	 * @private
	 */
	async _switchChain(highestCommonBlock, blocksToApply) {
		await deleteBlocksAfterHeight(
			this.processor,
			this.blocks,
			highestCommonBlock.height,
			true,
		);

		try {
			for (const block of blocksToApply) {
				addBlockProperties(block);
				await this.processor.processValidated(block);
			}
		} catch (err) {
			await deleteBlocksAfterHeight(
				this.processor,
				this.blocks,
				highestCommonBlock.height,
			);
			await restoreBlocks(this.blocks, this.processor);
		}
	}

	/**
	 * Request blocks from `fromID` ID to `toID` ID from an specific peer `peer`
	 * //TODO: Generalize and extract to common logic
	 * @param {object} peerId - The ID of the peer to target
	 * @param {string} fromId - The starting block ID to fetch from
	 * @param {string} toId - The ending block ID
	 * @return {Promise<Array<object>>}
	 * @private
	 */
	async _requestBlocksWithinIDs(peerId, fromId, toId) {
		const maxFailedAttempts = 10; // TODO: Probably expose this to the configuration layer?
		const blocks = [];
		let failedAttempts = 0; // Failed attempt === the peer doesn't return any block or there is a network failure (no response or takes too long to answer)
		let lastFetchedID = fromId;

		while (failedAttempts < maxFailedAttempts) {
			const { data } = await this.channel.invoke('network:requestFromPeer', {
				procedure: 'getBlocksFromId',
				peerId,
				data: {
					blockId: lastFetchedID,
				},
			}); // Note that the block matching lastFetchedID is not returned but only higher blocks.

			if (data) {
				blocks.push(...data); // `data` is an array of blocks.
				lastFetchedID = data.slice(-1).pop().id;
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

	/**
	 * Computes the height values for the last two rounds
	 * @return {Promise<string>}
	 * @private
	 */
	async _computeLastTwoRoundsHeights() {
		new Array(this.constants.activeDelegates * 2)
			.fill(0)
			.map((_, index) => this.blocks.lastBlock.height - index);
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one).
	 *
	 * @param peerId - The ID of the peer to target.
	 * @return {Promise<Object | undefined>}
	 * @private
	 */
	async _requestLastCommonBlock(peerId) {
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer
		let numberOfRequests = 0; // Keeps track of the number of requests made to the remote peer

		while (numberOfRequests < requestLimit) {
			const blockIds = (await this.storage.entities.Block.get(
				{
					height_in: this._computeLastTwoRoundsHeights(),
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
					return data;
				}
			} finally {
				numberOfRequests += 1;
			}
		}

		return undefined;
	}

	get isActive() {
		return this.active;
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {object} receivedBlock - The blocked received from the network
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
}

module.exports = { FastChainSwitchingMechanism };
