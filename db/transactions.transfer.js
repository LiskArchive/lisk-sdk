'use strict';

var columnSet;
var Promise = require('bluebird');

function TransferTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'transfer';

	this.dbFields = [
		'data',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

TransferTransactionsRepo.prototype.save = function (transaction) {
	if (transaction.asset && transaction.asset.data) {
		var data;

		try {
			data = Buffer.from(transaction.asset.data, 'utf8');
		} catch (ex) {
			throw ex;
		}

		return this.db.none(this.pgp.helpers.insert({
			transactionId: transaction.id,
			data: data
		}, this.cs.insert));
	}

	return Promise.resolve();
};


module.exports = TransferTransactionsRepo;
