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

const sql = require('../sql').dapps;

/**
 * Dapps database interaction module
 * @memberof module:dapps
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DappsRepository}
 */
class DappsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

		// TODO: A proper repository shouldn't need to export any properties like this:
		this.sortFields = ['name'];
	}

	/**
	 * Counts dapps by transaction id
	 * @param {string} id
	 * @return {Promise<number>}
	 */
	countByTransactionId(id) {
		return this.db.one(sql.countByTransactionId, id, a => +a.count);
	}

	/**
	 * Counts dapps by out transfer transaction id
	 * @param {string} id
	 * @return {Promise<number>}
	 */
	countByOutTransactionId(id) {
		return this.db.one(sql.countByOutTransactionId, id, a => +a.count);
	}

	/**
	 * Checks if a dapp exists
	 * @param {Object} params
	 * @param {string} params.transactionId
	 * @param {string} params.name
	 * @param {string} params.link
	 * @return {Promise}
	 */
	getExisting(params) {
		// TODO: Should use a result-specific method, not .query
		return this.db.query(sql.getExisting, params);
	}

	/**
	 * Searches existing dapps in database
	 * @param {Object} params
	 * @param {Array} params.where
	 * @param {string} params.sortField
	 * @param {string} params.sortMethod
	 * @param {int} params.limit
	 * @param {int} params.offset
	 * @return {Promise}
	 */
	list(params) {
		// TODO: Use cases need to be reviewed, and new methods added before it can be made into a proper external SQL
		const query = [
			'SELECT "name" COLLATE "C", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps',
			params.where && params.where.length
				? `WHERE ${params.where.join(' OR ')}`
				: '',
			params.sortField
				? `ORDER BY ${[params.sortField, params.sortMethod].join(' ')}`
				: '',
			'LIMIT ${limit} OFFSET ${offset}',
		]
			.filter(Boolean)
			.join(' ');

		// TODO: Should use a result-specific method, not .query
		return this.db.query(query, params);
	}

	// TODO: Remove DappsRepository#getGenesis and use relevant function from db/blocks
	/**
	 * Gets Genesis block
	 * @param {string} id
	 * @return {Promise}
	 */
	getGenesis(id) {
		// TODO: Should use a result-specific method, not .query
		return this.db.query(sql.getGenesis, [id]);
	}
}

module.exports = DappsRepository;
