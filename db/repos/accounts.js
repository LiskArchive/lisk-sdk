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

const _ = require('lodash');
const Promise = require('bluebird');
const sql = require('../sql').accounts;

const cs = {}; // Reusable ColumnSet objects

const ifNotExists = c => !c.exists;

// Used in SELECT, UPDATE, INSERT queries
const normalFields = [
	{ name: 'isDelegate', cast: 'int::boolean', skip: ifNotExists },
	{ name: 'u_isDelegate', cast: 'int::boolean', skip: ifNotExists },
	{ name: 'secondSignature', cast: 'int::boolean', skip: ifNotExists },
	{ name: 'u_secondSignature', cast: 'int::boolean', skip: ifNotExists },
	{ name: 'balance', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'u_balance', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'rate', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'multimin', def: 0, skip: ifNotExists },
	{ name: 'u_multimin', def: 0, skip: ifNotExists },
	{ name: 'multilifetime', def: 0, skip: ifNotExists },
	{ name: 'u_multilifetime', def: 0, skip: ifNotExists },
	{ name: 'blockId', def: null, skip: ifNotExists },
	{ name: 'nameexist', def: 0, skip: ifNotExists },
	{ name: 'u_nameexist', def: 0, skip: ifNotExists },
	{ name: 'fees', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'rewards', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'vote', cast: 'bigint', def: '0', skip: ifNotExists },
	{
		name: 'producedblocks',
		cast: 'bigint',
		def: '0',
		prop: 'producedBlocks',
		skip: ifNotExists,
	},
	{
		name: 'missedblocks',
		cast: 'bigint',
		def: '0',
		prop: 'missedBlocks',
		skip: ifNotExists,
	},
	{ name: 'username', def: null, skip: ifNotExists },
	{ name: 'u_username', def: null, skip: ifNotExists },
	{
		name: 'publicKey',
		mod: ':raw',
		init: () => 'encode("publicKey", \'hex\')',
		skip: ifNotExists,
	},
	{
		name: 'secondPublicKey',
		mod: ':raw',
		init: () => 'encode("secondPublicKey", \'hex\')',
		skip: ifNotExists,
	},
	{ name: 'virgin', cast: 'int::boolean', def: 1, skip: ifNotExists },
];

// Only used in SELECT and INSERT queries
const immutableFields = [
	{ name: 'address', mod: ':raw', init: () => 'upper(address)' },
];

// Only used in SELECT queries
const dynamicFields = [
	{ name: 'rank', init: () => sql.columnRank },
	{ name: 'delegates', init: () => sql.columnDelegates },
	{ name: 'u_delegates', init: () => sql.columnUDelegates },
	{ name: 'multisignatures', init: () => sql.columnMultisignatures },
	{ name: 'u_multisignatures', init: () => sql.columnUMultisignatures },
];

const allFields = _.union(normalFields, immutableFields, dynamicFields);

/**
 * Accounts database interaction module.
 *
 * @memberof module:accounts
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {AccountsRepository}
 */
class AccountsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

		this.dbTable = 'mem_accounts';
		this.dbFields = allFields;
		this.cs = cs;

		if (!cs.select) {
			cs.select = new pgp.helpers.ColumnSet(allFields, { table: this.dbTable });
			cs.update = new pgp.helpers.ColumnSet(normalFields, {
				table: this.dbTable,
			});
			cs.update = cs.update.merge([
				{
					name: 'publicKey',
					mod: ':raw',
					init: c =>
						_.isNil(c.value) ? 'null' : `decode('${c.value}', 'hex')`,
					skip: ifNotExists,
				},
				{
					name: 'secondPublicKey',
					mod: ':raw',
					init: c =>
						_.isNil(c.value) ? 'null' : `decode('${c.value}', 'hex')`,
					skip: ifNotExists,
				},
				{ name: 'isDelegate', cast: 'int', def: 0, skip: ifNotExists },
				{ name: 'u_isDelegate', cast: 'int', def: 0, skip: ifNotExists },
				{ name: 'secondSignature', cast: 'int', def: 0, skip: ifNotExists },
				{ name: 'u_secondSignature', cast: 'int', def: 0, skip: ifNotExists },
				{ name: 'virgin', cast: 'int', def: 1 },
			]);

			cs.insert = cs.update.merge([
				{ name: 'address', mod: ':raw', init: c => `upper('${c.value}')` },
			]);
		}
	}

	/**
	 * Get list of all database fields.
	 *
	 * @return {array}
	 */
	getDBFields() {
		return _.map(this.dbFields, field => field.prop || field.name);
	}

	/**
	 * Get list of all immutable fields.
	 *
	 * @return {array}
	 */
	getImmutableFields() {
		return _.difference(
			_.map(this.cs.insert.columns, field => field.prop || field.name),
			_.map(this.cs.update.columns, field => field.prop || field.name)
		);
	}

	/**
	 * Counts memory accounts by blocks.
	 *
	 * @return {Promise<number>}
	 */
	countMemAccounts() {
		return this.db.one(sql.countMemAccounts, [], a => +a.count);
	}

	/**
	 * Update mem_accounts.
	 *
	 * @return {Promise}
	 */
	updateMemAccounts() {
		return this.db.none(sql.updateMemAccounts);
	}

	/**
	 * Get orphan mem_accounts.
	 *
	 * @return {Promise}
	 */
	getOrphanedMemAccounts() {
		return this.db.any(sql.getOrphanedMemAccounts);
	}

	/**
	 * Get delegates.
	 *
	 * @return {Promise}
	 */
	getDelegates() {
		return this.db.any(sql.getDelegates);
	}

	/**
	 * Update or insert into mem_accounts.
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.insert}
	 * @param {Array} conflictingFields - Array of attributes to be tested against conflicts, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#dbFields}
	 * @param {Object} updateData - Attributes to be updated, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.update}
	 * @return {Promise}
	 */
	upsert(data, conflictingFields, updateData) {
		// If single field is specified as conflict field
		if (typeof conflictingFields === 'string') {
			conflictingFields = [conflictingFields];
		}

		if (!Array.isArray(conflictingFields) || !conflictingFields.length) {
			return Promise.reject(
				new TypeError(
					'Error: db.accounts.upsert - invalid conflictingFields argument'
				)
			);
		}

		if (!updateData) {
			updateData = Object.assign({}, data);
		}

		if (
			_.difference(
				_.union(Object.keys(data), Object.keys(updateData)),
				this.getDBFields()
			).length
		) {
			return Promise.reject(
				new Error('Unknown field provided to db.accounts.upsert')
			); // eslint-disable-line prefer-promise-reject-errors
		}

		if (conflictingFields.length === 1 && conflictingFields[0] === 'address') {
			const sql =
				'${insertSQL:raw} ON CONFLICT(${conflictFields:name}) DO UPDATE SET ${setsSQL:raw}';

			return this.db.none(sql, {
				insertSQL: this.pgp.helpers.insert(data, this.cs.insert),
				conflictFields: conflictingFields,
				setsSQL: this.pgp.helpers.sets(updateData, this.cs.update),
			});
		} else {
			const conditionObject = {};
			conflictingFields.forEach(function(field) {
				conditionObject[field] = data[field];
			});

			return this.db.tx('db:accounts:upsert', function(t) {
				return t.accounts
					.list(conditionObject, ['address'])
					.then(function(result) {
						if (result.length) {
							return t.accounts.update(result[0].address, updateData);
						} else {
							return t.accounts.insert(data);
						}
					});
			});
		}
	}

	/**
	 * Create the record in mem_accounts. It is encouraged to use **db.accounts.upsert** instead.
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.insert}
	 * @return {Promise}
	 */
	insert(data) {
		return this.db.none(this.pgp.helpers.insert(data, this.cs.insert));
	}

	/**
	 * Update record in mem_accounts. It is encouraged to use **db.accounts.upsert** instead.
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.insert}
	 * @param {string} address - Address of the account to be updated
	 * @return {Promise}
	 */
	update(address, data) {
		if (!address) {
			return Promise.reject(
				new TypeError('Error: db.accounts.update - invalid address argument')
			); // eslint-disable-line prefer-promise-reject-errors
		}

		return this.db.none(
			this.pgp.helpers.update(data, this.cs.update) +
				this.pgp.as.format(' WHERE $1:name=$2', ['address', address])
		);
	}

	/**
	 * Increment a field value in mem_accounts.
	 *
	 * @param {string} address - Address of the account to increment
	 * @param {string} field - Name of the field to increment
	 * @param {Number} value - Value to be incremented
	 * @return {Promise}
	 */
	increment(address, field, value) {
		return this.db.none(sql.incrementAccount, {
			table: this.dbTable,
			field: field,
			value: value,
			address: address,
		});
	}

	/**
	 * Decrement a field value in mem_accounts.
	 *
	 * @param {string} address - Address of the account to decrement
	 * @param {string} field - Name of the field to decrement
	 * @param {Number} value - Value to be decremented
	 * @return {Promise}
	 */
	decrement(address, field, value) {
		return this.db.none(sql.decrementAccount, {
			table: this.dbTable,
			field: field,
			value: value,
			address: address,
		});
	}

	/**
	 * Delete an account from mem_accounts.
	 *
	 * @param {string} address - Address of the account to be updated
	 * @return {Promise}
	 */
	remove(address) {
		const sql = 'DELETE FROM $1:name WHERE $2:name = $3';
		return this.db.none(sql, [this.dbTable, 'address', address]);
	}

	/**
	 * Clear data in memory tables:
	 * - mem_round
	 * - mem_accounts2delegates
	 * - mem_accounts2u_delegates
	 * - mem_accounts2multisignatures
	 * - mem_accounts2u_multisignatures
	 *
	 * @return {Promise}
	 */
	resetMemTables() {
		return this.db.none(sql.resetMemoryTables);
	}

	/**
	 * Search account based on generic conditions.
	 *
	 * For filters you can pass additional attribute "multisig: true" to fetch only multisig accounts.
	 * You can pass **array of addresses** to the fetch multiple accounts.
	 *
	 * @param {Object} filters - Object of filters to be applied in WHERE clause
	 * @param {array} fields - Array of data fields to search
	 * @param {Object} options - Object with different options
	 * @param {int} options.limit - Limit applied to results
	 * @param {int} options.offset - Offset applied to results
	 * @param {string} options.sortField - Sort key
	 * @param {string} options.sortMethod - Sort method ASC or DESC
	 * @param {string} options.extraCondition - Extra conditions to be appended to fetch objects. It must be properly formatted
	 * @return {Promise}
	 */
	list(filters, fields, options) {
		const pgp = this.pgp;

		const dynamicConditions = [];
		if (filters && filters.multisig) {
			dynamicConditions.push(pgp.as.format('multimin > 0'));
			delete filters.multisig;
		}

		if (filters && Array.isArray(filters.address) && filters.address.length) {
			dynamicConditions.push(
				pgp.as.format('address IN ($1:csv)', [filters.address])
			);
			delete filters.address;
		}

		if (
			filters &&
			typeof filters.username === 'object' &&
			filters.username['$like']
		) {
			dynamicConditions.push(
				pgp.as.format('username LIKE $1', [filters.username['$like']])
			);
			delete filters.username;
		}

		if (
			filters &&
			_.difference(Object.keys(filters), this.getDBFields()).length
		) {
			return Promise.reject('Unknown filter field provided to list'); // eslint-disable-line prefer-promise-reject-errors
		}

		let sql = '${fields:raw} ${conditions:raw} ';
		let limit;
		let offset;
		let sortField = '';
		let sortMethod = '';
		let conditions = '';

		if (!options) {
			options = {};
		}

		// Apply sort only if provided
		if (options.sortField) {
			if (typeof options.sortField === 'string') {
				sortField = options.sortField;
				sortMethod = options.sortMethod || 'DESC';
				sql += ' ORDER BY ${sortField:name} ${sortMethod:raw}  ';
				// As per implementation of sort sortBy helper helpers/sort_by
			} else if (Array.isArray(options.sortField) && options.sortField.length) {
				const sortSQL = [];

				options.sortField.map((field, index) => {
					sortSQL.push(
						this.pgp.as.format('$1:name $2:raw', [
							field,
							options.sortMethod[index],
						])
					);
				});
				sql += `ORDER BY ${sortSQL.join()}`;
			}
		}

		// Limit the result only if limit param is provided
		if (options.limit) {
			limit = options.limit;
			offset = options.offset || 0;

			sql += ' LIMIT ${limit} OFFSET ${offset}';
		}

		const selectClause = Selects(this.cs.select, fields, pgp);

		if (filters) {
			const filterKeys = Object.keys(filters);
			const filteredColumns = this.cs.insert.columns.filter(function(column) {
				return filterKeys.indexOf(column.name) >= 0;
			});

			// TODO: Improve this logic to convert set statement to composite logic
			conditions = pgp.helpers
				.sets(filters, filteredColumns)
				.replace(/(,")/, ' AND "');
		}

		if (
			conditions.length ||
			options.extraCondition ||
			dynamicConditions.length
		) {
			conditions = conditions.length ? [conditions] : [];

			if (options.extraCondition) {
				conditions.push(options.extraCondition);
			}

			if (dynamicConditions.length) {
				conditions.push(dynamicConditions.join(' AND '));
			}

			conditions = ` WHERE ${conditions.join(' AND ')}`;
		}

		const query = this.pgp.as.format(sql, {
			fields: selectClause,
			conditions: conditions,
			sortField: sortField,
			sortMethod: sortMethod,
			limit: limit,
			offset: offset,
		});

		return this.db.query(query);
	}

	/**
	 * Remove account dependencies from mem_accounts2[u_]delegates or mem_accounts2[u_]multisignatures.
	 *
	 * @param {string} address - Address of the account
	 * @param {string} dependentId - Dependent address
	 * @param {string} dependency - Any of [u_]delegates, [u_]multisignatures
	 * @return {Promise}
	 */
	removeDependencies(address, dependentId, dependency) {
		if (
			[
				'delegates',
				'u_delegates',
				'multisignatures',
				'u_multisignatures',
			].indexOf(dependency) === -1
		) {
			return Promise.reject(
				new TypeError(
					`Error: db.accounts.removeDependencies called with invalid argument dependency=${dependency}`
				)
			); // eslint-disable-line prefer-promise-reject-errors
		}

		return this.db.none(sql.removeAccountDependencies, {
			table: `${this.dbTable}2${dependency}`,
			address: address,
			dependentId: dependentId,
		});
	}

	/**
	 * Insert account dependencies from mem_accounts2[u_]delegates or mem_accounts2[u_]multisignatures.
	 *
	 * @param {string} address - Address of the account
	 * @param {string} dependentId - Dependent address
	 * @param {string} dependency - Any of [u_]delegates, [u_]multisignatures
	 * @return {Promise}
	 */
	insertDependencies(address, dependentId, dependency) {
		if (
			[
				'delegates',
				'u_delegates',
				'multisignatures',
				'u_multisignatures',
			].indexOf(dependency) === -1
		) {
			return Promise.reject(
				new TypeError(
					`Error: db.accounts.insertDependencies called with invalid argument dependency=${dependency}`
				)
			); // eslint-disable-line prefer-promise-reject-errors
		}

		const dependentTable = new this.pgp.helpers.TableName({
			table: `${this.dbTable}2${dependency}`,
			schema: 'public',
		});

		return this.db.none(
			this.pgp.helpers.insert(
				{
					accountId: address,
					dependentId: dependentId,
				},
				null,
				dependentTable
			)
		);
	}
}

// Generate select SQL based on column set definition and conditions
function Selects(columnSet, fields, pgp) {
	if (!(this instanceof Selects)) {
		return new Selects(columnSet, fields, pgp);
	}

	this.rawType = true;
	this.toPostgres = () => {
		const selectSQL = 'SELECT $1:raw FROM $2^';
		const selectClauseWithName = '$1:name$2:raw AS $3:name';
		const selectClauseWithSQL = '($1:raw)$2:raw AS $3:name';

		// Select all fields if none is provided
		if (!fields || !fields.length) {
			fields = _.map(columnSet.columns, column => column.prop || column.name);
		}

		const table = columnSet.table;
		const selectFields = [];

		columnSet.columns.map(column => {
			if (fields.includes(column.name) || fields.includes(column.prop)) {
				const propName = column.prop ? column.prop : column.name;

				if (column.init) {
					selectFields.push(
						pgp.as.format(selectClauseWithSQL, [
							column.init(column),
							column.castText,
							propName,
						])
					);
				} else {
					selectFields.push(
						pgp.as.format(selectClauseWithName, [
							column.name,
							column.castText,
							propName,
						])
					);
				}
			}
		});

		return pgp.as.format(selectSQL, [selectFields.join(','), table]);
	};
}

module.exports = AccountsRepository;
