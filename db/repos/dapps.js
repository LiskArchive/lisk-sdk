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
 * Dapps database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires db/sql
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} - An instance of a DappsRepository
 */
class DappsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

		// TODO: A proper repository shouldn't need to export any properties like this:
		this.sortFields = ['name'];
	}

	/**
	 * Counts dapps by transaction id.
	 *
	 * @param {string} id - Description of the param
	 * @returns {Promise<number>}
	 * @todo Add descriptions for the params and the return value
	 */
	countByTransactionId(id) {
		return this.db.one(sql.countByTransactionId, id, a => +a.count);
	}

	/**
	 * Counts dapps by out transfer transaction id.
	 *
	 * @param {string} id - Description of the param
	 * @returns {Promise<number>}
	 * @todo Add descriptions for the params and the return value
	 */
	countByOutTransactionId(id) {
		return this.db.one(sql.countByOutTransactionId, id, a => +a.count);
	}

	/**
	 * Checks if a dapp exists.
	 *
	 * @param {Object} params - Description of the param
	 * @param {string} params.transactionId - Description of the param
	 * @param {string} params.name - Description of the param
	 * @param {string} params.link - Description of the param
	 * @returns {Promise}
	 * @todo Add descriptions for the params and the return value
	 */
	getExisting(params) {
		// TODO: Should use a result-specific method, not .query
		return this.db.query(sql.getExisting, params);
	}

	/**
	 * Searches existing dapps in database.
	 *
	 * @param {Object} params - Description of the param
	 * @param {Array} params.where - Description of the param
	 * @param {string} params.sortField - Description of the param
	 * @param {string} params.sortMethod - Description of the param
	 * @param {int} params.limit - Description of the param
	 * @param {int} params.offset - Description of the param
	 * @returns {Promise}
	 * @todo Add descriptions for the params and the return value
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
	 * Gets Genesis block.
	 *
	 * @param {string} id - Description of the param
	 * @returns {Promise}
	 * @todo Add descriptions for the param and the return value
	 */
	getGenesis(id) {
		// TODO: Should use a result-specific method, not .query
		return this.db.query(sql.getGenesis, [id]);
	}
}

module.exports = DappsRepository;
