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
	get: 'accounts/get.sql',
	count: 'accounts/count.sql',
	isPersisted: 'accounts/is_persisted.sql',
};

class Account extends BaseEntity {
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
		this.addField('voteWeight', 'string', { filter: ft.NUMBER });
		this.addField('asset', 'string');
		this.addField('votedDelegatesPublicKeys', 'string');
		this.addField('membersPublicKeys', 'string');

		this.addFilter('votedDelegatesPublicKeys', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				'mem_accounts."votedDelegatesPublicKeys" @> ${votedDelegatesPublicKeys}',
		});

		this.addFilter('membersPublicKeys', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				'mem_accounts."membersPublicKeys" @> ${membersPublicKeys}',
		});

		this.addFilter('asset_contains', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				"asset @> '${asset_contains:value}'::jsonb",
		});

		this.addFilter('asset_exists', ft.CUSTOM, {
			condition:
				// eslint-disable-next-line no-template-curly-in-string
				"asset ? '${asset_exists:value}'",
		});

		const defaultSort = { sort: 'balance:asc' };
		this.extendDefaultOptions(defaultSort);
		this.sortingFields.push('productivity');

		this.SQLs = this.loadSQLFiles('account', sqlFiles);
	}

	// eslint-disable-next-line class-methods-use-this
	create() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	updateOne() {
		throw new NonSupportedOperationError();
	}

	// eslint-disable-next-line class-methods-use-this
	delete() {
		throw new NonSupportedOperationError();
	}

	getOne(filters, options = {}, tx) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	get(filters = {}, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	count(filters = {}) {
		this.validateFilters(filters);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const expectedResultCount = 1;

		return this.adapter
			.executeFile(this.SQLs.count, { parsedFilters }, { expectedResultCount })
			.then(result => +result.count);
	}

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
			this.SQLs.get,
			params,
			{ expectedResultCount },
			tx,
		);
	}
}

module.exports = Account;
