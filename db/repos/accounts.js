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

const PQ = require('pg-promise').ParameterizedQuery;
const QF = require('pg-promise').QueryFile;
const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');
const  migrationsSql = require('../sql').migrations;
const constants = require('../../helpers/constants');

let columnSet;

/**
 * Accounts database interaction module
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {AccountsRepo}
 */
class AccountsRepo {

	constructor (db, pgp) {
		this.db = db;
		this.pgp = pgp;

		this.dbTable = 'mem_accounts';

		const ifNotExists = c => !c.exists;

		// Used in SELECT, UPDATE, INSERT
		const normalFields = [
			{name: 'isDelegate', cast: 'int::boolean', skip: ifNotExists},
			{name: 'u_isDelegate', cast: 'int::boolean', skip: ifNotExists},
			{name: 'secondSignature', cast: 'int::boolean', skip: ifNotExists},
			{name: 'u_secondSignature', cast: 'int::boolean', skip: ifNotExists},
			{name: 'balance', cast: 'bigint', def: '0', skip: ifNotExists},
			{name: 'u_balance', cast: 'bigint', def: '0', skip: ifNotExists},
			{name: 'rate', cast: 'bigint', def: '0'},
			{name: 'multimin', def: 0},
			{name: 'u_multimin', def: 0},
			{name: 'multilifetime', def: 0},
			{name: 'u_multilifetime', def: 0},
			{name: 'blockId', def: null},
			{name: 'nameexist', def: 0},
			{name: 'u_nameexist', def: 0},
			{name: 'fees', cast: 'bigint', def: '0'},
			{name: 'rewards', cast: 'bigint', def: '0'},
			{name: 'vote', cast: 'bigint', def: '0'},
			{name: 'producedblocks', cast: 'bigint', def: '0', prop: 'producedBlocks'},
			{name: 'missedblocks', cast: 'bigint', def: '0', prop: 'missedBlocks'},
			{name: 'username', def: null, skip: ifNotExists},
			{name: 'u_username', def: null, skip: ifNotExists},
			{name: 'publicKey', mod: ':raw', init: () => 'ENCODE("publicKey", \'hex\')', skip: ifNotExists},
			{name: 'secondPublicKey', mod: ':raw', init: () => 'ENCODE("secondPublicKey", \'hex\')', skip: ifNotExists},
			{name: 'virgin', cast: 'int::boolean', def: 1, skip: ifNotExists}
		];

		// ONLY USED IN SELECT and INSERT
		const immutableFields = [
			{ name: 'address', mod: ':raw', init: () => 'UPPER("address")'}
		];

		// ONLY USED IN SELECT
		const dynamicFields = [
			{name: 'rank', cast: 'bigint', mod: ':raw', init: () => 'row_number() OVER (ORDER BY "vote" DESC, "publicKey" ASC)'},
			{name: 'delegates', mod: ':raw', init: () => '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2delegates WHERE "accountId" = "mem_accounts"."address")'},
			{name: 'u_delegates', mod: ':raw', init: () => '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_delegates WHERE "accountId" = "mem_accounts"."address")'},
			{name: 'multisignatures', mod: ':raw', init: () => '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2multisignatures WHERE "accountId" = "mem_accounts"."address")'},
			{name: 'u_multisignatures', mod: ':raw', init: () => '(SELECT ARRAY_AGG("dependentId") FROM mem_accounts2u_multisignatures WHERE "accountId" = "mem_accounts"."address")'}
		];

		this.dbFields = _.union(normalFields, immutableFields, dynamicFields);

		if (!columnSet) {
			columnSet = {};

			const table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});

			columnSet.select = new pgp.helpers.ColumnSet(this.dbFields, {table: table});

			columnSet.update = new pgp.helpers.ColumnSet(normalFields, {table: table});
			columnSet.update = columnSet.update.merge([
				{name: 'publicKey', mod: ':raw', init: (object) => (object.value === undefined || object.value === null) ? 'NULL' : `DECODE('${object.value}', 'hex')`, skip: ifNotExists},
				{name: 'secondPublicKey', mod: ':raw', init: (object) => (object.value === undefined || object.value === null) ? 'NULL' : `DECODE('${object.value}', 'hex')`, skip: ifNotExists},
				{name: 'isDelegate', cast: 'int', def: 0, skip: ifNotExists},
				{name: 'u_isDelegate', cast: 'int', def: 0, skip: ifNotExists},
				{name: 'secondSignature', cast: 'int', def: 0, skip: ifNotExists},
				{name: 'u_secondSignature', cast: 'int', def: 0, skip: ifNotExists},
				{name: 'virgin', cast: 'int', def: 1},
			]);

