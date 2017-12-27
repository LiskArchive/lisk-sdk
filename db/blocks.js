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

BlocksRepo.prototype.getGenesisBlockId = function (id) {
	return this.db.query(new PQ('SELECT "id" FROM blocks WHERE "id" = $1;', [id]));
};

BlocksRepo.prototype.deleteBlock = function (id) {
	return this.db.none(new PQ('DELETE FROM blocks WHERE "id" = $1;', [id]));
};

BlocksRepo.prototype.aggregateBlocksReward = function (params) {
	return this.db.query(new PQ([
		'WITH',
		'delegate AS (SELECT',
		'1 FROM mem_accounts m WHERE m."isDelegate" = 1 AND m."publicKey" = DECODE(${generatorPublicKey}, \'hex\') LIMIT 1),',
		'rewards AS (SELECT COUNT(1) AS count, SUM(reward) AS rewards, SUM(fees) AS fees FROM rounds_rewards WHERE pk = DECODE(${generatorPublicKey}, \'hex\')',
		(params.start !== undefined ? ' AND timestamp >= ${start}' : ''),
		(params.end !== undefined ? ' AND timestamp <= ${end}' : ''),
		')',
		'SELECT (SELECT * FROM delegate) AS delegate, * FROM rewards'
	].filter(Boolean).join(' '), params));
};

BlocksRepo.prototype.list = function (params) {
	return this.db.query(new PQ([
		'SELECT * FROM blocks_list',
		(params.where.length ? 'WHERE ' + params.where.join(' AND ') : ''),
		(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
		'LIMIT ${limit} OFFSET ${offset}'
	].filter(Boolean).join(' '), params));
};

BlocksRepo.prototype.getIdSequence = function (params) {
	return this.db.query(new PQ([
		'WITH',
		'current_round AS (SELECT CEIL(b.height / ${delegates}::float)::bigint FROM blocks b WHERE b.height <= ${height} ORDER BY b.height DESC LIMIT 1),',
		'rounds AS (SELECT * FROM generate_series((SELECT * FROM current_round), (SELECT * FROM current_round) - ${limit} + 1, -1))',
		'SELECT',
		'b.id, b.height, CEIL(b.height / ${delegates}::float)::bigint AS round',
		'FROM blocks b',
		'WHERE b.height IN (SELECT ((n - 1) * ${delegates}) + 1 FROM rounds AS s(n)) ORDER BY height DESC'
	].filter(Boolean).join(' '), params));
};

BlocksRepo.prototype.getCommonBlock = function (params) {
	return this.db.query(new PQ([
		'SELECT COUNT("id")::int FROM blocks WHERE "id" = ${id}',
		(params.previousBlock ? 'AND "previousBlock" = ${previousBlock}' : ''),
		'AND "height" = ${height}'
	].filter(Boolean).join(' '), params));
};

BlocksRepo.prototype.countByRowId = function () {
	return this.db.one('SELECT COUNT("rowId")::int FROM blocks');
};


BlocksRepo.prototype.getHeightByLastId = function (lastId) {
	return this.db.query(new PQ('SELECT "height" FROM blocks WHERE "id" = $1', [lastId]));
};

BlocksRepo.prototype.loadBlocksData = function (params) {
	var limitPart;

	if (!params.id && !params.lastId) {
		limitPart = 'WHERE "b_height" < ${limit}';
	}

	return this.db.query(new PQ([
		'SELECT * FROM full_blocks_list',
		limitPart,
		(params.id || params.lastId ? 'WHERE' : ''),
		(params.id ? '"b_id" = ${id}' : ''),
		(params.id && params.lastId ? ' AND ' : ''),
		(params.lastId ? '"b_height" > ${height} AND "b_height" < ${limit}' : ''),
		'ORDER BY "b_height", "t_rowId"'
	].filter(Boolean).join(' '), params));
};

BlocksRepo.prototype.loadBlocksOffset = function (offset, limit) {
	return this.db.query(new PQ('SELECT * FROM full_blocks_list WHERE "b_height" >= $1 AND "b_height" < $2 ORDER BY "b_height", "t_rowId"',
		[offset, limit]));
};

BlocksRepo.prototype.loadLastBlock = function () {
	return this.db.query('SELECT * FROM full_blocks_list WHERE "b_height" = (SELECT MAX("height") FROM blocks) ORDER BY "b_height", "t_rowId"');
};

BlocksRepo.prototype.blockExists = function (id) {
	return this.db.one(new PQ('SELECT "id" FROM blocks WHERE "id" = $1', [id])).then(function (row) {
		return row;
	}).catch(function (reason) { return false; });
};

BlocksRepo.prototype.deleteAfterBlock = function (id) {
	return this.db.none(new PQ('DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "id" = $1);', [id]));
};

module.exports = BlocksRepo;
