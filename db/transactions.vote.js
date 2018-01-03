'use strict';

var columnSet;

function VoteTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'votes';

	this.dbFields = [
		'votes',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

VoteTransactionsRepo.prototype.save = function (transaction) {
	return this.db.none(this.pgp.helpers.insert({
		votes: Array.isArray(transaction.asset.votes) ? transaction.asset.votes.join(',') : null,
		transactionId: transaction.id
	}, this.cs.insert));
};


module.exports = VoteTransactionsRepo;
