'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function DappsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.sortFields = ['name'];
}

var DappsSql = {
	countByTransactionId: new PQ('SELECT COUNT(*)::int AS "count" FROM dapps WHERE "transactionId" = $1'),

	countByOutTransactionId: new PQ('SELECT COUNT(*)::int AS "count" FROM outtransfer WHERE "outTransactionId" = $1'),

	getExisting: new PQ('SELECT "name", "link" FROM dapps WHERE ("name" = $1 OR "link" = $2) AND "transactionId" != $3'),

	// Need to fix "or" or "and" in query
	list: function (params) {
		return [
			'SELECT "name" COLLATE "C", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps',
			((params.where && params.where.length) ? 'WHERE ' + params.where.join(' OR ') : ''),
			(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getGenesis: new PQ('SELECT b."height" AS "height", b."id" AS "id", t."senderAddress" AS "authorId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" WHERE t."id" = $1')
};

DappsRepo.prototype.countByTransactionId = function (id) {
	return this.db.one(DappsSql.countByTransactionId, [id]);
};

DappsRepo.prototype.countByOutTransactionId = function (id) {
	return this.db.one(DappsSql.countByOutTransactionId, [id]);
};

DappsRepo.prototype.getExisting = function (params) {
	return this.db.query(DappsSql.getExisting, [params.name, params.link, params.transactionId]);
};

DappsRepo.prototype.list = function (params) {
	return this.db.query(DappsSql.list(params), params);
};

DappsRepo.prototype.getGenesis = function (id) {
	return this.db.query(DappsSql.getGenesis, [id]);
};

module.exports = DappsRepo;
