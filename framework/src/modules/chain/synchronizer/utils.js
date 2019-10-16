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

const { maxBy } = require('lodash');
const {
	FORK_STATUS_DIFFERENT_CHAIN,
	addBlockProperties,
} = require('../blocks');

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
const restoreBlocks = async (blocksModule, processorModule, tx = null) => {
	const tempBlocks = await blocksModule.getTempBlocks(tx);

	if (tempBlocks.length === 0) {
		return false;
	}

	for (const tempBlockEntry of tempBlocks) {
		addBlockProperties(tempBlockEntry.fullBlock);
		// TODO: Remove this code when serializing PR is merged
		tempBlockEntry.fullBlock.previousBlock =
			tempBlockEntry.fullBlock.previousBlockId;
		await processorModule.processValidated(tempBlockEntry.fullBlock, {
			removeFromTempTable: true,
		});
	}

	return true;
};

/**
 * Clear the content of the blocks temporary table
 * @param {object} storageModule
 * @return {Promise<void>}
 */
const clearBlocksTempTable = storageModule =>
	storageModule.entities.TempBlock.truncate();

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

	const nextTempBlock = blockLowestHeight.fullBlock;
	const forkStatus = await processorModule.forkStatus(nextTempBlock);
	const inDifferentChain =
		forkStatus === FORK_STATUS_DIFFERENT_CHAIN ||
		blockLowestHeight.id === blocksModule.lastBlock.id;

	if (inDifferentChain) {
		// In case fork status is DIFFERENT_CHAIN - try to apply blocks from temp_block table
		await restoreBlocks(blocksModule, processorModule);
	} else {
		// Not different chain - Delete remaining blocks from temp_block table
		await clearBlocksTempTable(storageModule);
	}
};

/**
 * Deletes blocks of the current chain after the desired height exclusive and optionally
 * backs them up in temp_block database table.
 * @param {Object} processorModule
 * @param {Object} blocksModule
 * @param {Number} desiredHeight - The height desired to delete blocks after.
 * @param {boolean} backup - If true, backs the blocks up in a temporary table
 * @return {Promise<void>} - Promise is resolved when blocks are successfully deleted
 */
const deleteBlocksAfterHeight = async (
	processorModule,
	blocksModule,
	desiredHeight,
	backup = false,
) => {
	let { height: currentHeight } = blocksModule.lastBlock;
	while (desiredHeight < currentHeight) {
		const lastBlock = await processorModule.deleteLastBlock({
			saveTempBlock: backup,
		});
		currentHeight = lastBlock.height;
	}
};

/**
 * Returns a list of block heights corresponding to the first block of a defined number
 * of rounds (listSizeLimit)
 *
 * @param finalizedHeight
 * @param activeDelegates
 * @param listSizeLimit - The size of the array to be computed
 * @param currentRound
 * @return {Array<string>}
 * @private
 */
const computeBlockHeightsList = (
	finalizedHeight,
	activeDelegates,
	listSizeLimit,
	currentRound,
) => {
	const startingHeight = Math.max(1, (currentRound - 1) * activeDelegates);
	const heightList = new Array(listSizeLimit)
		.fill(0)
		.map((_, i) => startingHeight - i * activeDelegates)
		.filter(height => height > 0);
	const heightListAfterFinalized = heightList.filter(
		height => height > finalizedHeight,
	);
	return heightList.length !== heightListAfterFinalized.length
		? [...heightListAfterFinalized, finalizedHeight]
		: heightListAfterFinalized;
};

/**
 * Computes the largest subset of an array of object literals by the maximum
 * value of the property returned in `condition` function
 *
 * @param {Array<Object>} arrayOfObjects
 * @param {Function} propertySelectorFunc
 * @return {Array<Object>}
 * @private
 *
 * @example
 *
 * const input = [{id: 1, height: 2}, {id: 2, height: 3}, {id: 3, height: 3}]
 * const output = _computeLargestSubsetMaxBy(input, item => item.height);
 *
 * `output` equals to: [{id: 2, height: 3}, {id: 3, height: 3}]
 */
// eslint-disable-next-line class-methods-use-this
const computeLargestSubsetMaxBy = (arrayOfObjects, propertySelectorFunc) => {
	const maximumBy = maxBy(arrayOfObjects, propertySelectorFunc);
	const absoluteMax = propertySelectorFunc(maximumBy);
	const largestSubset = [];
	// eslint-disable-next-line no-restricted-syntax
	for (const item of arrayOfObjects) {
		if (propertySelectorFunc(item) === absoluteMax) {
			largestSubset.push(item);
		}
	}
	return largestSubset;
};

module.exports = {
	computeBlockHeightsList,
	computeLargestSubsetMaxBy,
	deleteBlocksAfterHeight,
	restoreBlocksUponStartup,
	restoreBlocks,
	clearBlocksTempTable,
};
