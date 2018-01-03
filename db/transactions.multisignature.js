'use strict';

var _ = require('lodash');
var transactionTypes = require('../helpers/transactionTypes');
var columnSet;

function MultiSigTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'multisignatures';

	this.dbFields = [
		'min',
		'lifetime',
		'keysgroup',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

MultiSigTransactionsRepo.prototype.save = function (transactions) {

	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(function (transaction) {
		return {
			min: transaction.asset.multisignature.min,
			lifetime: transaction.asset.multisignature.lifetime,
			keysgroup: transaction.asset.multisignature.keysgroup.join(','),
			transactionId: transaction.id
		};
	});
	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};


module.exports = MultiSigTransactionsRepo;
