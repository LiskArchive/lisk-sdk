'use strict';

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

InTransferTransactionsRepo.prototype.save = function (transaction) {
	return this.db.none(this.pgp.helpers.insert({
		dappId: transaction.asset.inTransfer.dappId,
		transactionId: transaction.id
	}, this.cs.insert));
};


module.exports = InTransferTransactionsRepo;
