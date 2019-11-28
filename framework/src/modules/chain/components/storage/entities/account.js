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
	fees: '0',
	rewards: '0',
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
};

class ChainAccount extends AccountEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('account', sqlFiles, this.sqlDirectory);
	}

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

	resetMemTables(tx) {
		return this.adapter.executeFile(this.SQLs.resetMemTables, {}, {}, tx);
	}

	increaseFieldBy(filters, field, value, tx) {
		return this._updateField(filters, field, value, 'increase', tx);
	}

	decreaseFieldBy(filters, field, value, tx) {
		return this._updateField(filters, field, value, 'decrease', tx);
	}

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

	static _stringifyVotedDelegates(data) {
		if (data.votedDelegatesPublicKeys) {
			return {
				...data,
				votedDelegatesPublicKeys: JSON.stringify(data.votedDelegatesPublicKeys),
			};
		}
		return data;
	}

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
