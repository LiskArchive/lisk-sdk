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
const { stringToByte, booleanToInt } = require('../utils/inputSerializers');
const { NonSupportedFilterTypeError } = require('../errors');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: 0,
	u_secondSignature: 0,
	username: null,
	u_username: null,
	isDelegate: false,
	u_isDelegate: false,
	balance: '0',
	u_balance: '0',
	delegates: null,
	u_delegates: null,
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: 0,
	u_nameExist: 0,
	multiMin: 0,
	u_multiMin: 0,
	multiLifetime: 0,
	u_multiLifetime: 0,
	multiSignatures: null,
	u_multiSignatures: null,
};

const readOnlyFields = ['address'];

/**
 * Basic Account
 * @typedef {Object} BasicAccount
 * @property {string} address
 * @property {string} username
 * @property {Boolean} isDelegate
 * @property {string} balance
 * @property {number} missedBlocks
 * @property {number} producedBlocks
 * @property {string} rank
 * @property {string} fees
 * @property {string} rewards
 * @property {string} vote
 * @property {Boolean} nameExist
 * @property {string} delegates
 * @property {number} multiMin
 * @property {number} multiLifetime
 * @property {string} secondPublicKey
 * @property {string} secondSignature
 */

/**
 * Extended Account
 * @typedef {BasicAccount} ExtendedAccount
 * @property {string} u_secondSignature
 * @property {string} u_username
 * @property {Boolean} u_isDelegate
 * @property {string} u_balance
 * @property {string} u_delegates
 * @property {string} u_delegates
 * @property {Boolean} u_nameExist
 * @property {number} u_multiMin
 * @property {number} u_multiLifetime
 * @property {string} u_multiSignatures
 * @property {Array.<string>} members - Public keys of all members if its a multi-signature account
 * @property {Array.<string>} u_members - Public keys of all members including unconfirmed if its a multi-signature account
 * @property {Array.<string>} votes - Public keys of all delegates for which this account voted for
 * @property {Array.<string>} u_votes - Public keys of all delegates including unconfirmed for which this account voted for
 */

/**
 * Account Filters
 * @typedef {Object} filters.Account
 * @property {string} [address]
 * @property {string} [address_eql]
 * @property {string} [address_ne]
 * @property {string} [address_in]
 * @property {string} [address_like]
 * @property {string} [publicKey]
 * @property {string} [publicKey_eql]
 * @property {string} [publicKey_ne]
 * @property {string} [secondPublicKey]
 * @property {string} [secondPublicKey_eql]
 * @property {string} [secondPublicKey_ne]
 * @property {string} [username]
 * @property {string} [username_eql]
 * @property {string} [username_ne]
 * @property {string} [username_in]
 * @property {string} [username_like]
 * @property {Boolean} [isDelegate]
 * @property {Boolean} [isDelegate_eql]
 * @property {Boolean} [isDelegate_ne]
 * @property {string} [secondSignature]
 * @property {string} [secondSignature_eql]
 * @property {string} [secondSignature_ne]
 * @property {string} [balance]
 * @property {string} [balance_eql]
 * @property {string} [balance_ne]
 * @property {string} [balance_gt]
 * @property {string} [balance_gte]
 * @property {string} [balance_lt]
 * @property {string} [balance_lte]
 * @property {string} [balance_in]
 * @property {string} [multiMin]
 * @property {string} [multiMin_eql]
 * @property {string} [multiMin_ne]
 * @property {string} [multiMin_gt]
 * @property {string} [multiMin_gte]
 * @property {string} [multiMin_lt]
 * @property {string} [multiMin_lte]
 * @property {string} [multiMin_in]
 * @property {string} [multiLifetime]
 * @property {string} [multiLifetime_eql]
 * @property {string} [multiLifetime_ne]
 * @property {string} [multiLifetime_gt]
 * @property {string} [multiLifetime_gte]
 * @property {string} [multiLifetime_lt]
 * @property {string} [multiLifetime_lte]
 * @property {string} [multiLifetime_in]
 * @property {string} [nameExist]
 * @property {string} [nameExist_eql]
 * @property {string} [nameExist_ne]
 * @property {string} [fees]
 * @property {string} [fees_eql]
 * @property {string} [fees_ne]
 * @property {string} [fees_gt]
 * @property {string} [fees_gte]
 * @property {string} [fees_lt]
 * @property {string} [fees_lte]
 * @property {string} [fees_in]
 * @property {string} [rewards]
 * @property {string} [rewards_eql]
 * @property {string} [rewards_ne]
 * @property {string} [rewards_gt]
 * @property {string} [rewards_gte]
 * @property {string} [rewards_lt]
 * @property {string} [rewards_lte]
 * @property {string} [rewards_in]
 * @property {string} [producedBlocks]
 * @property {string} [producedBlocks_eql]
 * @property {string} [producedBlocks_ne]
 * @property {string} [producedBlocks_gt]
 * @property {string} [producedBlocks_gte]
 * @property {string} [producedBlocks_lt]
 * @property {string} [producedBlocks_lte]
 * @property {string} [producedBlocks_in]
 * @property {string} [missedBlocks]
 * @property {string} [missedBlocks_eql]
 * @property {string} [missedBlocks_ne]
 * @property {string} [missedBlocks_gt]
 * @property {string} [missedBlocks_gte]
 * @property {string} [missedBlocks_lt]
 * @property {string} [missedBlocks_lte]
 * @property {string} [missedBlocks_in]
 * @property {string} [rank]
 * @property {string} [rank_eql]
 * @property {string} [rank_ne]
 * @property {string} [rank_gt]
 * @property {string} [rank_gte]
 * @property {string} [rank_lt]
 * @property {string} [rank_lte]
 * @property {string} [rank_in]
 * @property {string} [votes]
 * @property {string} [votes_in]'
 */

