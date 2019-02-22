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

const path = require('path');
const assert = require('assert');
const _ = require('lodash');
const {
	Account: AccountEntity,
} = require('../../../../../components/storage/entities/');

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
	create: 'accounts/create.sql',
	update: 'accounts/update.sql',
	updateOne: 'accounts/update_one.sql',
	delete: 'accounts/delete.sql',
	resetUnconfirmedState: 'accounts/reset_unconfirmed_state.sql',
	resetMemTables: 'accounts/reset_mem_tables.sql',
	increaseFieldBy: 'accounts/increase_field_by.sql',
	decreaseFieldBy: 'accounts/decrease_field_by.sql',
	createDependentRecord: 'accounts/create_dependent_record.sql',
	deleteDependentRecord: 'accounts/delete_dependent_record.sql',
	delegateBlocksRewards: 'accounts/delegate_blocks_rewards.sql',
	syncDelegatesRank: 'accounts/sync_delegates_rank.sql',
	insertFork: 'accounts/insert_fork.sql',
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

		const cutomSQLs = this.loadSQLFiles('account', sqlFiles, this.sqlDirectory);
		this.SQLs = {
			...this.SQLs,
			...cutomSQLs,
		};
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
			values = data.map(item => ({
				...item,
			}));
		} else if (typeof data === 'object') {
			values = [
				{
					...data,
				},
			];
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
			{
				createSet,
				fields,
			},
			{
				expectedResultCount: 0,
			},
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
			{
				expectedResultCount: 0,
			},
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
			{
				expectedResultCount: 0,
			},
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
			{
				expectedResultCount: 0,
			},
			tx
		);
	}
}

module.exports = ChainAccount;
