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

const { parseBlockToJson } = require('../blocks/chain');
const { FORK_STATUS_DIFFERENT_CHAIN } = require('../blocks');

/**
 * Restore blocks from temp table and re-apply to chain
 * Steps:
 * 1. Read all blocks from temp_block table
 * 2. Apply blocks one by one to current chain
 * 3. Each block gets deleted from temp_block table when its being applied
 *
 * @param {Object} blocksModule - injection of blocks module object
 * @param {Object} processorModule - injection of processor module object
 * @param {Object} tx - database transaction
 * @return {Promise<Boolean>} - returns true when successfully restoring blocks, returns false if no blocks were found
 */
const restoreBlocks = async (blocksModule, processorModule, tx) => {
	const tempBlocks = await blocksModule.getTempBlocks(tx);

	if (tempBlocks.length === 0) {
		return false;
	}

	for (const block of tempBlocks) {
		await processorModule.processValidated(block, {
			removeFromTempTable: true,
		});
	}

	return true;
};

/**
 * Allows to restore blocks if there are blocks left upon startup in temp_block table (e.g. node crashed)
 * Depends upon fork choice rule if blocks will be applied
 *
 * 1. Gets all blocks from temp_block table
 * 2. Sort blocks according to height as we want to lowest height (the next block to be applied)
 * 3. Uses next block with fork choice rule - if fork status indicates we should switch to different chain
 * we continue applying blocks using the `restoreBlocks` function.
 * Otherwise we truncate the temp_block table.
 *
 * @param {Object} blocksModule - injection of blocks module object
 * @param {Object} processorModule - injection of processor module object
 * @param {Object} storageModule - injection of storage module object
 * @return {Promise<void>}
 */
const restoreBlocksUponStartup = async (
	blocksModule,
	processorModule,
	storageModule,
) => {
	// Get all blocks and find lowest height (next one to be applied)
	const tempBlocks = await storageModule.entities.TempBlock.get();
	const blockLowestHeight = tempBlocks.reduce((prev, current) =>
		prev.height < current.height ? prev : current,
	);
	const nextTempBlock = parseBlockToJson(blockLowestHeight.fullBlock);
	const forkStatus = await processorModule.forkStatus(nextTempBlock);

	const inDifferentChain = forkStatus === FORK_STATUS_DIFFERENT_CHAIN;
	if (inDifferentChain) {
		// In case fork status is DIFFERENT_CHAIN - try to apply blocks from temp_block table
		await restoreBlocks(blocksModule, processorModule);
	} else {
		// Not different chain - Delete remaining blocks from temp_block table
		await storageModule.entities.TempBlock.truncate();
	}
};

/**
 * Deletes blocks of the current chain after the desired height exclusive and
 * backs them up in temp_block database table.
 * @param {Object} processorModule
 * @param {Object} blocksModule
 * @param {Number} desiredHeight - The height desired to delete blocks after.
 * @return {Promise<void>} - Promise is resolved when blocks are successfully deleted
 */
const deleteBlocksAfterHeightAndBackup = async (
	processorModule,
	blocksModule,
	desiredHeight,
) => {
	let { height: currentHeight } = blocksModule.lastBlock;
	while (desiredHeight > currentHeight) {
		const lastBlock = await processorModule.deleteLastBlock({
			saveTempBlock: true,
		});
		currentHeight = lastBlock.height;
	}
};

/**
 * Returns a list of block heights corresponding to the first block of a defined number
 * of rounds (listSizeLimit)
 *
 * @param listSizeLimit - The size of the array to be computed
 * @param currentRound
 * @return {Promise<Array<string>>}
 * @private
 */
const computeBlockHeightsList = async (listSizeLimit, currentRound) => {
	const startingHeight = currentRound * this.constants.activeDelegates;
	const heightList = new Array(listSizeLimit)
		.fill(0)
		.map((_, i) => startingHeight - i * this.constants.activeDelegates)
		.filter(height => height > 0);
	const heightListAfterFinalized = heightList.filter(
		height => height > this.bft.finalizedHeight,
	);
	return heightList.length !== heightListAfterFinalized.length
		? [...heightListAfterFinalized, this.bft.finalizedHeight]
		: heightListAfterFinalized;
};

module.exports = {
	restoreBlocks,
	restoreBlocksUponStartup,
	deleteBlocksAfterHeightAndBackup,
	computeBlockHeightsList,
};
