/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var _ = require('lodash');
var columnSet;

/**
 * Dapps Transactions database interaction module
 * @memberof module:dapps
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {DappsTransactionsRepo}
 */
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
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {table: table});
	}

	this.cs = columnSet;
}

/**
 * Save Dapp transactions
 * @param {Array.<{id: string, asset: {dapp: {type: int, name: string, description: string, tags: string, link: string, icon: string, category: string}}}>} transactions
 * @return {Promise}
 */
DappsTransactionsRepo.prototype.save = function (transactions) {
	if (!_.isArray(transactions)) {
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
