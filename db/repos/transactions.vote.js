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
var columnSet;

/**
 * Votes Transactions database interaction module
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {VoteTransactionsRepo}
 */
function VoteTransactionsRepo(db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'votes';

	this.dbFields = ['votes', 'transactionId'];

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
 * Save vote transactions
 * @param {Array.<{id: string, asset:{votes: Array.<string>}}>} transactions
 * @return {Promise}
 */
VoteTransactionsRepo.prototype.save = function(transactions) {
	if (!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(transaction => ({
		votes: Array.isArray(transaction.asset.votes)
			? transaction.asset.votes.join(',')
			: null,
		transactionId: transaction.id,
	}));

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};

module.exports = VoteTransactionsRepo;
