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
		const full = [this.FIELD_SET_FULL];
		const both = [this.FIELD_SET_SIMPLE, this.FIELD_SET_FULL];

		this.addField('address', ft.TEXT, both);
		this.addField('publicKey', ft.BINARY, both);
		this.addField('secondPublicKey', ft.BINARY, both);
		this.addField('username', ft.TEXT, both);
		this.addField('isDelegate', ft.NUMBER, both);
		this.addField('secondSignature', ft.NUMBER, both);
		this.addField('balance', ft.NUMBER, both);
		this.addField('multimin', ft.NUMBER, both);
		this.addField('multilifetime', ft.NUMBER, both);
		this.addField('nameexist', ft.BOOLEAN, both);
		this.addField('fees', ft.NUMBER, both);
		this.addField('rewards', ft.NUMBER, both);
		this.addField('producedBlocks', ft.NUMBER, both);
		this.addField('missedBlocks', ft.NUMBER, both);
		this.addField('rank', ft.NUMBER, both);

		this.addField('u_isDelegate', ft.BOOLEAN, full);
		this.addField('u_secondSignature', ft.BOOLEAN, full);
		this.addField('u_balance', ft.NUMBER, full);
		this.addField('u_multimin', ft.NUMBER, full);
		this.addField('u_multilifetime', ft.NUMBER, full);
		this.addField('u_nameexist', ft.NUMBER, full);
		this.addField('u_username', ft.NUMBER, full);
		this.addField('delegates', ft.TEXT, full);
		this.addField('u_delegates', ft.TEXT, full);
		this.addField('multisignatures', ft.TEXT, full);
		this.addField('u_multisignatures', ft.TEXT, full);

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('accounts/get_simple.sql'),
			selectFull: this.adapter.loadSQLFile('accounts/get_full.sql'),
		};
	}

	get(filters, fieldSet = Account.prototype.FIELD_SET_SIMPLE, options = {}) {
		const queryOptions = Object.assign({}, options, { expectedResult: 1 });
		const parsedFilters = this.parseFilters(filters);
		const params = Object.assign({}, { limit: 10, offset: 0 }, filters, {
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
			{
				limit: 10,
				offset: 0,
			},
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

module.exports = Account;
