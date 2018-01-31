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
 * OutTransfer Transactions database interaction module
 * @memberof module:dapps
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {OutTransferTransactionsRepo}
 */
function OutTransferTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'outtransfer';

	this.dbFields = ['dappId', 'outTransactionId', 'transactionId'];

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
 * Save OutTransfer transactions
 * @param {Array.<{id: string, asset: {outTransfer: {dappId: string, transactionId: string}}}>} transactions
 * @return {Promise}
 */
OutTransferTransactionsRepo.prototype.save = function(transactions) {
	if (!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(transaction => ({
		dappId: transaction.asset.outTransfer.dappId,
		outTransactionId: transaction.asset.outTransfer.transactionId,
		transactionId: transaction.id,
	}));

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};

module.exports = OutTransferTransactionsRepo;
