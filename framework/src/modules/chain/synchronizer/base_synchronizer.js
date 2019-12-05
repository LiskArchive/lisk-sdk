/* eslint-disable class-methods-use-this */
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

const {
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_VALID_BLOCK,
} = require('../bft');

class BaseSynchronizer {
	constructor(storage, logger, channel, processorModule, blocksModule) {
		this.storage = storage;
		this.logger = logger;
		this.channel = channel;
		this.processorModule = processorModule;
		this.blocksModule = blocksModule;
	}

	async run() {
		throw new Error('#run method must be implemented');
	}

	async isValidFor() {
		throw new Error('#isValidFor method must be implemented');
	}

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

	async _restoreBlocks(tx = null) {
		const tempBlocks = await this.blocksModule.getTempBlocks(
			{},
			{ sort: 'height:asc', limit: null },
			tx,
		);

		if (!tempBlocks || tempBlocks.length === 0) {
			return false;
		}

		for (const tempBlockEntry of tempBlocks) {
			const tempBlockInstance = await this.processorModule.deserialize(
				tempBlockEntry.fullBlock,
			);
			await this.processorModule.processValidated(tempBlockInstance, {
				removeFromTempTable: true,
			});
		}

		return true;
	}

	_clearBlocksTempTable() {
		this.storage.entities.TempBlock.truncate();
	}

	async _deleteBlocksAfterHeight(desiredHeight, backup = false) {
		let { height: currentHeight } = this.blocksModule.lastBlock;
		this.logger.debug(
			{ desiredHeight, lastBlockHeight: currentHeight },
			'Deleting blocks after height',
		);
		while (desiredHeight < currentHeight) {
			this.logger.trace(
				{
					height: this.blocksModule.lastBlock.height,
					blockId: this.blocksModule.lastBlock.id,
				},
				'Deleting block and backing it up to temporary table',
			);
			const lastBlock = await this.processorModule.deleteLastBlock({
				saveTempBlock: backup,
			});
			currentHeight = lastBlock.height;
		}
	}

	/**
	 * Allows to restore blocks if there are blocks left upon startup in temp_block table (e.g. node crashed)
	 * Depends upon fork choice rule if blocks will be applied
	 *
	 * 1. Gets all blocks from temp_block table
	 * 2. Sort blocks according to height as we want to lowest height (the next block to be applied)
	 * 3. Uses next block with fork choice rule - if fork status indicates we should switch to different chain
	 * we continue applying blocks using the `restoreBlocks` function.
	 * Otherwise we truncate the temp_block table.
	 */
	async _restoreBlocksUponStartup() {
		// Get all blocks and find lowest height (next one to be applied)
		const tempBlocks = await this.storage.entities.TempBlock.get(
			{},
			{
				sort: 'height:asc',
				limit: null,
			},
		);
		const blockLowestHeight = tempBlocks[0];
		const blockHighestHeight = tempBlocks[tempBlocks.length - 1];

		const nextTempBlock = await this.processorModule.deserialize(
			blockHighestHeight.fullBlock,
		);
		const forkStatus = await this.processorModule.forkStatus(nextTempBlock);
		const blockHasPriority =
			forkStatus === FORK_STATUS_DIFFERENT_CHAIN ||
			forkStatus === FORK_STATUS_VALID_BLOCK;

		// Block in the temp table has preference over current tip of the chain
		if (blockHasPriority) {
			this.logger.info('Restoring blocks from temporary table');
			await this._deleteBlocksAfterHeight(blockLowestHeight.height - 1, false);
			// In case fork status is DIFFERENT_CHAIN - try to apply blocks from temp_block table
			await this._restoreBlocks();
			this.logger.info('Chain successfully restored');
		} else {
			// Not different chain - Delete remaining blocks from temp_block table
			await this._clearBlocksTempTable();
		}
	}
}

module.exports = { BaseSynchronizer };
