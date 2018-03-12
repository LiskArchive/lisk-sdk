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

var _ = require('lodash');
var Promise = require('bluebird');

var columnSet;

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
 * @returns {Object} An instance of a TransferTransactionsRepo
 */
function TransferTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'transfer';

	this.dbFields = ['data', 'transactionId'];

	if (!columnSet) {
		columnSet = {};
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {
			table: this.dbTable,
		});
	}

	this.cs = columnSet;
}

/**
 * Save transfer transactions.
 *
 * @param {Array} transactions
 * @returns {Promise}
 * @todo Add description for the params and the return value
 */
TransferTransactionsRepo.prototype.save = function(transactions) {
	if (!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(transaction => {
		if (transaction.asset && transaction.asset.data) {
			try {
				return {
					transactionId: transaction.id,
					data: Buffer.from(transaction.asset.data, 'utf8'),
				};
			} catch (ex) {
				throw ex;
			}
		}
		return null;
	});

	transactions = _.compact(transactions);

	if (_.isEmpty(transactions)) {
		return Promise.resolve();
	}

	const query = () => this.pgp.helpers.insert(transactions, this.cs.insert);

	return this.db.none(query);
};

module.exports = TransferTransactionsRepo;
