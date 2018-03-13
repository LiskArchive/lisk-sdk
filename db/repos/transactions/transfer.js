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

const _ = require('lodash');
const Promise = require('bluebird');

const cs = {}; // Static namespace for reusable ColumnSet objects

/**
 * Transfer transactions database interaction class.
 *
 * @class
 * @memberof db.repos
 * @see Parent: {@link db.repos}
 * @requires bluebird
 * @requires lodash
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a TransferTransactionsRepository
 */
class TransferTransactionsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.cs = cs;
		this.dbTable = 'transfer';

		this.dbFields = ['data', 'transactionId'];

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(this.dbFields, {
				table: this.dbTable,
			});
		}
	}

	/**
	 * Saves transfer transactions.
	 *
	 * @param {Array} transactions
	 * @returns {Promise<null>}
	 * Success/failure of the operation.
	 */
	save(transactions) {
		try {
			if (!_.isArray(transactions)) {
				transactions = [transactions];
			}

			transactions = transactions.map(transaction => {
				if (transaction.asset && transaction.asset.data) {
					return {
						transactionId: transaction.id,
						data: Buffer.from(transaction.asset.data, 'utf8'),
					};
				}
			});

			transactions = _.compact(transactions);
		} catch (e) {
			return Promise.reject(e);
		}

		if (_.isEmpty(transactions)) {
			return Promise.resolve(null);
		}

		const query = () => this.pgp.helpers.insert(transactions, this.cs.insert);

		return this.db.none(query);
	}
}

module.exports = TransferTransactionsRepository;
