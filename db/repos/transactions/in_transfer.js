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

const cs = {}; // Static namespace for reusable ColumnSet objects

/**
 * InTransfer transactions database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires lodash
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a InTransferTransactionsRepository
 */
class InTransferTransactionsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.cs = cs;
		this.dbTable = 'intransfer';

		this.dbFields = ['dappId', 'transactionId'];

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(this.dbFields, {
				table: this.dbTable,
			});
		}
	}

	/**
	 * Saves inTransfer transactions.
	 *
	 * @param {Array} transactions
	 * @returns {Promise<null>}
	 * Success/failure of the operation.
	 */
	save(transactions) {
		const query = () => {
			if (!_.isArray(transactions)) {
				transactions = [transactions];
			}

			transactions = transactions.map(transaction => ({
				dappId: transaction.asset.inTransfer.dappId,
				transactionId: transaction.id,
			}));

			return this.pgp.helpers.insert(transactions, this.cs.insert);
		};

		return this.db.none(query);
	}
}

module.exports = InTransferTransactionsRepository;
