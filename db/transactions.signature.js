'use strict';

var _ = require('lodash');
var columnSet;

function SignatureTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'signatures';

	this.dbFields = [
		'transactionId',
		'publicKey'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

SignatureTransactionsRepo.prototype.save = function (transactions) {
	if (!_.isArray(transactions)) {
		transactions = [transactions];
	}

	try {
		transactions = transactions.map(function (transaction) {
			return {
				transactionId: transaction.id,
				publicKey: Buffer.from(transaction.asset.signature.publicKey, 'hex')
			};
		});
	} catch (e) {
		throw e;
	}

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};

module.exports = SignatureTransactionsRepo;