class Account extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Account} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('address', 'string', { format: 'address', filter: ft.TEXT });
		this.addField(
			'publicKey',
			'string',
			{
				format: 'publicKey',
				filter: ft.TEXT,
			},
			stringToByte
		);
		this.addField(
			'secondPublicKey',
			'string',
			{
				format: 'publicKey',
				filter: ft.TEXT,
			},
			stringToByte
		);
		this.addField('username', 'string', { filter: ft.TEXT });
		this.addField('u_username', 'string');
		this.addField(
			'isDelegate',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
		this.addField('u_isDelegate', 'boolean', {}, booleanToInt);
		this.addField('secondSignature', 'boolean', { filter: ft.BOOLEAN });
		this.addField('u_secondSignature', 'boolean');
		this.addField('balance', 'string', { filter: ft.NUMBER });
		this.addField('u_balance', 'string');
		this.addField('multiMin', 'number', {
			filter: ft.NUMBER,
			fieldName: 'multimin',
		});
		this.addField('u_multiMin', 'number', {
			fieldName: 'u_multimin',
		});
		this.addField('multiLifetime', 'number', {
			filter: ft.NUMBER,
			fieldName: 'multilifetime',
		});
		this.addField('u_multiLifetime', 'number', {
			fieldName: 'u_multilifetime',
		});
		this.addField('nameExist', 'boolean', {
			filter: ft.BOOLEAN,
			fieldName: 'nameexist',
		});
		this.addField('u_nameExist', 'boolean', {
			fieldName: 'u_nameexist',
		});
		this.addField('fees', 'string', { filter: ft.NUMBER });
		this.addField('rewards', 'string', { filter: ft.NUMBER });
		this.addField('producedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('missedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('rank', 'string', { filter: ft.NUMBER });
		this.addField('vote', 'string', { filter: ft.NUMBER });
		this.addField('delegates', 'string');
		this.addField('u_delegates', 'string');
		this.addField('multiSignatures', 'string', {
			fieldName: 'multisignatures',
		});
		this.addField('u_multiSignatures', 'string', {
			fieldName: 'u_multisignatures',
		});

		this.addFilter('votes', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = ${votedFor})',
		});
		this.addFilter('votes_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" IN (${votedFor_in:csv}))',
		});

		this.addFilter('members', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" = ${votedFor})',
		});
		this.addFilter('members_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" IN (${votedFor_in:csv}))',
		});

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('accounts/get.sql'),
			selectFull: this.adapter.loadSQLFile('accounts/get_extended.sql'),
			create: this.adapter.loadSQLFile('accounts/create.sql'),
			update: this.adapter.loadSQLFile('accounts/update.sql'),
			updateOne: this.adapter.loadSQLFile('accounts/update_one.sql'),
			isPersisted: this.adapter.loadSQLFile('accounts/is_persisted.sql'),
		};
	}

	/**
	 * Get one account
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicAccount|ExtendedAccount, Error>}
	 */
	async getOne(filters, options = {}, tx) {
		return this._getResults(filters, options, tx, 1);
	}

	/**
	 * Get list of accounts
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicAccount[]|ExtendedAccount[], Error>}
	 */
	async get(filters = {}, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Create account object
	 *
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	async create(data, _options, tx) {
		const objectData = _.defaults(data, defaultCreateValues);
		const createSet = this.getValuesSet(objectData);
		const attributes = Object.keys(data)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, attributes },
			{},
			tx
		);
	}

	/**
	 * Update the records based on given condition
	 *
	 * @param {filters.Account} [filters]
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	async update(filters, data, _options, tx) {
		const objectData = _.omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			...{
				parsedFilters,
				updateSet,
			},
		};

		return this.adapter.executeFile(this.SQLs.update, params, {}, tx);
	}

	/**
	 * Update one record based on the condition given
	 *
	 * @param {filters.Account} filters
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	async updateOne(filters, data, _options, tx) {
		const objectData = _.omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			...{
				parsedFilters,
				updateSet,
			},
		};

		return this.adapter.executeFile(this.SQLs.updateOne, params, {}, tx);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Account} filters
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	async isPersisted(filters, tx) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		if (parsedFilters === '') {
			throw new NonSupportedFilterTypeError(
				'Please provide some filters to check.',
				filters
			);
		}

		return this.adapter
			.executeFile(this.SQLs.isPersisted, { parsedFilters }, {}, tx)
			.then(result => result[0].exists);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'extended'])
		);

		const params = {
			...{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			...{ parsedFilters },
		};

		return this.adapter.executeFile(
			parsedOptions.extended ? this.SQLs.selectFull : this.SQLs.selectSimple,
			params,
			{ expectedResultCount },
			tx
		);
	}
}

module.exports = Account;
