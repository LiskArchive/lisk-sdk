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
}

module.exports = AccountsRepository;
