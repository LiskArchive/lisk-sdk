/*
 * Copyright © 2019 Lisk Foundation
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
const { stringToByte, booleanToInt } = require('../utils/input_serializers');
const { NonSupportedOperationError } = require('../errors');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

const sqlFiles = {
	selectSimple: 'accounts/get.sql',
	selectFull: 'accounts/get_extended.sql',
	count: 'accounts/count.sql',
	isPersisted: 'accounts/is_persisted.sql',
};

/**
 * Basic Account
 * @typedef {Object} BasicAccount
 * @property {string} address
 * @property {string} publicKey
 * @property {string} secondPublicKey
 * @property {string} username
 * @property {Boolean} isDelegate
 * @property {Boolean} secondSignature
 * @property {string} balance
 * @property {number} multiMin
 * @property {number} multiLifetime
 * @property {Boolean} nameExist
 * @property {number} missedBlocks
 * @property {number} producedBlocks
 * @property {string} rank
 * @property {string} fees
 * @property {string} rewards
 * @property {string} vote
 * @property {number} productivity
 */

/**
 * Extended Account
 * @typedef {BasicAccount} ExtendedAccount
 * @property {Array.<string>} membersPublicKeys - Public keys of all members if its a multi-signature account
 * @property {Array.<string>} votedDelegatesPublicKeys - Public keys of all delegates for which this account voted for
 * @property {json} asset
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
 * @property {Array.<string>} [publicKey_in]
 * @property {string} [secondPublicKey]
 * @property {string} [secondPublicKey_eql]
 * @property {string} [secondPublicKey_ne]
 * @property {Array.<string>} [secondPublicKey_in]
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
 * @property {string} [votes_in]
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
				filter: ft.BINARY,
			},
			stringToByte,
		);
		this.addField(
			'secondPublicKey',
			'string',
			{
				format: 'publicKey',
				filter: ft.BINARY,
			},
			stringToByte,
		);
		this.addField('username', 'string', { filter: ft.TEXT });
		this.addField(
			'isDelegate',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt,
		);
		this.addField(
			'secondSignature',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt,
		);
		this.addField('balance', 'string', { filter: ft.NUMBER });
		this.addField('multiMin', 'number', {
			filter: ft.NUMBER,
			fieldName: 'multimin',
		});
		this.addField('multiLifetime', 'number', {
			filter: ft.NUMBER,
			fieldName: 'multilifetime',
		});
		this.addField(
			'nameExist',
			'boolean',
			{
				filter: ft.BOOLEAN,
				fieldName: 'nameexist',
			},
			booleanToInt,
		);
		this.addField('fees', 'string', { filter: ft.NUMBER });
		this.addField('rewards', 'string', { filter: ft.NUMBER });
		this.addField('producedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('missedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('rank', 'string', { filter: ft.NUMBER });
		this.addField('vote', 'string', { filter: ft.NUMBER });
		this.addField('asset', 'string');

		this.addFilter('votedDelegatesPublicKeys_in', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" IN (${votedDelegatesPublicKeys_in:csv}))',
		});
		this.addFilter('membersPublicKeys_in', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" IN (${membersPublicKeys_in:csv}))',
		});
		const defaultSort = { sort: 'balance:asc' };
		this.extendDefaultOptions(defaultSort);
		this.sortingFields.push('productivity');

		this.SQLs = this.loadSQLFiles('account', sqlFiles);
	}

	/**
	 * Create object record
	 *
	 * @override
	 * @throws {NonSupportedOperationError}}
	 */
	// eslint-disable-next-line class-methods-use-this
	create() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Update object record
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Update object record
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Delete object record
	 *
	 * @override
	 * @throws {NonSupportedOperationError}
	 */
	// eslint-disable-next-line class-methods-use-this
	delete() {
		throw new NonSupportedOperationError();
	}

	/**
	 * Get one account
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {string | Array.<string>} [options.sort] - Sort keys for results
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicAccount|ExtendedAccount, Error>}
	 */
	getOne(filters, options = {}, tx) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of accounts
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {string | Array.<string>} [options.sort] - Sort keys for results
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicAccount[]|ExtendedAccount[], Error>}
	 */
	get(filters = {}, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Count total entries based on filters
	 *
	 * @param {filters.Account|filters.Account[]} [filters = {}]
	 * @return {Promise.<Integer, NonSupportedFilterTypeError>}
	 */
	count(filters = {}) {
		this.validateFilters(filters);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const expectedResultCount = 1;

		return this.adapter
			.executeFile(this.SQLs.count, { parsedFilters }, { expectedResultCount })
			.then(result => +result.count);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Account} filters
	 * @param {Object} [_options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(this.SQLs.isPersisted, { parsedFilters }, {}, tx)
			.then(result => result[0].exists);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'sort', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'sort', 'extended']),
		);

		// To have deterministic pagination add extra sorting
		if (parsedOptions.sort) {
			parsedOptions.sort = _.flatten([
				parsedOptions.sort,
				'address:asc',
			]).filter(Boolean);
		} else {
			parsedOptions.sort = ['address:asc'];
		}

		const parsedSort = this.parseSort(parsedOptions.sort);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedSort,
			parsedFilters,
		};

		return this.adapter.executeFile(
			parsedOptions.extended ? this.SQLs.selectFull : this.SQLs.selectSimple,
			params,
			{ expectedResultCount },
			tx,
		);
	}
}

module.exports = Account;
