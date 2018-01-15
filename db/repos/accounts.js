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

var PQ = require('pg-promise').ParameterizedQuery;
var QF = require('pg-promise').QueryFile;
var path = require('path');
const migrationsSql = require('../sql').migrations;
var columnSet;

/**
 * Accounts database interaction module
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {AccountsRepo}
 */
function AccountsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'mem_accounts';

	this.dbFields = [
		'username',
		'isDelegate',
		'secondSignature',
		'address',
		'publicKey',
		'secondPublicKey',
		'balance',
		'rate',
		'rank'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {table: table});
	}

	this.cs = columnSet;
}

var Queries = {
	countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" ORDER BY "height" DESC LIMIT 1)',

	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1',

	upsert: new PQ('INSERT INTO mem_accounts $1 VALUES $2 ON CONFLICT($3) DO UPDATE SET $4'),

	resetMemTables: new QF(path.join(process.cwd(), './db/sql/init/resetMemoryTables.sql'), {minify: true, params: {schema: 'public'}})
};

/**
 * Count mem accounts
 * @return {Promise}
 */
AccountsRepo.prototype.countMemAccounts = function () {
	return this.db.one(Queries.countMemAccounts);
};

/**
 * Update mem accounts
 * @return {Promise}
 */
AccountsRepo.prototype.updateMemAccounts = function () {
	return this.db.none(Queries.updateMemAccounts);
};

/**
 * Get orphan mem accounts
 * @return {Promise}
 */
AccountsRepo.prototype.getOrphanedMemAccounts = function () {
	return this.db.query(Queries.getOrphanedMemAccounts);
};

/**
 * Get delegates
 * @return {Promise}
 */
AccountsRepo.prototype.getDelegates = function () {
	return this.db.query(Queries.getDelegates);
};

/**
 * Update or insert into mem_accounts
 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#dbFields}
 * @param {Array} conflictingFields - Array of attributes to be tested against conflicts, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#dbFields}
 * @return {Promise}
 */
AccountsRepo.prototype.upsert = function (data, conflictingFields) {
	return this.db.none(
		this.pgp.helpers.concat([
			this.pgp.helpers.insert(this.cs, data),
			'ON CONFLICT ( ' + conflictingFields.join(',') + ') DO',
			this.pgp.helpers.update(this.cs, data)
		]));
};

/**
 * Clear data in memory tables
 * - mem_round
 * - mem_accounts2delegates
 * - mem_accounts2u_delegates
 * - mem_accounts2multisignatures
 * - mem_accounts2u_multisignatures
 *
 * @return {Promise}
 */
AccountsRepo.prototype.resetMemTables = function () {
	return this.db.none(migrationsSql.resetMemoryTables);
};

module.exports = AccountsRepo;
