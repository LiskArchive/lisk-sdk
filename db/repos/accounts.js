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
		this.inTransaction = !!(db.ctx && db.ctx.inTransaction);

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

	// TODO: Only used in tests, should be removed later at the end
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

		let fielsAndConditionsSql = '${fields:raw} ${conditions:raw} ';
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
					fielsAndConditionsSql +=
						' ORDER BY ${sortField:name} ${sortMethod:raw}  ';
					// As per implementation of sort sortBy helper helpers/sort_by
				} else if (
					Array.isArray(options.sortField) &&
					options.sortField.length
				) {
					const sortSQL = [];

					options.sortField.map((field, index) =>
						sortSQL.push(
							this.pgp.as.format('$1:name $2:raw', [
								field,
								options.sortMethod[index],
							])
						)
					);
					fielsAndConditionsSql += `ORDER BY ${sortSQL.join()}`;
				}
			}

			// Limit the result only if limit param is provided
			if (options.limit) {
				limit = options.limit;
				offset = options.offset || 0;

				fielsAndConditionsSql += ' LIMIT ${limit} OFFSET ${offset}';
			}

			const selectClause = new Selects(this.cs.select, fields, pgp);

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

			return this.pgp.as.format(fielsAndConditionsSql, {
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

		columnSet.columns
			.filter(column => fields.includes(column.name))
			.map(column => {
				const propName = column.name;
				if (column.init) {
					return selectFields.push(
						pgp.as.format(selectClauseWithSQL, [
							column.init(column),
							column.castText,
							propName,
						])
					);
				}
				return selectFields.push(
					pgp.as.format(selectClauseWithName, [
						column.name,
						column.castText,
						propName,
					])
				);
			});

		return pgp.as.format(selectSQL, [selectFields.join(), table]);
	};
}

module.exports = AccountsRepository;
