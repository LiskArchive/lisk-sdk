'use strict';

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

MultiSigTransactionsRepo.prototype.save = function (transaction) {
	return this.db.none(this.pgp.helpers.insert({
		min: transaction.asset.multisignature.min,
		lifetime: transaction.asset.multisignature.lifetime,
		keysgroup: transaction.asset.multisignature.keysgroup.join(','),
		transactionId: transaction.id
	}, this.cs.insert));
};


module.exports = MultiSigTransactionsRepo;
