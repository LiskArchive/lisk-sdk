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
require('../../helpers/transaction_types');
var columnSet;

/**
 * Delegates Transactions database interaction module
 * @memberof module:delegates
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DelegateTransactionsRepo}
 */
function DelegateTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'delegates';

	this.dbFields = ['transactionId', 'username'];

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
 * Save Dapp transactions
 * @param {Array.<{id: string, asset: {delegate: {username: string}}}>} transactions
 * @return {Promise}
 */
DelegateTransactionsRepo.prototype.save = function(transactions) {
	if (!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(transaction => ({
		transactionId: transaction.id,
		username: transaction.asset.delegate.username,
	}));

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};

module.exports = DelegateTransactionsRepo;
