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

	return storage.entities.Block.get(filter, {
		extended: true,
		limit,
		sort: ['height'],
	});
};

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

const setHeight = (block, lastBlock) => {
	block.height = lastBlock.height + 1;
	return block;
};

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

module.exports = {
	getId,
	getIdSequence,
	loadBlocksFromLastBlockId,
	loadMemTables,
	setHeight,
	addBlockProperties,
	deleteBlockProperties,
};
