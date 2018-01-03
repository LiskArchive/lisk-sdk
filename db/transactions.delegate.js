'use strict';

var columnSet;

function DelegateTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'delegates';

	this.dbFields = [
		'tx_id',
		'name',
		'pk',
		'address'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

DelegateTransactionsRepo.prototype.save = function (transaction) {
	return this.db.none(this.pgp.helpers.insert({
		tx_id: transaction.id,
		name: transaction.asset.delegate.username,
		pk: Buffer.from(transaction.senderPublicKey, 'hex'),
		address: transaction.senderId
	}, this.cs.insert));
};


module.exports = DelegateTransactionsRepo;
