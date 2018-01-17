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
var _ = require('lodash');
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

	var normalFields = [
		{name: 'isDelegate', 		cast: 'boolean'},
		{name: 'u_isDelegate', 		cast: 'boolean'},
		{name: 'secondSignature', 	cast: 'boolean'},
		{name: 'u_secondSignature', cast: 'boolean'},
		{name: 'balance', 			cast: 'bigint'},
		{name: 'u_balance', 		cast: 'bigint'},
		{name: 'rate', 				cast: 'bigint'},
		{name: 'multimin'},
		{name: 'u_multimin'},
		{name: 'multilifetime'},
		{name: 'u_multilifetime'},
		{name: 'blockId'},
		{name: 'nameexist'},
		{name: 'u_nameexist'},
		{name: 'fees', 				cast: 'bigint'},
		{name: 'rank', 				cast: 'bigint', mode: ':raw', init: function (col) { return 'row_number() OVER (ORDER BY a."vote" DESC, a."publicKey" ASC)'; }},
		{name: 'rewards', 			cast: 'bigint'},
		{name: 'vote', 				cast: 'bigint'},
		{name: 'producedBlocks', 	cast: 'bigint'},
		{name: 'missedBlocks', 		cast: 'bigint'},
	];

	var immutableFields = [
		{name: 'username'},
		{name: 'u_username'},
		{name: 'address', 			mode: ':raw', init: function (col) { return 'UPPER(' + col.name + ')'; }},
		{name: 'publicKey', 		mode: ':raw', init: function (col) { return 'ENCODE(' + col.name + ', \'hex\')'; }},
		{name: 'secondPublicKey', 	mode: ':raw', init: function (col) { return 'ENCODE(' + col.name + ', \'hex\')'; }},
		{name: 'virgin', 			cast: 'boolean'}
	];

	this.dbFields = _.union(normalFields, immutableFields);

	if (!columnSet) {
		columnSet = {};

		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});

		columnSet.select = new pgp.helpers.ColumnSet(this.dbFields, {table: table});

		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {table: table});

		columnSet.update = new pgp.helpers.ColumnSet(normalFields, {table: table});
	}

	this.cs = columnSet;
}

var Queries = {
	countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" ORDER BY "height" DESC LIMIT 1)',

	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1',

	upsert: new PQ('INSERT INTO mem_accounts $1 VALUES $2 ON CONFLICT($3) DO UPDATE SET $4'),

	resetMemTables: new QF(path.join(process.cwd(), './db/sql/init/resetMemoryTables.sql'), {minify: true, params: {schema: 'public'}}),

	getAll: new QF(path.join(process.cwd(), './db/sql/accounts/getAll.sql'), {minify: true, params: {schema: 'public', table: this.dbTable}})
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

AccountsRepo.prototype.getAll = function (filters, fields) {
	//return this.db.query(Queries.getAll, [fields, 'isDelegate = 1', 10, 0]);

	console.log(this.pgp.as.format('SELECT ${col:name} FROM ${table:name} LIMIT 1 OFFSET 10;', {col: ['isDelegate'], table: 'mem_accounts'}));

	//return this.db.query(Queries.getAll, ['username', 'isDelegate = 1', 10, 0]);
	return this.db.query('SELECT $1:name FROM $2 LIMIT 1 OFFSET 10;', [['isDelegate', 'username'], this.dbTable]);
};

module.exports = AccountsRepo;
