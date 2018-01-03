'use strict';

var columnSet;

function OutTransferTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'outtransfer';

	this.dbFields = [
		'dappId',
		'outTransactionId',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

OutTransferTransactionsRepo.prototype.save = function (transaction) {
	return this.db.none(this.pgp.helpers.insert({
		dappId: transaction.asset.outTransfer.dappId,
		outTransactionId: transaction.asset.outTransfer.transactionId,
		transactionId: transaction.id
	}, this.cs.insert));
};


module.exports = OutTransferTransactionsRepo;
