'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function BlocksRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

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
}

var Queries = {

	count: new PQ('SELECT COUNT("rowId")::int FROM blocks'),

	getGenesisBlockId: new PQ('SELECT "id" FROM blocks WHERE "id" = $1;'),

	getGenesisBlock: new PQ('SELECT "id", "payloadHash", "blockSignature" FROM blocks WHERE "height" = 1'),

	deleteBlock: new PQ('DELETE FROM blocks WHERE "id" = $1;'),

	aggregateBlocksReward: new PQ([
		'WITH',
		'delegate AS (SELECT',
		'1 FROM mem_accounts m WHERE m."isDelegate" = 1 AND m."publicKey" = DECODE($1, \'hex\') LIMIT 1),',
		'rewards AS (SELECT COUNT(1) AS count, SUM(reward) AS rewards, SUM(fees) AS fees FROM rounds_rewards WHERE pk = DECODE($1, \'hex\')',
		'AND ($2 IS NULL OR timestamp >= $2)',
		'AND ($3 IS NULL OR timestamp <= $3)',
		')',
		'SELECT (SELECT * FROM delegate) AS delegate, * FROM rewards'
	].filter(Boolean).join(' ')),

	list: function (params) {
		return [
			'SELECT * FROM blocks_list',
			( (params.where && params.where.length) ? 'WHERE ' + params.where.join(' AND ') : ''),
			(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getIdSequence: new PQ([
		'WITH',
		'current_round AS (SELECT CEIL(b.height / ${delegates}::float)::bigint FROM blocks b WHERE b.height <= ${height} ORDER BY b.height DESC LIMIT 1),',
		'rounds AS (SELECT * FROM generate_series((SELECT * FROM current_round), (SELECT * FROM current_round) - ${limit} + 1, -1))',
		'SELECT',
		'b.id, b.height, CEIL(b.height / ${delegates}::float)::bigint AS round',
		'FROM blocks b',
		'WHERE b.height IN (SELECT ((n - 1) * ${delegates}) + 1 FROM rounds AS s(n)) ORDER BY height DESC'
	].filter(Boolean).join(' ')),

	getCommonBlock: function (params) {
		return new PQ([
			'SELECT COUNT("id")::int FROM blocks WHERE "id" = ${id}',
			(params.previousBlock ? 'AND "previousBlock" = ${previousBlock}' : ''),
			'AND "height" = ${height}'
		].filter(Boolean).join(' '));
	},
	
	getBlocksForTransport: new PQ('SELECT MAX("height") AS "height", "id", "previousBlock", "timestamp" FROM blocks WHERE "id" IN ($1:csv) GROUP BY "id" ORDER BY "height" DESC'),

	getHeightByLastId: new PQ('SELECT "height" FROM blocks WHERE "id" = $1'),

	loadBlocksData: function (params) {
		var limitPart;

		if (!params.id && !params.lastId) {
			limitPart = 'WHERE "b_height" < ${limit}';
		}

		return new PQ([
			'SELECT * FROM full_blocks_list',
			limitPart,
			(params.id || params.lastId ? 'WHERE' : ''),
			(params.id ? '"b_id" = ${id}' : ''),
			(params.id && params.lastId ? ' AND ' : ''),
			(params.lastId ? '"b_height" > ${height} AND "b_height" < ${limit}' : ''),
			'ORDER BY "b_height", "t_rowId"'
		].filter(Boolean).join(' '));
	},

	loadBlocksOffset: new PQ('SELECT * FROM full_blocks_list WHERE "b_height" >= $1 AND "b_height" < $2 ORDER BY "b_height", "t_rowId"'),

	loadLastBlock: 'SELECT * FROM full_blocks_list WHERE "b_height" = (SELECT MAX("height") FROM blocks) ORDER BY "b_height", "t_rowId"',

	blockExists: new PQ('SELECT "id" FROM blocks WHERE "id" = $1'),

	deleteAfterBlock: new PQ('DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "id" = $1);')
};

BlocksRepo.prototype.getGenesisBlock = function (task) {
	return (task || this.db).query(Queries.getGenesisBlock);
};

BlocksRepo.prototype.getGenesisBlockId = function (id) {
	return this.db.query(Queries.getGenesisBlockId, [id]);
};

BlocksRepo.prototype.deleteBlock = function (id) {
	return this.db.none(Queries.deleteBlock[id]);
};

BlocksRepo.prototype.aggregateBlocksReward = function (params) {
	return this.db.query(Queries.aggregateBlocksReward, [params.generatorPublicKey, params.start, params.end]);
};

BlocksRepo.prototype.count = function (task) {
	return (task || this.db).one(Queries.count);
};

BlocksRepo.prototype.list = function (params) {
	return this.db.query(Queries.list(params), params);
};

BlocksRepo.prototype.getIdSequence = function (params) {
	return this.db.query(Queries.getIdSequence, params);
};

BlocksRepo.prototype.getCommonBlock = function (params) {
	return this.db.query(Queries.getCommonBlock(params), params);
};

BlocksRepo.prototype.getHeightByLastId = function (lastId) {
	return this.db.query(Queries.getHeightByLastId, [lastId]);
};

BlocksRepo.prototype.loadBlocksData = function (params) {
	return this.db.query(Queries.loadBlocksData(params), params);
};

BlocksRepo.prototype.loadBlocksOffset = function (offset, limit) {
	return this.db.query(Queries.loadBlocksOffset, [offset, limit]);
};

BlocksRepo.prototype.loadLastBlock = function () {
	return this.db.query(Queries.loadLastBlock);
};

BlocksRepo.prototype.blockExists = function (id) {
	return this.db.one(Queries.blockExists, [id]).then(function (row) {
		return row;
	}).catch(function (reason) { return false; });
};

BlocksRepo.prototype.deleteAfterBlock = function (id) {
	return this.db.none(Queries.deleteAfterBlock, [id]);
};

BlocksRepo.prototype.getBlocksForTransport = function (ids) {
	return this.db.query(Queries.getBlocksForTransport, [ids]);
};

module.exports = BlocksRepo;
