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
var constants = require('../../helpers/constants');
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

	// Used in SELECT, UPDATE, INSERT
	var normalFields = [
		{name: 'isDelegate', 		cast: 'int::boolean'},
		{name: 'u_isDelegate', 		cast: 'int::boolean'},
		{name: 'secondSignature', 	cast: 'int::boolean'},
		{name: 'u_secondSignature', cast: 'int::boolean'},
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
		{name: 'rewards', 			cast: 'bigint'},
		{name: 'vote', 				cast: 'bigint'},
		{name: 'producedblocks', 	cast: 'bigint', prop: 'producedBlocks'},
		{name: 'missedblocks', 		cast: 'bigint', prop: 'missedBlocks'},
	];

	// ONLY USED IN SELECT and INSERT
	var immutableFields = [
		{name: 'username'},
		{name: 'u_username'},
		{name: 'address', 			mode: ':raw', init: function (object) { return 'UPPER("address")'; }},
		{name: 'publicKey', 		mode: ':raw', init: function (object) { return 'ENCODE("publicKey", \'hex\')'; }},
		{name: 'secondPublicKey', 	mode: ':raw', init: function (object) { return 'ENCODE("secondPublicKey", \'hex\')'; }},
		{name: 'virgin', 			cast: 'int::boolean'}
	];

	// ONLY USED IN SELECT
	var dynamicFields = [
		{name: 'rank', 				cast: 'bigint', mode: ':raw', init: function () { return 'row_number() OVER (ORDER BY "vote" DESC, "publicKey" ASC)'; }},
		{name: 'delegates', 		mode: ':raw', init: function () { return '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2delegates WHERE "accountId" = "mem_accounts"."address")'; }},
		{name: 'u_delegates', 		mode: ':raw', init: function () { return '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_delegates WHERE "accountId" = "mem_accounts"."address")'; }},
		{name: 'multisignatures', 	mode: ':raw', init: function () { return '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2multisignatures WHERE "accountId" = "mem_accounts"."address")'; }},
		{name: 'u_multisignatures', mode: ':raw', init: function () { return '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_multisignatures WHERE "accountId" = "mem_accounts"."address")'; }},
	];

	this.dbFields = _.union(normalFields, immutableFields, dynamicFields);

	if (!columnSet) {
		columnSet = {};

		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});

		columnSet.select = new pgp.helpers.ColumnSet(this.dbFields, {table: table});

		columnSet.insert = new pgp.helpers.ColumnSet(_.union(normalFields, immutableFields), {table: table});
		columnSet.insert = columnSet.insert.merge([
			{name: 'isDelegate', 		cast: 'int'},
			{name: 'u_isDelegate', 		cast: 'int'},
			{name: 'secondSignature', 	cast: 'int'},
			{name: 'u_secondSignature', cast: 'int'},
			{name: 'virgin', 			cast: 'int'},
			{name: 'address', 			mod: ':raw', init: function (object) { return 'UPPER(\'' + object.value + '\')'; }},
			{name: 'publicKey', 		mod: ':raw', init: function (object) { return 'DECODE(\'' + object.value + '\', \'hex\')'; }},
			{name: 'secondPublicKey', 	mod: ':raw',
				init: function (object) {
					return (object.value == undefined || object.value === null) ? 'NULL' : 'DECODE(\'' + object.value +'\', \'hex\')';
				},
				skip: function (object) { return object.exists; }},
		]);

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
};

// Generate select SQL based on column set definition and conditions
function Selects (columnSet, fields, pgp) {
	if (!(this instanceof Selects)) {
		return new Selects(columnSet, fields, pgp);
	}

	this.rawType = true;
	this.toPostgres = function () {

		var selectSQL = 'SELECT $1:raw FROM $2^';
		var selectClauseWithName = '$1:name$2:raw AS $3:name';
		var selectClauseWithSQL = '($1:raw)$2:raw AS $3:name';

		// Select all fields if none is provided
		if(!fields || !fields.length) {
			fields =  _.map(columnSet.columns, function (column) {
				return column.prop || column.name;
			});
		}

		var table = columnSet.table;
		var selectFields = [];

		columnSet.columns.map(function (column) {
			if(fields.indexOf(column.name) >= 0 || fields.indexOf(column.prop) >= 0) {

				var propName = column.prop ? column.prop : column.name;

				if(column.init) {
					selectFields.push(pgp.as.format(selectClauseWithSQL, [column.init(column), column.castText, propName]));
				} else {
					selectFields.push(pgp.as.format(selectClauseWithName, [column.name, column.castText, propName]));
				}
			}
		});
		return pgp.as.format(selectSQL, [selectFields.join(','), table]);
	};
}

/**
 * Get list of all database fields
 *
 * @return {array}
 */
AccountsRepo.prototype.getDBFields = function () {
	return _.map(this.dbFields, function (field) {
		return field.prop || field.name;
	});
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

/**
 * Search account based on generic conditions
 * @param {Object} filters - Object of filters to be applied in WHERE clause
 * @param {array} fields - Array of data fields to search
 * @param {Object} options - Object with different options
 * @param {int} options.limit - Limit of results
 * @param {int} options.offset - Offset of results
 * @param {string} options.sortField - sort key
 * @param {string} options.sortMethod - sort method ASC or DESC
 * @return {Promise}
 */
AccountsRepo.prototype.list = function (filters, fields, options) {
	var pgp = this.pgp;

	var sql = '${fields:raw} ${conditions:raw} ';
	var limit, offset, sortField='', sortMethod='', conditions='';

	if(!options) {
		options = {};
	}

	// Apply sort only if provided
	if(options.sortField) {
		sortField = options.sortField;
		sortMethod = options.sortMethod || 'DESC';
		sql = sql + ' ORDER BY ${sortField:name} ${sortMethod:raw}  ';
	}

	// Limit the result only if limit param is provided
	if(options.limit) {
		limit = options.limit;
		offset = options.offset || 0;

		sql = sql + ' LIMIT ${limit} OFFSET ${offset}';
	}

	var selectClause = Selects(this.cs.select, fields, pgp);

	if(filters) {
		var filterKeys = Object.keys(filters);
		var filteredColumns = this.cs.insert.columns.filter(function (column) {
			return filterKeys.indexOf(column.name) >= 0;
		});
		conditions = pgp.helpers.sets(filters, filteredColumns).split(',').join(' AND ');
	}

	if(conditions.length) {
		conditions = ' WHERE ' + conditions;
	}

	var query = this.pgp.as.format(sql, {
		fields: selectClause,
		conditions: conditions,
		sortField: sortField,
		sortMethod: sortMethod,
		limit: limit,
		offset: offset});

	return this.db.query(query);
};

module.exports = AccountsRepo;