			columnSet.insert = columnSet.update.merge([
				{name: 'address', mod: ':raw', init: (object) => `UPPER('${object.value}')`}
			]);
		}

		this.cs = columnSet;
	}

	/**
	 * Get list of all database fields
	 *
	 * @return {array}
	 */
	getDBFields () {
		return _.map(this.dbFields, (field) => (field.prop || field.name));
	}

	getImmutableFields () {
		return _.difference(
			_.map(this.cs.insert.columns, (field) => (field.prop || field.name)),
			_.map(this.cs.update.columns, (field) => (field.prop || field.name)));
	};

	/**
	 * Count mem accounts
	 * @return {Promise}
	 */
	countMemAccounts () {
		return this.db.one(Queries.countMemAccounts);
	}

	/**
	 * Update mem accounts
	 * @return {Promise}
	 */
	updateMemAccounts () {
		return this.db.none(Queries.updateMemAccounts);
	}

	/**
	 * Get orphan mem accounts
	 * @return {Promise}
	 */
	getOrphanedMemAccounts () {
		return this.db.query(Queries.getOrphanedMemAccounts);
	}

	/**
	 * Get delegates
	 * @return {Promise}
	 */
	getDelegates () {
		return this.db.query(Queries.getDelegates);
	}

	/**
	 * Update or insert into mem_accounts
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#cs.insert}
	 * @param {Array} conflictingFields - Array of attributes to be tested against conflicts, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#dbFields}
	 * @param {Object} updateData - Attributes to be updated, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#cs.update}
	 * @return {Promise}
	 */
	upsert (data, conflictingFields, updateData) {

		// If single field is specified as conflict field
		if(typeof(conflictingFields) === 'string') {
			conflictingFields = [conflictingFields];
		}

		if(!Array.isArray(conflictingFields) || !conflictingFields.length) {
			return Promise.reject('Error: db.accounts.upsert - required conflictingFields');
		}

		if(!updateData) {
			updateData = Object.assign({}, data);
		}

		if(_.difference(_.union(Object.keys(data), Object.keys(updateData)), this.getDBFields()).length) {
			return Promise.reject('Unknown field provided to upsert');
		}

		if(conflictingFields.length === 1 && conflictingFields[0] === 'address') {

			const sql = '${insertSQL:raw} ON CONFLICT(${conflictFields:name}) DO UPDATE SET ${setsSQL:raw}';

			return this.db.none(sql, {
				insertSQL: this.pgp.helpers.insert(data, this.cs.insert),
				conflictFields: conflictingFields,
				setsSQL: this.pgp.helpers.sets(updateData, this.cs.update)
			});

		} else {

			let conditionObject = {};
			conflictingFields.forEach(function (field) {
				conditionObject[field] = data[field];
			});

			return this.db.tx('db:accounts:upsert', function (t) {
				return t.accounts.list(conditionObject, ['address']).then(function (result) {
					if(result.length) {
						return t.accounts.update(result[0].address, updateData);
					} else {
						return t.accounts.insert(data);
					}
				});
			});
		}
	}

	/**
	 * Create the record in mem_accounts
	 * It is encouraged to use **db.accounts.updsert** instead
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#cs.insert}
	 * @return {Promise}
	 *
	 */
	insert (data) {
		return this.db.none(this.pgp.helpers.insert(data, this.cs.insert));
	}

	/**
	 * Update record in mem_accounts
	 * It is encouraged to use **db.accounts.updsert** instead
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepo's dbFields property]{@link AccountsRepo#cs.insert}
	 * @param {string} address - Address of the account to be updated
	 * @return {Promise}
	 */
	update (address, data) {

		if(!address) {
			return Promise.reject('Error: db.accounts.update - required address not specified');
		}

		return this.db.none(this.pgp.helpers.update(data, this.cs.update) + this.pgp.as.format(' WHERE $1:name=$2', ['address', address]));
	}

	/**
	 * Delete record from mem_accounts
	 *
	 * @param {string} address - Address of the account to be updated
	 * @return {Promise}
	 */
	remove (address) {
		const sql = 'DELETE FROM $1:name WHERE $2:name = $3';
		return this.db.none(sql, [this.dbTable, 'address', address]);
	}

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
	resetMemTables () {
		return this.db.none(Queries.resetMemTables);
	}

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
	list (filters, fields, options) {
		const pgp = this.pgp;

		if(filters && _.difference(Object.keys(filters), this.getDBFields()).length) {
			return Promise.reject('Unknown filter field provided to list');
		}

		let sql = '${fields:raw} ${conditions:raw} ';
		let limit, offset, sortField='', sortMethod='', conditions='';

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

		const selectClause = Selects(this.cs.select, fields, pgp);

		if(filters) {
			const filterKeys = Object.keys(filters);
			let filteredColumns = this.cs.insert.columns.filter(function (column) {
				return filterKeys.indexOf(column.name) >= 0;
			});

			// TODO : Improve this logic to convert set statement to composite logic
			conditions = pgp.helpers.sets(filters, filteredColumns).replace(/(,")/,' AND "');
		}

		if(conditions.length) {
			conditions = ' WHERE ' + conditions;
		}

		const query = this.pgp.as.format(sql, {
			fields: selectClause,
			conditions: conditions,
			sortField: sortField,
			sortMethod: sortMethod,
			limit: limit,
			offset: offset});

		return this.db.query(query);
	}
}

const Queries = {
	countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" ORDER BY "height" DESC LIMIT 1)',

<<<<<<< HEAD
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
=======
	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',
>>>>>>> Update db/reps/accounts to use ES6 syntax

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1',

	resetMemTables: new QF(path.join(process.cwd(), './db/sql/init/resetMemoryTables.sql'), {minify: true, params: {schema: 'public'}}),
};

// Generate select SQL based on column set definition and conditions
function Selects (columnSet, fields, pgp) {
	if (!(this instanceof Selects)) {
		return new Selects(columnSet, fields, pgp);
	}

	this.rawType = true;
	this.toPostgres = () => {

		const selectSQL = 'SELECT $1:raw FROM $2^';
		const selectClauseWithName = '$1:name$2:raw AS $3:name';
		const selectClauseWithSQL = '($1:raw)$2:raw AS $3:name';

		// Select all fields if none is provided
		if(!fields || !fields.length) {
			fields =  _.map(columnSet.columns, column => column.prop || column.name);
		}

		const table = columnSet.table;
		const selectFields = [];

		columnSet.columns.map(column => {
			if(fields.includes(column.name) || fields.includes(column.prop)) {

				const propName = column.prop ? column.prop : column.name;

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

module.exports = AccountsRepo;
