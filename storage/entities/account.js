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

const ft = require('./filter_types');
const BaseEntity = require('./base_entity');

class Account extends BaseEntity {
	constructor() {
		super();

		this.addFilter('address', ft.TEXT);
		this.addFilter('publicKey', ft.BINARY);
		this.addFilter('secondPublicKey', ft.BINARY);
		this.addFilter('username', ft.TEXT);
		this.addFilter('isDelegate', ft.NUMBER);
		this.addFilter('secondSignature', ft.NUMBER);
		this.addFilter('balance', ft.NUMBER);
		this.addFilter('multiMin', ft.NUMBER, { realName: 'multimin' });
		this.addFilter('multiLifetime', ft.NUMBER, { realName: 'multilifetime' });
		this.addFilter('nameExist', ft.BOOLEAN, { realName: 'nameexist' });
		this.addFilter('fees', ft.NUMBER);
		this.addFilter('rewards', ft.NUMBER);
		this.addFilter('producedBlocks', ft.NUMBER);
		this.addFilter('missedBlocks', ft.NUMBER);
		this.addFilter('rank', ft.NUMBER);

		this.addFilter('u_isDelegate', ft.BOOLEAN);
		this.addFilter('u_secondSignature', ft.BOOLEAN);
		this.addFilter('u_balance', ft.NUMBER);
		this.addFilter('u_multimin', ft.NUMBER);
		this.addFilter('u_multilifetime', ft.NUMBER);
		this.addFilter('u_nameexist', ft.NUMBER);
		this.addFilter('u_username', ft.NUMBER);

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
		};
	}

	get(filters, fieldSet = Account.prototype.FIELD_SET_SIMPLE, options = {}) {
		const queryOptions = Object.assign({}, options, { expectedResult: 1 });
		const parsedFilters = this.parseFilters(filters);

		const params = Object.assign({}, this.defaultOptions, filters, {
			parsedFilters,
		});

		return this.adapter.executeFile(
			{
				[Account.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
				[Account.prototype.FIELD_SET_FULL]: this.SQLs.selectFull,
			}[fieldSet],
			params,
			queryOptions
		);
	}

	getAll(filters, fieldSet = Account.prototype.FIELD_SET_SIMPLE, options = {}) {
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
			}[fieldSet],
			params
		);
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
