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

const blockV1 = require('./block_v1');
const blockV2 = require('./block_v2');

const storageReadFunc = {
	0: blockV1.storageRead,
	1: blockV1.storageRead,
	2: blockV2.storageRead,
};
const storageRead = raw => storageReadFunc[raw.version](raw);

/**
 * Normalize blocks and their transactions.
 *
 * @param {Array} rows - Data from extended block entity
 * @returns {Array} blocks - List of normalized blocks with transactions
 */
const readStorageRows = (rows, interfaceAdapters, genesisBlock) => {
	const blocks = rows.map(block => {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		block = storageRead(block);

		if (block) {
			if (block.id === genesisBlock.id) {
				// Generate fake signature for genesis block
				block.generationSignature = new Array(65).join('0');
			}

			// Normalize transaction
			if (block.transactions) {
				block.transactions = interfaceAdapters.transactions.fromBlock(block);
			}
		}
		return block;
	});

	return blocks;
};

/**
 * Load blocks with offset
 *
 *
 * @param {number} height - Block height
 * @param {object} tx - Database transaction object
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.block - Block with requested height
 */
const loadBlocksWithOffset = async (
	storage,
	interfaceAdapters,
	genesisBlock,
	blocksAmount,
	fromHeight = 0,
) => {
	// Calculate toHeight
	const toHeight = fromHeight + blocksAmount;

	const filters = {
		height_gte: fromHeight,
		height_lt: toHeight,
	};

	const options = {
		limit: null,
		sort: ['height:asc', 'rowId:asc'],
		extended: true,
	};

	// Loads extended blocks from storage
	const rows = await storage.entities.Block.get(filters, options);
	return readStorageRows(rows, interfaceAdapters, genesisBlock);
};

/**
 * Loads full normalized last block from database, see: loader.loadBlockChain (private).
 *
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error message if error occurred
 * @returns {Object} cb.block - Full normalized last block
 */
const loadLastBlock = async (storage, interfaceAdapters, genesisBlock) => {
	// Get full last block from database
	// FIXME: Review SQL order by clause
	const rows = await storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1, extended: true },
	);
	if (!rows || rows.length === 0) {
		throw new Error('Failed to load last block');
	}
	// Normalize block
	return readStorageRows(rows, interfaceAdapters, genesisBlock)[0];

	// Update last block
	// TODO: Update from callee
	// modules.blocks.lastBlock.set(block);
};

/**
 * Load full block with a particular height
 *
 * @param {number} height - Block height
 * @param {object} tx - Database transaction object
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.block - Block with requested height
 */
const loadBlockByHeight = async (
	storage,
	height,
	interfaceAdapters,
	genesisBlock,
	tx,
) => {
	const row = await storage.entities.Block.getOne(
		{ height },
		{ extended: true },
		tx,
	);
	return readStorageRows([row], interfaceAdapters, genesisBlock)[0];
};

module.exports = {
	storageRead,
	readStorageRows,
	loadBlocksWithOffset,
	loadLastBlock,
	loadBlockByHeight,
};
