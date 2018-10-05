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
	{ name: 'multimin', def: 0, skip: ifNotExists },
	{ name: 'u_multimin', def: 0, skip: ifNotExists },
	{ name: 'multilifetime', def: 0, skip: ifNotExists },
	{ name: 'u_multilifetime', def: 0, skip: ifNotExists },
	{ name: 'nameexist', def: 0, skip: ifNotExists },
	{ name: 'u_nameexist', def: 0, skip: ifNotExists },
	{ name: 'fees', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'rewards', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'vote', cast: 'bigint', def: '0', skip: ifNotExists },
	{ name: 'producedBlocks', def: 0, skip: ifNotExists },
	{ name: 'missedBlocks', def: 0, skip: ifNotExists },
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
];

// Only used in SELECT and INSERT queries
const immutableFields = [
	{ name: 'address' },
	{ name: 'rank', cast: 'bigint', def: null, skip: ifNotExists },
];

// Only used in SELECT queries
const dynamicFields = [
	{ name: 'delegates', init: () => sql.columnDelegates },
	{ name: 'u_delegates', init: () => sql.columnUDelegates },
	{ name: 'multisignatures', init: () => sql.columnMultisignatures },
	{ name: 'u_multisignatures', init: () => sql.columnUMultisignatures },
];

const allFields = _.union(normalFields, immutableFields, dynamicFields);

