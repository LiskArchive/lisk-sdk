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

var PQ = require('pg-promise').ParameterizedQuery;
var columnSet;

/**
 * Blocks database interaction module
 * @memberof module:blocks
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {BlocksRepo}
 */
function BlocksRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'blocks';

	this.sortFields = [
		'id',
		'timestamp',
		'height',
		'previousBlock',
		'totalAmount',
		'totalFee',
		'reward',
		'numberOfTransactions',
		'generatorPublicKey'
	];

	this.dbFields = [
		'id',
		'version',
		'timestamp',
		'height',
		'previousBlock',
		'numberOfTransactions',
		'totalAmount',
		'totalFee',
		'reward',
		'payloadLength',
		'payloadHash',
		'generatorPublicKey',
		'blockSignature'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {table: table});
	}

	this.cs = columnSet;
}

var Queries = {
	count: new PQ('SELECT COUNT("rowId")::int FROM blocks'),

	getGenesisBlockId: new PQ('SELECT "id" FROM blocks WHERE "id" = $1'),

	getGenesisBlock: 'SELECT "id", "payloadHash", "blockSignature" FROM blocks WHERE "height" = 1',

	deleteBlock: new PQ('DELETE FROM blocks WHERE "id" = $1'),

	aggregateBlocksReward: new PQ([
		'WITH',
		'delegate AS (SELECT',
		'1 FROM mem_accounts m WHERE m."isDelegate" = 1 AND m."publicKey" = DECODE($1, \'hex\') LIMIT 1),',
		'rewards AS (SELECT COUNT(1) AS count, SUM(reward) AS rewards FROM blocks WHERE "generatorPublicKey" = DECODE($1, \'hex\')',
		'AND ($2 IS NULL OR timestamp >= $2)',
		'AND ($3 IS NULL OR timestamp <= $3)',
		'),',
		'fees AS (SELECT SUM(fees) AS fees FROM rounds_fees WHERE "publicKey" = DECODE($1, \'hex\')',
		'AND ($2 IS NULL OR timestamp >= $2)',
		'AND ($3 IS NULL OR timestamp <= $3)',
		')',
		'SELECT',
		'(SELECT * FROM delegate) AS delegate,',
		'(SELECT count FROM rewards) AS count,',
		'(SELECT fees FROM fees) AS fees,',
		'(SELECT rewards FROM rewards) AS rewards'
	].filter(Boolean).join(' ')),

	list: function (params) {
		return [
			'SELECT * FROM blocks_list',
			( (params.where && params.where.length) ? 'WHERE ' + params.where.join(' AND ') : ''),
			(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getIdSequence: [
		'WITH',
		'current_round AS (SELECT CEIL(b.height / ${delegates}::float)::bigint FROM blocks b WHERE b.height <= ${height} ORDER BY b.height DESC LIMIT 1),',
		'rounds AS (SELECT * FROM generate_series((SELECT * FROM current_round), (SELECT * FROM current_round) - ${limit} + 1, -1))',
		'SELECT',
		'b.id, b.height, CEIL(b.height / ${delegates}::float)::bigint AS round',
		'FROM blocks b',
		'WHERE b.height IN (SELECT ((n - 1) * ${delegates}) + 1 FROM rounds AS s(n)) ORDER BY height DESC'
	].filter(Boolean).join(' '),

	getCommonBlock: function (params) {
		return [
			'SELECT COUNT("id")::int FROM blocks WHERE "id" = ${id}',
			(params.previousBlock ? 'AND "previousBlock" = ${previousBlock}' : ''),
			'AND "height" = ${height}'
		].filter(Boolean).join(' ');
	},

	getBlocksForTransport: 'SELECT MAX("height") AS "height", "id", "previousBlock", "timestamp" FROM blocks WHERE "id" IN ($1:csv) GROUP BY "id" ORDER BY "height" DESC',

	getHeightByLastId: new PQ('SELECT "height" FROM blocks WHERE "id" = $1'),

	loadBlocksData: function (params) {
		var limitPart;

		if (!params.id && !params.lastId) {
			limitPart = 'WHERE "b_height" < ${limit}';
		}

		return [
			'SELECT * FROM full_blocks_list',
			limitPart,
			(params.id || params.lastId ? 'WHERE' : ''),
			(params.id ? '"b_id" = ${id}' : ''),
			(params.id && params.lastId ? ' AND ' : ''),
			(params.lastId ? '"b_height" > ${height} AND "b_height" < ${limit}' : ''),
			'ORDER BY "b_height", "t_rowId"'
		].filter(Boolean).join(' ');
	},

	loadBlocksOffset: new PQ('SELECT * FROM full_blocks_list WHERE "b_height" >= $1 AND "b_height" < $2 ORDER BY "b_height", "t_rowId"'),

	loadLastBlock: 'SELECT * FROM full_blocks_list WHERE "b_height" = (SELECT MAX("height") FROM blocks) ORDER BY "b_height", "t_rowId"',

	blockExists: new PQ('SELECT "id" FROM blocks WHERE "id" = $1'),

	deleteAfterBlock: new PQ('DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "id" = $1)')
};

//TODO: Merge both methods in one BlocksRepo#getGenesisBlock and BlocksRepo#getGenesisBlockId
/**
 * Get the genesis block
 * @return {Promise}
 */
BlocksRepo.prototype.getGenesisBlock = function () {
	return this.db.query(Queries.getGenesisBlock);
};

/**
 * Get genesis block by id
 * @param {string} id
 * @return {Promise}
 */
BlocksRepo.prototype.getGenesisBlockId = function (id) {
	return this.db.query(Queries.getGenesisBlockId, [id]);
};

/**
 * Delete a block from database
 * @param {string} id
 * @return {Promise}
 */
BlocksRepo.prototype.deleteBlock = function (id) {
	return this.db.none(Queries.deleteBlock, [id]);
};

/**
 * Aggregate rewards for a block
 * @param {Object} params
 * @param {string} params.generatorPublicKey
 * @param {int} params.start - Start time of aggregation period
 * @param {int} params.end - End time for aggregation period
 * @return {Promise}
 */
BlocksRepo.prototype.aggregateBlocksReward = function (params) {
	return this.db.query(Queries.aggregateBlocksReward, [params.generatorPublicKey, params.start, params.end]);
};

/**
 * Count blocks
 * @return {Promise}
 */
BlocksRepo.prototype.count = function () {
	return this.db.one(Queries.count);
};

/**
 * Search blocks in database
 * @param {Object} params
 * @param {array} params.where
 * @param {string} params.sortField
 * @param {string} params.sortMethod
 * @param {int} params.limit
 * @param {int} params.offset
 * @return {Promise}
 */
BlocksRepo.prototype.list = function (params) {
	return this.db.query(Queries.list(params), params);
};

/**
 * Get sequence of blocks ids for delegates
 * @param {Object} params
 * @param {int} params.delegates - Number of delegates
 * @param {int} params.height
 * @param {int} params.limit
 * @return {Promise}
 */
BlocksRepo.prototype.getIdSequence = function (params) {
	return this.db.query(Queries.getIdSequence, params);
};

/**
 * Get common block among peers
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.previousBlock
 * @param {int} params.height
 * @return {Promise}
 */
BlocksRepo.prototype.getCommonBlock = function (params) {
	return this.db.query(Queries.getCommonBlock(params), params);
};

//TODO: Merge this method with BlocksRepo#list
/**
 * Get height of the block with id
 * @param {string} lastId - Id of the block to search
 * @return {Promise}
 */
BlocksRepo.prototype.getHeightByLastId = function (lastId) {
	return this.db.query(Queries.getHeightByLastId, [lastId]);
};

/**
 * Load block along with all transactions
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.lastId
 * @param {int} params.height
 * @param {int} params.limit
 * @return {Promise}
 */
BlocksRepo.prototype.loadBlocksData = function (params) {
	return this.db.query(Queries.loadBlocksData(params), params);
};

/**
 * Load blocks among transactions for a range of a height
 * @param {int} offset
 * @param {int} limit
 * @return {Promise}
 */
BlocksRepo.prototype.loadBlocksOffset = function (offset, limit) {
	return this.db.query(Queries.loadBlocksOffset, [offset, limit]);
};

/**
 * Load the last block along with all transactions
 * @return {Promise}
 */
BlocksRepo.prototype.loadLastBlock = function () {
	return this.db.query(Queries.loadLastBlock);
};

/**
 * Check if a block exits with a particular ID
 * @param {string} id
 * @return {Promise}
 * @throws {QueryResultError} - Multiple rows were not expected - in case found multiple blocks with same id
 */
BlocksRepo.prototype.blockExists = function (id) {
	return this.db.oneOrNone(Queries.blockExists, [id]);
};

/**
 * Delete all blocks after a particular height
 * @param {string} id
 * @return {Promise}
 */
BlocksRepo.prototype.deleteAfterBlock = function (id) {
	return this.db.none(Queries.deleteAfterBlock, [id]);
};

/**
 * Get multiple blocks to be transported to peers
 * @param {string} ids - Comma separated string of ids
 * @return {Promise}
 */
BlocksRepo.prototype.getBlocksForTransport = function (ids) {
	return this.db.query(Queries.getBlocksForTransport, [ids]);
};

/**
 * Insert a block to database
 * @param {Object} block - Attributes to be inserted can be any of [BlocksRepo's dbFields property]{@link BlocksRepo#dbFields}
 * @return {Promise}
 */
 BlocksRepo.prototype.save = function (block) {
 	try {
 		var saveBlock = Object.assign({}, block);
 		saveBlock.payloadHash = Buffer.from(block.payloadHash, 'hex');
 		saveBlock.generatorPublicKey = Buffer.from(block.generatorPublicKey, 'hex');
 		saveBlock.blockSignature = Buffer.from(block.blockSignature, 'hex');
 		saveBlock.reward = block.reward || 0;
 	} catch (e) {
 		throw e;
 	}

 	return this.db.none(this.pgp.helpers.insert(saveBlock, this.cs.insert));
 };

module.exports = BlocksRepo;
