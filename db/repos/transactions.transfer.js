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
 * Transfer Transactions database interaction module
 * @memberof module:transactions
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {TransferTransactionsRepo}
 */
function TransferTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'transfer';

	this.dbFields = ['data', 'transactionId'];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({
			table: this.dbTable,
			schema: 'public',
		});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {
			table: table,
		});
	}

	this.cs = columnSet;
}

/**
 * Save transfer transactions
 * @param {Array.<{id: string, asset: {data: string}}>} transactions
 * @return {Promise}
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

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};

module.exports = TransferTransactionsRepo;
