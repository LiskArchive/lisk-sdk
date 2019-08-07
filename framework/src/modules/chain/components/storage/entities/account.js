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
	nameExist: false,
	multiMin: 0,
	multiLifetime: 0,
	asset: {},
};

const readOnlyFields = ['address'];

const dependentFieldsTableMap = {
	membersPublicKeys: 'mem_accounts2multisignatures',
	votedDelegatesPublicKeys: 'mem_accounts2delegates',
};

const sqlFiles = {
	create: 'accounts/create.sql',
	update: 'accounts/update.sql',
	updateOne: 'accounts/update_one.sql',
	delete: 'accounts/delete.sql',
	resetMemTables: 'accounts/reset_mem_tables.sql',
	increaseFieldBy: 'accounts/increase_field_by.sql',
	decreaseFieldBy: 'accounts/decrease_field_by.sql',
	createDependentRecord: 'accounts/create_dependent_record.sql',
	createDependentRecords: 'accounts/create_dependent_records.sql',
	deleteDependentRecord: 'accounts/delete_dependent_record.sql',
	deleteDependentRecords: 'accounts/delete_dependent_records.sql',
	deleteAllDependentRecords: 'accounts/delete_all_dependent_records.sql',
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

		const accountCreatePromise = this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
		);

		const dependentRecordsPromsies = [];

		if (data.membersPublicKeys && data.membersPublicKeys.length > 0) {
			dependentRecordsPromsies.push(
				this.updateDependentRecords(
					'membersPublicKeys',
					data.address,
					data.membersPublicKeys,
					tx,
				),
			);
		}

		if (
			data.votedDelegatesPublicKeys &&
			data.votedDelegatesPublicKeys.length > 0
		) {
			dependentRecordsPromsies.push(
				this.updateDependentRecords(
					'votedDelegatesPublicKeys',
					data.address,
					data.votedDelegatesPublicKeys,
					tx,
				),
			);
		}

		return accountCreatePromise.then(() =>
			Promise.all(dependentRecordsPromsies),
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
			const parsedAccount = _.defaults(account, defaultCreateValues);
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

		const objectData = _.omit(data, readOnlyFields);

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

		if (data.membersPublicKeys && data.membersPublicKeys.length > 0) {
			await this.updateDependentRecords(
				'membersPublicKeys',
				filters.address,
				data.membersPublicKeys,
				tx,
			);
		}

		if (
			data.votedDelegatesPublicKeys &&
			data.votedDelegatesPublicKeys.length > 0
		) {
			await this.updateDependentRecords(
				'votedDelegatesPublicKeys',
				filters.address,
				data.votedDelegatesPublicKeys,
				tx,
			);
		}

		// Account remove all votes
		if (
			data.votedDelegatesPublicKeys &&
			data.votedDelegatesPublicKeys.length === 0
		) {
			await this.adapter.executeFile(
				this.SQLs.deleteAllDependentRecords,
				{
					accountId: filters.address,
					tableName: dependentFieldsTableMap.votedDelegatesPublicKeys,
				},
				{},
				tx,
			);
		}

		// Account remove all multisignatures
		if (data.membersPublicKeys && data.membersPublicKeys.length === 0) {
			await this.adapter.executeFile(
				this.SQLs.deleteAllDependentRecords,
				{
					accountId: filters.address,
					tableName: dependentFieldsTableMap.membersPublicKeys,
				},
				{},
				tx,
			);
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
	 * - mem_accounts2delegates
	 * - mem_accounts2multisignatures
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
			tx,
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
			tx,
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
			tx,
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
		tx,
	) {
		assert(
			Object.keys(dependentFieldsTableMap).includes(dependencyName),
			`Invalid dependency name "${dependencyName}" provided.`,
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
			tx,
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
			tx,
		);
	}

	/**
	 * Update dependent records for the account
	 * Delete dependent record for the account
	 *
	 * @param {string} dependencyName - Name of the dependent table
	 * @param {string} address - Address of the account
	 * @param {string} dependentPublicKey - Dependent public id
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	async updateDependentRecords(
		dependencyName,
		address,
		dependentPublicKeys,
		tx,
	) {
		assert(
			Object.keys(dependentFieldsTableMap).includes(dependencyName),
			`Invalid dependency name "${dependencyName}" provided.`,
		);

		const sqlForDelete = this.SQLs.deleteDependentRecords;
		const sqlForInsert = this.SQLs.createDependentRecords;
		const tableName = dependentFieldsTableMap[dependencyName];

		const dependentRecordsForAddress = await this.adapter.execute(
			`SELECT "dependentId" FROM ${tableName} WHERE "accountId" = $1`,
			[address],
		);

		const oldDependentPublicKeys = dependentRecordsForAddress.map(
			dependentRecord => dependentRecord.dependentId,
		);
		const publicKeysToBeRemoved = oldDependentPublicKeys.filter(
			aPK => !dependentPublicKeys.includes(aPK),
		);
		const publicKeysToBeInserted = dependentPublicKeys.filter(
			aPK => !oldDependentPublicKeys.includes(aPK),
		);
		const paramsForDelete = {
			tableName,
			accountId: address,
			dependentIds: publicKeysToBeRemoved,
		};

		if (publicKeysToBeRemoved.length > 0) {
			await this.adapter.executeFile(
				sqlForDelete,
				paramsForDelete,
				{ expectedResultCount: 0 },
				tx,
			);
		}

		if (publicKeysToBeInserted.length > 0) {
			const valuesForInsert = publicKeysToBeInserted.map(dependentId => ({
				accountId: address,
				dependentId,
			}));

			const createSet = this.getValuesSet(
				valuesForInsert,
				['accountId', 'dependentId'],
				{ useRawObject: true },
			);

			await this.adapter.executeFile(
				sqlForInsert,
				{ tableName, createSet },
				{ expectedResultCount: 0 },
				tx,
			);
		}
	}
}

module.exports = ChainAccount;