/**
 * Accounts database interaction class.
 *
 * @class
 * @memberof db.repos.accounts
 * @requires bluebird
 * @requires lodash
 * @requires db/sql.accounts
 * @see Parent: {@link db.repos.accounts}
 * @param {Object} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of an AccountsRepository
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
			]);

			cs.insert = cs.update.merge(immutableFields);
		}
	}

	/**
	 * Get list of all database fields.
	 *
	 * @returns {array}
	 * @todo Add description for the return value
	 */
	getDBFields() {
		return this.dbFields.map(f => f.name);
	}

	/**
	 * Get list of all immutable fields.
	 *
	 * @returns {array}
	 * @todo Add description for the return value
	 */
	getImmutableFields() {
		return _.difference(
			this.cs.insert.columns.map(f => f.name),
			this.cs.update.columns.map(f => f.name)
		);
	}

	/**
	 * Update mem_accounts.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	updateMemAccounts() {
		return this.db.none(sql.updateMemAccounts);
	}

	/**
	 * Get delegates.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
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
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	upsert(data, conflictingFields, updateData) {
		// If single field is specified as conflict field
		if (typeof conflictingFields === 'string') {
			conflictingFields = [conflictingFields];
		}

		if (!Array.isArray(conflictingFields) || !conflictingFields.length) {
			return Promise.reject(
				new TypeError(
					'Error: db.accounts.upsert - invalid "conflictingFields" argument.'
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
			);
		}

		const conditionObject = {};
		conflictingFields.forEach(field => {
			conditionObject[field] = data[field];
		});

		return this.db.tx('db:accounts:upsert', function*(t) {
			const result = yield t.accounts.list(conditionObject, ['address']);
			if (result.length) {
				yield t.accounts.update(result[0].address, updateData);
			} else {
				yield t.accounts.insert(data);
			}
		});
	}

	/**
	 * Create the record in mem_accounts. It is encouraged to use **db.accounts.upsert** instead.
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.insert}
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	insert(data) {
		const query = () => this.pgp.helpers.insert(data, this.cs.insert);
		return this.db.none(query);
	}

	/**
	 * Update record in mem_accounts. It is encouraged to use **db.accounts.upsert** instead.
	 *
	 * @param {Object} data - Attributes to be inserted, can be any of [AccountsRepository's dbFields property]{@link AccountsRepository#cs.insert}
	 * @param {string} address - Address of the account to be updated
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	update(address, data) {
		if (!address) {
			return Promise.reject(
				new TypeError('Error: db.accounts.update - invalid address argument.')
			);
		}

		this.getImmutableFields().map(field => {
			delete data[field];
		});

		// To avoid Error: Cannot generate an UPDATE without any columns.
		// If there is nothing to update, return else pg-promise will fail
		if (Object.keys(data).length === 0) {
			return Promise.resolve();
		}

		const query = () =>
			this.pgp.helpers.update(data, this.cs.update) +
			this.pgp.as.format(' WHERE $1:name = $2', ['address', address]);

		return this.db.none(query);
	}

	/**
	 * Increment a field value in mem_accounts.
	 *
	 * @param {string} address - Address of the account to increment
	 * @param {string} field - Name of the field to increment
	 * @param {Number} value - Value to be incremented
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	increment(address, field, value) {
		return this.db.none(sql.incrementAccount, {
			table: this.dbTable,
			field,
			value,
			address,
		});
	}

	/**
	 * Decrement a field value in mem_accounts.
	 *
	 * @param {string} address - Address of the account to decrement
	 * @param {string} field - Name of the field to decrement
	 * @param {Number} value - Value to be decremented
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	decrement(address, field, value) {
		return this.db.none(sql.decrementAccount, {
			table: this.dbTable,
			field,
			value,
			address,
		});
	}

	/**
	 * Delete an account from mem_accounts.
	 *
	 * @param {string} address - Address of the account to be updated
	 * @returns {Promise}
	 * @todo Add description for the return value
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
	 * @returns {Promise}
	 * @todo Add description for the return value
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
	 * @returns {Promise}
	 * @todo Add description for the return value
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
			Array.isArray(filters.publicKey) &&
			filters.publicKey.length
		) {
			const decodedPublicKeys = filters.publicKey.map(
				publicKey => `decode('${publicKey}', 'hex')`
			);
			dynamicConditions.push(
				pgp.as.format(`"publicKey" IN (${decodedPublicKeys.join(',')})`)
			);
			delete filters.publicKey;
		}

		if (
			filters &&
			typeof filters.username === 'object' &&
			filters.username.$like
		) {
			dynamicConditions.push(
				pgp.as.format('username LIKE $1', [filters.username.$like])
			);
			delete filters.username;
		}

		if (
			filters &&
			_.difference(Object.keys(filters), this.getDBFields()).length
		) {
			return Promise.reject(
				new Error('Unknown filter field provided to list.')
			);
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

		const query = () => {
			// Apply sort only if provided
			if (options.sortField) {
				if (typeof options.sortField === 'string') {
					sortField = options.sortField;
					sortMethod = options.sortMethod || 'DESC';
					sql += ' ORDER BY ${sortField:name} ${sortMethod:raw}  ';
					// As per implementation of sort sortBy helper helpers/sort_by
				} else if (
					Array.isArray(options.sortField) &&
					options.sortField.length
				) {
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
				const filteredColumns = this.cs.insert.columns.filter(
					column => filterKeys.indexOf(column.name) >= 0
				);

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

			return this.pgp.as.format(sql, {
				fields: selectClause,
				conditions,
				sortField,
				sortMethod,
				limit,
				offset,
			});
		};

		return this.db.query(query);
	}

	/**
	 * Remove account dependencies from mem_accounts2[u_]delegates or mem_accounts2[u_]multisignatures.
	 *
	 * @param {string} address - Address of the account
	 * @param {string} dependentId - Dependent address
	 * @param {string} dependency - Any of [u_]delegates, [u_]multisignatures
	 * @returns {Promise}
	 * @todo Add description for the return value
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
			);
		}

		return this.db.none(sql.removeAccountDependencies, {
			table: `${this.dbTable}2${dependency}`,
			address,
			dependentId,
		});
	}

	/**
	 * Insert account dependencies from mem_accounts2[u_]delegates or mem_accounts2[u_]multisignatures.
	 *
	 * @param {string} address - Address of the account
	 * @param {string} dependentId - Dependent address
	 * @param {string} dependency - Any of [u_]delegates, [u_]multisignatures
	 * @returns {Promise}
	 * @todo Add description for the return value
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
			);
		}

		const dependentTable = `${this.dbTable}2${dependency}`;

		const query = () =>
			this.pgp.helpers.insert(
				{
					accountId: address,
					dependentId,
				},
				null,
				dependentTable
			);

		return this.db.none(query);
	}
}

/**
 * Description of the class.
 *
 * @class
 * @memberof db.repos.accounts
 * @see Parent: {@link db.repos.accounts}
 * @param {Object} columnSet
 * @param {Array} fields
 * @param {Object} pgp
 * @todo Add @returns tag
 */
// Generate select SQL based on column set definition and conditions
function Selects(columnSet, fields, pgp) {
	if (!(this instanceof Selects)) {
		return new Selects(columnSet, fields, pgp);
	}

	this.rawType = true;
	/**
	 * Description of the function.
	 *
	 * @todo Add description for the function
	 * @todo Add @returns tag
	 */
	this.toPostgres = () => {
		const selectSQL = 'SELECT $1:raw FROM $2^';
		const selectClauseWithName = '$1:name$2:raw AS $3:name';
		const selectClauseWithSQL = '($1:raw)$2:raw AS $3:name';

		// Select all fields if none is provided
		if (!fields || !fields.length) {
			fields = columnSet.columns.map(c => c.name);
		}

		const table = columnSet.table;
		const selectFields = [];

		columnSet.columns.map(column => {
			if (fields.includes(column.name)) {
				const propName = column.name;

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

		return pgp.as.format(selectSQL, [selectFields.join(), table]);
	};
}

module.exports = AccountsRepository;
