'use strict';

var _ = require('lodash');
var transactionTypes = require('../helpers/transactionTypes')
var columnSet;

function DelegateTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'delegates';

	this.dbFields = [
		'transactionId',
		'username'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

DelegateTransactionsRepo.prototype.save = function (transactions) {
	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(function (transaction) {
		return {
			transactionId: transaction.id,
			username: transaction.asset.delegate.username
		};
	});

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};


module.exports = DelegateTransactionsRepo;
