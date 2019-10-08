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

const path = require('path');
const assert = require('assert');
const _ = require('lodash');
const {
	entities: { Account: AccountEntity },
} = require('../../../../../components/storage');

const defaultCreateValues = {
	publicKey: null,
	secondPublicKey: null,
	secondSignature: false,
	username: null,
	isDelegate: false,
	balance: '0',
	missedBlocks: 0,
	producedBlocks: 0,
	rank: null,
	fees: '0',
	rewards: '0',
	vote: '0',
	voteWeight: '0',
	nameExist: false,
	multiMin: 0,
	multiLifetime: 0,
	asset: {},
	votedDelegatesPublicKeys: null,
	membersPublicKeys: null,
};

const readOnlyFields = ['address'];

const sqlFiles = {
	create: 'accounts/create.sql',
	update: 'accounts/update.sql',
	updateOne: 'accounts/update_one.sql',
	delete: 'accounts/delete.sql',
	resetMemTables: 'accounts/reset_mem_tables.sql',
	increaseFieldBy: 'accounts/increase_field_by.sql',
	decreaseFieldBy: 'accounts/decrease_field_by.sql',
	delegateBlocksRewards: 'accounts/delegate_blocks_rewards.sql',
	syncDelegatesRank: 'accounts/sync_delegates_rank.sql',
};

class ChainAccount extends AccountEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Account} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('account', sqlFiles, this.sqlDirectory);
	}

	/*
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
			'Data must be an object or array of objects',
		);

		const accounts = ChainAccount._sanitizeCreateData(data);

		// We assume that all accounts have same attributes
		// and pick defined fields as template
		const attributes = Object.keys(this.fields);
		const createSet = this.getValuesSet(accounts, attributes);
		const fields = attributes
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	/**
	 * Parse account data and parse in default values
	 * @param {Array[Object}] | Object} data raw database account data
	 * @return {Array[Object]} Parsed accounts
	 */
	static _sanitizeCreateData(data) {
		let accounts;
		if (Array.isArray(data)) {
			accounts = data.map(item => ({
				...item,
			}));
		} else if (typeof data === 'object') {
			accounts = [
				{
					...data,
				},
			];
		}

		accounts = accounts.map(account => {
			let parsedAccount = _.defaults(account, defaultCreateValues);
			parsedAccount = ChainAccount._stringifyVotedDelegates(parsedAccount);
			parsedAccount = ChainAccount._stringifyMembersPublicKeys(parsedAccount);
			return parsedAccount;
		});

		return accounts;
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
		const atLeastOneRequired = true;

		this.validateFilters(filters, atLeastOneRequired);

		let sanitizedCreateData = ChainAccount._stringifyVotedDelegates(data);
		sanitizedCreateData = ChainAccount._stringifyMembersPublicKeys(
			sanitizedCreateData,
		);

		const objectData = _.omit(sanitizedCreateData, readOnlyFields);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = {
			...objectData,
			parsedFilters,
			updateSet,
		};

		if (_.isEmpty(objectData)) {
			return false;
		}

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
				{
					parsedFilters,
				},
				{
					expectedResultCount: 0,
				},
				tx,
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
			'filters must be an object and contain generatorPublicKey',
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
			tx,
		);
	}

	/**
	 * Clear data in memory tables:
	 * - mem_accounts
	 * - rounds_rewards
	 * - mem_round
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
	 * Sync rank for all delegates.
	 *
	 * @param {Object} [tx] - Database transaction object
	 * @returns {Promise}
	 */
	syncDelegatesRanks(tx) {
		return this.adapter.executeFile(this.SQLs.syncDelegatesRank, {}, {}, tx);
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
			{
				expectedResultCount: 0,
			},
			tx,
		);
	}

	/**
	 * @param {Object} data - create/update data
	 */
	static _stringifyVotedDelegates(data) {
		if (data.votedDelegatesPublicKeys) {
			return {
				...data,
				votedDelegatesPublicKeys: JSON.stringify(data.votedDelegatesPublicKeys),
			};
		}
		return data;
	}

	/**
	 * @param {Object} data - create/update data
	 */
	static _stringifyMembersPublicKeys(data) {
		if (data.membersPublicKeys) {
			return {
				...data,
				membersPublicKeys: JSON.stringify(data.membersPublicKeys),
			};
		}
		return data;
	}
}

module.exports = ChainAccount;
