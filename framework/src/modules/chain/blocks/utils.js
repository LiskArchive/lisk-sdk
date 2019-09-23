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

const _ = require('lodash');
const { hash } = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');

/**
 * Generates a list of full blocks for another node upon sync request from that node, see: modules.transport.internal.blocks.
 * so that's why this new method was added
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of blocks
 */
// eslint-disable-next-line class-methods-use-this
const loadBlocksFromLastBlockId = async (storage, lastBlockId, limit) => {
	if (!lastBlockId) {
		throw new Error('lastBlockId needs to be specified');
	}
	if (!limit) {
		throw new Error('Limit needs to be specified');
	}

	// Get height of block with supplied ID
	const [lastBlock] = await storage.entities.Block.get({ id: lastBlockId });
	if (!lastBlock) {
		throw new Error(`Invalid lastBlockId requested: ${lastBlockId}`);
	}

	const lastBlockHeight = lastBlock.height;

	// Calculate max block height for database query
	const fetchUntilHeight = lastBlockHeight + limit;

	const filter = {
		height_gt: lastBlockHeight,
		height_lte: fetchUntilHeight,
	};

	const blocks = await storage.entities.Block.get(filter, {
		extended: true,
		limit,
		sort: ['height'],
	});

	// TODO: Remove this parse, after #4295
	return blocks.map(block => {
		const parsedBlock = {
			...block,
			previousBlock: block.previousBlockId ? block.previousBlockId : '',
		};
		delete parsedBlock.previousBlockId;
		return parsedBlock;
	});
};

/**
 * Get blocks IDs sequence - last block ID, IDs of first blocks of last 5 rounds, genesis block ID.
 *
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.res - Result
 * @returns {string} cb.res.firstHeight - Height of last block
 * @returns {string} cb.res.ids - Comma separated list of blocks IDs
 */
const getIdSequence = async (
	storage,
	height,
	lastBlock,
	genesisBlock,
	numberOfDelegates,
) => {
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	const rows = await storage.entities.Block.getFirstBlockIdOfLastRounds({
		height,
		numberOfRounds: 5,
		numberOfDelegates,
	});
	if (rows.length === 0) {
		throw new Error(`Failed to get id sequence for height: ${height}`);
	}

	const ids = [];

	// Add genesis block at the end if the set doesn't contain it already
	if (genesisBlock) {
		const __genesisBlock = {
			id: genesisBlock.id,
			height: genesisBlock.height,
		};

		if (!_.includes(rows, __genesisBlock.id)) {
			rows.push(__genesisBlock);
		}
	}

	// Add last block at the beginning if the set doesn't contain it already
	if (lastBlock && !_.includes(rows, lastBlock.id)) {
		rows.unshift({
			id: lastBlock.id,
			height: lastBlock.height,
		});
	}

	// Extract blocks IDs
	rows.forEach(row => {
		// FIXME: Looks like double check
		if (!_.includes(ids, row.id)) {
			ids.push(row.id);
		}
	});

	return {
		firstHeight: rows[0].height,
		ids: ids.join(),
	};
};

/**
 * Calculate broadhash getting the last 5 blocks from the database
 *
 * @returns {height, broadhash} broadhash and height
 *
 */
const calculateNewBroadhash = async (storage, nethash, height) => {
	const blocks = await storage.entities.Block.get(
		{},
		{
			limit: 5,
			sort: 'height:desc',
		},
	);

	if (blocks.length <= 1) {
		return {
			broadhash: nethash,
			height,
		};
	}
	const seed = blocks.map(row => row.id).join('');
	const broadhash = hash(seed, 'utf8').toString('hex');
	const blockHeight = blocks[0].height;
	return { broadhash, height: blockHeight };
};

/**
 * Adds default properties to block.
 *
 * @param {Object} block - Block object reduced
 * @returns {Object} Block object completed
 */
const addBlockProperties = block => {
	block.totalAmount = new BigNum(block.totalAmount || 0);
	block.totalFee = new BigNum(block.totalFee || 0);
	block.reward = new BigNum(block.reward || 0);

	if (block.version === undefined) {
		block.version = 0;
	}
	if (block.numberOfTransactions === undefined) {
		if (block.transactions === undefined) {
			block.numberOfTransactions = 0;
		} else {
			block.numberOfTransactions = block.transactions.length;
		}
	}
	if (block.payloadLength === undefined) {
		block.payloadLength = 0;
	}
	if (block.transactions === undefined) {
		block.transactions = [];
	}
	return block;
};

/**
 * Deletes default properties from block.
 *
 * @param {Object} block - Block object completed
 * @returns {Object} Block object reduced
 */
const deleteBlockProperties = block => {
	const reducedBlock = {
		...block,
	};
	if (reducedBlock.version === 0) {
		delete reducedBlock.version;
	}
	// verifyBlock ensures numberOfTransactions is transactions.length
	if (typeof reducedBlock.numberOfTransactions === 'number') {
		delete reducedBlock.numberOfTransactions;
	}
	if (reducedBlock.totalAmount.equals(0)) {
		delete reducedBlock.totalAmount;
	}
	if (reducedBlock.totalFee.equals(0)) {
		delete reducedBlock.totalFee;
	}
	if (reducedBlock.payloadLength === 0) {
		delete reducedBlock.payloadLength;
	}
	if (reducedBlock.reward.equals(0)) {
		delete reducedBlock.reward;
	}
	if (reducedBlock.transactions && reducedBlock.transactions.length === 0) {
		delete reducedBlock.transactions;
	}
	return reducedBlock;
};

/**
 * Calculates block id based on block.
 *
 * @param {block} blockBytes
 * @returns {string} Block id
 * @todo Add description for the params
 */
const getId = blockBytes => {
	const hashedBlock = hash(blockBytes);
	const temp = Buffer.alloc(8);
	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < 8; i++) {
		temp[i] = hashedBlock[7 - i];
	}

	// eslint-disable-next-line new-cap
	const id = new BigNum.fromBuffer(temp).toString();
	return id;
};

/**
 * Set height according to the given last block.
 *
 * @private
 * @func setHeight
 * @param {Object} block - Target block
 * @param {Object} lastBlock - Last block
 * @returns {Object} block - Target block
 */
const setHeight = (block, lastBlock) => {
	block.height = lastBlock.height + 1;
	return block;
};

/**
 * Get mem table status for state check
 *
 * @private
 * @func setHeight
 * @param {Object} storage - storage class
 * @param {Object} tx - database transaction
 * @returns {Object} blockcount, genesisBlock, memRounds
 */
const loadMemTables = async (storage, tx) => {
	const promises = [
		storage.entities.Block.count({}, {}, tx),
		storage.entities.Block.getOne({ height: 1 }, {}, tx),
	];

	const [blocksCount, genesisBlock] = await tx.batch(promises);

	return {
		blocksCount,
		genesisBlock,
	};
};

/**
 * Sorts transactions for later including in the block.
 *
 * @param {Array} transactions Unsorted collection of transactions
 * @returns {Array} transactions Sorted collection of transactions
 * @static
 */

module.exports = {
	getId,
	getIdSequence,
	loadBlocksFromLastBlockId,
	loadMemTables,
	calculateNewBroadhash,
	setHeight,
	addBlockProperties,
	deleteBlockProperties,
};
