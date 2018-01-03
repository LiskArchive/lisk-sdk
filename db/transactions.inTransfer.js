'use strict';

var _ = require('lodash');
var transactionTypes = require('../helpers/transactionTypes')
var columnSet;

function InTransferTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'intransfer';

	this.dbFields = [
		'dappId',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

InTransferTransactionsRepo.prototype.save = function (transactions) {
	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(function (transaction) {
		return {
			dappId: transaction.asset.inTransfer.dappId,
			transactionId: transaction.id
		};
	});

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};


module.exports = InTransferTransactionsRepo;
