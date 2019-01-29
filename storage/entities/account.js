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

const assert = require('assert');
const _ = require('lodash');
const { stringToByte, booleanToInt } = require('../utils/inputSerializers');
const ft = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: false,
	u_secondSignature: false,
	username: null,
	u_username: null,
	isDelegate: false,
	u_isDelegate: false,
	balance: '0',
	u_balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	nameExist: false,
	u_nameExist: false,
	multiMin: 0,
	u_multiMin: 0,
	multiLifetime: 0,
	u_multiLifetime: 0,
};

const readOnlyFields = ['address'];

const dependentFieldsTableMap = {
	membersPublicKeys: 'mem_accounts2multisignatures',
	u_membersPublicKeys: 'mem_accounts2u_multisignatures',
	votedDelegatesPublicKeys: 'mem_accounts2delegates',
	u_votedDelegatesPublicKeys: 'mem_accounts2u_delegates',
};

const sqlFiles = {
	selectSimple: 'accounts/get.sql',
	selectFull: 'accounts/get_extended.sql',
	count: 'accounts/count.sql',
	create: 'accounts/create.sql',
	update: 'accounts/update.sql',
	updateOne: 'accounts/update_one.sql',
	isPersisted: 'accounts/is_persisted.sql',
	delete: 'accounts/delete.sql',
	resetUnconfirmedState: 'accounts/reset_unconfirmed_state.sql',
	resetMemTables: 'accounts/reset_mem_tables.sql',
	increaseFieldBy: 'accounts/increase_field_by.sql',
	decreaseFieldBy: 'accounts/decrease_field_by.sql',
	createDependentRecord: 'accounts/create_dependent_record.sql',
	deleteDependentRecord: 'accounts/delete_dependent_record.sql',
	delegateBlocksRewards: 'accounts/delegate_blocks_rewards.sql',
	syncDelegatesRank: 'accounts/sync_delegates_rank.sql',
	countDuplicatedDelegates: 'accounts/count_duplicated_delegates.sql',
	insertFork: 'accounts/insert_fork.sql',
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
 */

/**
 * Extended Account
 * @typedef {BasicAccount} ExtendedAccount
 * @property {string} u_username
 * @property {Boolean} u_isDelegate
 * @property {Boolean} u_secondSignature
 * @property {Boolean} u_nameExist
 * @property {number} u_multiMin
 * @property {number} u_multiLifetime
 * @property {string} u_balance
 * @property {number} productivity
 * @property {Array.<string>} membersPublicKeys - Public keys of all members if its a multi-signature account
 * @property {Array.<string>} u_membersPublicKeys - Public keys of all members including unconfirmed if its a multi-signature account
 * @property {Array.<string>} votedDelegatesPublicKeys - Public keys of all delegates for which this account voted for
 * @property {Array.<string>} u_votedDelegatesPublicKeys - Public keys of all delegates including unconfirmed for which this account voted for
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
			stringToByte
		);
		this.addField(
			'secondPublicKey',
			'string',
			{
				format: 'publicKey',
				filter: ft.BINARY,
			},
			stringToByte
		);
		this.addField('username', 'string', { filter: ft.TEXT });
		this.addField('u_username', 'string', { filter: ft.TEXT });
		this.addField(
			'isDelegate',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
		this.addField(
			'u_isDelegate',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
		this.addField(
			'secondSignature',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
		this.addField(
			'u_secondSignature',
			'boolean',
			{ filter: ft.BOOLEAN },
			booleanToInt
		);
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
		this.addField(
			'nameExist',
			'boolean',
			{
				filter: ft.BOOLEAN,
				fieldName: 'nameexist',
			},
			booleanToInt
		);
		this.addField(
			'u_nameExist',
			'boolean',
			{
				fieldName: 'u_nameexist',
			},
			booleanToInt
		);
		this.addField('fees', 'string', { filter: ft.NUMBER });
		this.addField('rewards', 'string', { filter: ft.NUMBER });
		this.addField('producedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('missedBlocks', 'string', { filter: ft.NUMBER });
		this.addField('rank', 'string', { filter: ft.NUMBER });
		this.addField('vote', 'string', { filter: ft.NUMBER });

		this.addVirtualField('productivity', true);

		this.addFilter('votedDelegatesPublicKeys_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" IN (${votedDelegatesPublicKeys_in:csv}))',
		});
		this.addFilter('u_votedDelegatesPublicKeys_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2u_delegates WHERE "dependentId" IN (${u_votedDelegatesPublicKeys_in:csv}))',
		});
		this.addFilter('membersPublicKeys_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2multisignatures WHERE "dependentId" IN (${membersPublicKeys_in:csv}))',
		});
		this.addFilter('u_membersPublicKeys_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2u_multisignatures WHERE "dependentId" IN (${u_membersPublicKeys_in:csv}))',
		});

		const defaultSort = { sort: 'balance:asc' };
		this.extendDefaultOptions(defaultSort);

		this.SQLs = this.loadSQLFiles('account', sqlFiles);
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
	 * Create account object
	 *
	 * @param {Object|Array.<Object>} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	create(data, _options, tx) {
		assert(data, 'Must provide data to create account');
		assert(
			typeof data === 'object' || Array.isArray(data),
			'Data must be an object or array of objects'
		);

		let values;

		if (Array.isArray(data)) {
			values = data.map(item => ({ ...item }));
		} else if (typeof data === 'object') {
			values = [{ ...data }];
		}

		values = values.map(v => _.defaults(v, defaultCreateValues));

		// We assume that all accounts have same attributes
		// and pick defined fields as template
		const attributes = Object.keys(this.fields);
		const createSet = this.getValuesSet(values, attributes);
		const fields = attributes
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
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
	update(filters, data, _options, tx) {
		const atLeastOneRequired = true;

		this.validateFilters(filters, atLeastOneRequired);

		const objectData = _.omit(data, readOnlyFields);

		if (_.isEmpty(objectData)) {
			return Promise.resolve();
		}

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			parsedFilters,
			updateSet,
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
	updateOne(filters, data, _options, tx) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);

		const objectData = _.omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			parsedFilters,
			updateSet,
		};

		return this.adapter.executeFile(this.SQLs.updateOne, params, {}, tx);
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

	/**
	 * Delete records with following conditions
	 *
	 * @param {filters.Account} filters
	 * @param {Object} [_options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	delete(filters, _options, tx = null) {
		this.validateFilters(filters);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.delete,
				{ parsedFilters },
				{ expectedResultCount: 0 },
				tx
			)
			.then(result => !result);
	}

	/**
	 * Update data based on filters or insert data if no matching record found
	 *
	 * @param {filters.Account} filters - Filters to match the object
	 * @param {Object} data - Object data to be inserted
	 * @param {Object} [updateData] - If provided will be used for update, otherwise default data will be updated
	 * @param {Object} [tx] - DB transaction object
	 * @returns {Promise.<boolean, Error>}
	 */
	upsert(filters, data, updateData = {}, tx = null) {
		const task = t =>
			this.isPersisted(filters, {}, t).then(dataFound => {
				if (dataFound) {
					const dataToUpdate = _.isEmpty(updateData) ? data : updateData;
					return this.update(filters, dataToUpdate, {}, t);
				}

				return this.create(data, {}, t);
			});

		if (tx) {
			return task(tx);
		}

		return this.begin('storage:account:upsert', task);
	}

	/**
	 * Get blocks rewards of delegate for time period.
	 * TODO: move this method to Delegate entity once implemented
	 *
	 * @param {Object} filters = {} - Filters to filter data
	 * @param {string} filters.generatorPublicKey - Delegate Public Key to calculate reward
	 * @param {Number} [filters.fromTimestamp] - WHERE timestamp >= fromTimestamp
	 * @param {Number} [filters.toTimestamp] - WHERE timestamp <= toTimestamp
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<DatabaseRow, Error>}
	 */
	delegateBlocksRewards(filters, tx) {
		assert(
			filters && filters.generatorPublicKey,
			'filters must be an object and contain generatorPublicKey'
		);

		const parseFilters = {
			generatorPublicKey: filters.generatorPublicKey,
			fromTimestamp: filters.fromTimestamp,
			toTimestamp: filters.toTimestamp,
		};

		return this.adapter.executeFile(
			this.SQLs.delegateBlocksRewards,
			parseFilters,
			{},
			tx
		);
	}

	/**
	 * Reset all unconfirmed states of accounts to confirmed states
	 *
	 * @param [tx] - Database transaction object
	 * @returns {Promise.<*, Error>}
	 */
	resetUnconfirmedState(tx) {
		return this.adapter.executeFile(
			this.SQLs.resetUnconfirmedState,
			{},
			{},
			tx
		);
	}

	/**
	 * Clear data in memory tables:
	 * - mem_accounts
	 * - rounds_rewards
	 * - mem_round
	 * - mem_accounts2delegates
	 * - mem_accounts2u_delegates
	 * - mem_accounts2multisignatures
	 * - mem_accounts2u_multisignatures
	 *
	 * @param {Object} tx - DB transaction object
	 * @returns {Promise}
	 */
	resetMemTables(tx) {
		return this.adapter.executeFile(this.SQLs.resetMemTables, {}, {}, tx);
	}

	/**
	 * Increase a field value in mem_accounts.
	 *
	 * @param {filters.Account} [filters] - Filters to match the objects
	 * @param {string} field - Name of the field to increase
	 * @param {Number|string} value - Value increase
	 * @param {Object} [tx] - Transaction object
	 * @returns {Promise}
	 */
	increaseFieldBy(filters, field, value, tx) {
		return this._updateField(filters, field, value, 'increase', tx);
	}

	/**
	 * Decrease a field value in mem_accounts.
	 *
	 * @param {filters.Account} [filters] - Filters to match the objects
	 * @param {string} field - Name of the field to decrease
	 * @param {Number|string} value - Value decrease
	 * @param {Object} [tx] - Transaction object
	 * @returns {Promise}
	 */
	decreaseFieldBy(filters, field, value, tx) {
		return this._updateField(filters, field, value, 'decrease', tx);
	}

	/**
	 * Create dependent record for the account
	 *
	 * @param {string} dependencyName - Name of the dependent table
	 * @param {string} address - Address of the account
	 * @param {string} dependentPublicKey - Dependent public id
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	createDependentRecord(dependencyName, address, dependentPublicKey, tx) {
		return this._updateDependentRecord(
			dependencyName,
			address,
			dependentPublicKey,
			'insert',
			tx
		);
	}

	/**
	 * Delete dependent record for the account
	 *
	 * @param {string} dependencyName - Name of the dependent table
	 * @param {string} address - Address of the account
	 * @param {string} dependentPublicKey - Dependent public id
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	deleteDependentRecord(dependencyName, address, dependentPublicKey, tx) {
		return this._updateDependentRecord(
			dependencyName,
			address,
			dependentPublicKey,
			'delete',
			tx
		);
	}

	/**
	 * Sync rank for all delegates.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	syncDelegatesRanks(tx) {
		return this.adapter.executeFile(this.SQLs.syncDelegatesRank, {}, {}, tx);
	}

	/**
	 * Counts duplicate delegates by transactionId.
	 *
	 * @param {Object} [tx] - Database transaction object
	 *
	 * @returns {Promise<number>}
	 */
	countDuplicatedDelegates(tx) {
		return this.adapter
			.executeFile(
				this.SQLs.countDuplicatedDelegates,
				{},
				{ expectedResultCount: 1 },
				tx
			)
			.then(result => +result.count);
	}

	// TODO: Should create a separate entity to manage forks
	/**
	 * Inserts a fork data table entry.
	 *
	 * @param {Object} fork
	 * @param {string} fork.delegatePublicKey
	 * @param {integer} fork.blockTimestamp
	 * @param {string} fork.blockId
	 * @param {integer} fork.blockHeight
	 * @param {string} fork.previousBlockId
	 * @param {string} fork.cause
	 * @param {Object} [tx] - Database transaction
	 * @returns {Promise}
	 */
	insertFork(fork, tx) {
		return this.adapter.executeFile(
			this.SQLs.insertFork,
			fork,
			{ expectedResultCount: 0 },
			tx
		);
	}

	/**
	 * Update the dependent records used to manage votes and multisignature account members
	 *
	 * @param {string} dependencyName
	 * @param {string} address
	 * @param {string} dependentPublicKey
	 * @param {('insert'|'delete')} mode
	 * @param {Object} [tx]
	 * @returns {Promise}
	 */
	_updateDependentRecord(
		dependencyName,
		address,
		dependentPublicKey,
		mode,
		tx
	) {
		assert(
			Object.keys(dependentFieldsTableMap).includes(dependencyName),
			`Invalid dependency name "${dependencyName}" provided.`
		);
		const params = {
			tableName: dependentFieldsTableMap[dependencyName],
			accountId: address,
			dependentId: dependentPublicKey,
		};

		const sql = {
			insert: this.SQLs.createDependentRecord,
			delete: this.SQLs.deleteDependentRecord,
		}[mode];

		return this.adapter.executeFile(
			sql,
			params,
			{ expectedResultCount: 0 },
			tx
		);
	}

	/**
	 * Update the field value
	 *
	 * @param {filters.Account} filters - Filters object
	 * @param {string} field - Filed name to update
	 * @param {*} value - Value to be update
	 * @param {('increase'|'decrease')} mode - Mode of update
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	_updateField(filters, field, value, mode, tx) {
		const atLeastOneRequired = true;
		const validFieldName = Object.keys(this.fields).includes(field);
		assert(validFieldName, `Field name "${field}" is not valid.`);

		this.validateFilters(filters, atLeastOneRequired);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const filedName = this.fields[field].fieldName;

		const params = {
			parsedFilters,
			field: filedName,
			value,
		};

		const sql = {
			increase: this.SQLs.increaseFieldBy,
			decrease: this.SQLs.decreaseFieldBy,
		}[mode];

		return this.adapter.executeFile(
			sql,
			params,
			{ expectedResultCount: 0 },
			tx
		);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateOptions(options);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'sort', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'sort', 'extended'])
		);
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
			tx
		);
	}
}

module.exports = Account;
