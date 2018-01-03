'use strict';

var _ = require('lodash');
var columnSet;

function DappsTransactionsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'dapps';

	this.dbFields = [
		'type',
		'name',
		'description',
		'tags',
		'link',
		'category',
		'icon',
		'transactionId'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

DappsTransactionsRepo.prototype.save = function (transactions) {
	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions = transactions.map(function (transaction) {
		return {
			type: transaction.asset.dapp.type,
			name: transaction.asset.dapp.name,
			description: transaction.asset.dapp.description || null,
			tags: transaction.asset.dapp.tags || null,
			link: transaction.asset.dapp.link || null,
			icon: transaction.asset.dapp.icon || null,
			category: transaction.asset.dapp.category,
			transactionId: transaction.id
		};
	});

	return this.db.none(this.pgp.helpers.insert(transactions, this.cs.insert));
};


module.exports = DappsTransactionsRepo;
