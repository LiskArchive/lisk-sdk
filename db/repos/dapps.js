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

/**
 * Dapps database interaction module
 * @memberof module:dapps
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DappsRepo}
 */
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

	getGenesis: new PQ('SELECT b."height" AS "height", b."id" AS "id", t."senderId" AS "authorId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" WHERE t."id" = $1')
};

/**
 * Count dapps by transaction id
 * @param {string} id
 * @return {Promise}
 */
DappsRepo.prototype.countByTransactionId = function (id) {
	return this.db.one(DappsSql.countByTransactionId, [id]);
};

/**
 * Count dapps by out transfer transaction id
 * @param {string} id
 * @return {Promise}
 */
DappsRepo.prototype.countByOutTransactionId = function (id) {
	return this.db.one(DappsSql.countByOutTransactionId, [id]);
};

/**
 * Check if a dapp exists
 * @param {Object} params
 * @param {string} params.transactionId
 * @param {string} params.name
 * @param {string} params.link
 * @return {Promise}
 */
DappsRepo.prototype.getExisting = function (params) {
	return this.db.query(DappsSql.getExisting, [params.name, params.link, params.transactionId]);
};

/**
 * Search existing dapps in database
 * @param {Object} params
 * @param {Array} params.where
 * @param {string} params.sortField
 * @param {string} params.sortMethod
 * @param {int} params.limit
 * @param {int} params.offset
 * @return {Promise}
 */
DappsRepo.prototype.list = function (params) {
	return this.db.query(DappsSql.list(params), params);
};

// TODO: Remove DappsRepo#getGenesis and use relevant function from db/blocks
/**
 * Get Genesis block
 * @param {string} id
 * @return {Promise}
 */
DappsRepo.prototype.getGenesis = function (id) {
	return this.db.query(DappsSql.getGenesis, [id]);
};

module.exports = DappsRepo;
