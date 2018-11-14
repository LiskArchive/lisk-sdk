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
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = ${votedFor})',
		});
		this.addFilter('votedFor_in', ft.CUSTOM, {
			condition:
				'mem_accounts.address IN (SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" IN (${votedFor:csv}))',
		});

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('accounts/get_simple.sql'),
			selectFull: this.adapter.loadSQLFile('accounts/get_full.sql'),
			create: this.adapter.loadSQLFile('accounts/create.sql'),
			update: this.adapter.loadSQLFile('accounts/update.sql'),
			updateOne: this.adapter.loadSQLFile('accounts/update_one.sql'),
		};
	}

	getOne(
		filters,
		options = {
			fieldSet: Account.prototype.FIELD_SET_SIMPLE,
		},
		tx
	) {
		const queryOptions = Object.assign({}, options, { expectedResult: 1 });
		const parsedFilters = this.parseFilters(filters);

		const params = Object.assign({}, this.defaultOptions, filters, {
			parsedFilters,
		});

		return this.adapter.executeFile(
			{
				[Account.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				[Account.prototype.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[options.fieldSet],
			params,
			queryOptions,
			tx
		);
	}

	get(
		filters,
		options = {
			fieldSet: Account.prototype.FIELD_SET_SIMPLE,
		},
		tx
	) {
		const parsedFilters = this.parseFilters(filters);
		const params = Object.assign(
			this.defaultOptions,
			{ limit: options.limit, offset: options.offset },
			filters,
			{ parsedFilters }
		);

		return this.adapter.executeFile(
			{
				[this.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				[this.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[options.fieldSet],
			params,
			{},
			tx
		);
	}

	// eslint-disable-next-line no-unused-vars
	create(data, options = {}, tx) {
		const objectData = _.defaults(data, defaultCreateValues);

		return this.adapter.executeFile(this.SQLs.create, objectData, {}, tx);
	}

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

	getFieldSets() {
		return [this.FIELD_SET_SIMPLE, this.FIELD_SET_FULL];
	}
}

Account.prototype.FIELD_SET_SIMPLE = 'FIELD_SET_SIMPLE';
Account.prototype.FIELD_SET_FULL = 'FIELD_SET_FULL';
Account.prototype.defaultOptions = {
	limit: 10,
	offset: 0,
};

module.exports = Account;
