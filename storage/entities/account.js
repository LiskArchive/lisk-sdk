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
const { stringToByte, booleanToInt } = require('../utils/writers');
const { NonSupportedFilterTypeError } = require('../errors');
const ft = require('./filter_types');
const BaseEntity = require('./base_entity');

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: '',
	secondSignature: 0,
	u_secondSignature: 0,
	username: null,
	u_username: null,
	isDelegate: 0,
	u_isDelegate: 0,
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
 * @property {string} [isDelegate]
 * @property {string} [isDelegate_eql]
 * @property {string} [isDelegate_ne]
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
 * @property {string} [votedFor]
 * @property {string} [votedFor_in]'
 */

/**
 * @typedef {string} fieldSets.Account
 * @enum
 * @value 'FIELD_SET_SIMPLE'
 * @value 'FIELD_SET_FULL'
 */

class Account extends BaseEntity {
	constructor() {
		super();

		this.addField('address', 'string', { format: 'address', filter: ft.TEXT });
		this.addField(
			'publicKey',
			'string',
			{
				format: 'address',
				filter: ft.BINARY,
			},
			stringToByte
		);
		this.addField(
			'secondPublicKey',
			'string',
			{
				format: 'address',
				filter: ft.BINARY,
			},
			stringToByte
		);
		this.addField('username', 'string', { filter: ft.TEXT });
		this.addField(
			'isDelegate',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
		this.addField('secondSignature', 'boolean', { filter: ft.BOOLEAN });
		this.addField('balance', 'string', { filter: ft.NUMBER });
		this.addField('multiMin', 'number', {
			filter: ft.NUMBER,
			realName: 'multimin',
		});
		this.addField('multiLifetime', 'number', {
			filter: ft.NUMBER,
			realName: 'multilifetime',
		});
		this.addField('nameExist', 'boolean', {
			filter: ft.BOOLEAN,
			realName: 'nameexist',
		});
		this.addField('fees', 'string', { filter: ft.NUMBER });
		this.addField('rewards', 'string', { filter: ft.NUMBER });
		this.addField('producedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('missedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('rank', 'string', { filter: ft.NUMBER });

		this.addFilter('votedFor', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = ${votedFor}))',
		});
		this.addFilter('votedFor_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" IN (${votedFor_in:csv}))',
		});

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('accounts/get_simple.sql'),
			selectFull: this.adapter.loadSQLFile('accounts/get_full.sql'),
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
	 * @param {fieldSets.Account} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {*}
	 */
	getOne(filters, options = {}, tx) {
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);
		const parsedFilters = this.parseFilters(filters);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{
				parsedFilters,
			}
		);

		return this.adapter.executeFile(
			{
				[Account.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				[Account.prototype.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[parsedOptions.fieldSet],
			params,
			{ expectedResult: 1 },
			tx
		);
	}

	/**
	 * Get list of accounts
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {fieldSets.Account} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {*}
	 */
	get(filters = {}, options = {}, tx) {
		const parsedFilters = this.parseFilters(filters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{ parsedFilters }
		);

		return this.adapter.executeFile(
			{
				[this.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				[this.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[parsedOptions.fieldSet],
			params,
			{},
			tx
		);
	}

	/**
	 * Create account object
	 *
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line no-unused-vars
	create(data, options = {}, tx) {
		const objectData = _.defaults(data, defaultCreateValues);

		return this.adapter.executeFile(this.SQLs.create, objectData, {}, tx);
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
	// eslint-disable-next-line no-unused-vars
	update(filters, data, options = {}, tx) {
		const objectData = _.omit(data, readOnlyFields);
		const parsedFilters = this.parseFilters(filters);
		const updateSet = this.getUpdateSet(objectData);

		const params = Object.assign(objectData, {
			parsedFilters,
			updateSet,
		});

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
	// eslint-disable-next-line no-unused-vars
	updateOne(filters, data, options = {}, tx) {
		const objectData = _.omit(data, readOnlyFields);
		const parsedFilters = this.parseFilters(filters);
		const updateSet = this.getUpdateSet(objectData);

		const params = Object.assign(objectData, {
			parsedFilters,
			updateSet,
		});

		return this.adapter.executeFile(this.SQLs.updateOne, params, {}, tx);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Account} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	// eslint-disable-next-line no-unused-vars
	isPersisted(filters, options = {}, tx) {
		const parsedFilters = this.parseFilters(filters);

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

	getFieldSets() {
		return [this.FIELD_SET_SIMPLE, this.FIELD_SET_FULL];
	}
}

Account.prototype.FIELD_SET_SIMPLE = 'FIELD_SET_SIMPLE';
Account.prototype.FIELD_SET_FULL = 'FIELD_SET_FULL';
Account.prototype.defaultOptions = {
	limit: 10,
	offset: 0,
	fieldSet: Account.prototype.FIELD_SET_SIMPLE,
};

module.exports = Account;
