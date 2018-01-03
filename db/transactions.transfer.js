'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var columnSet;

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

TransferTransactionsRepo.prototype.save = function (transactions) {

	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(function (transaction) {
		if (transaction.asset && transaction.asset.data) {
			try {
				return {
					transactionId: transaction.id,
					data: Buffer.from(transaction.asset.data, 'utf8')
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
