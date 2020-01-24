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
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { NUMBER, TEXT },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'temp_block/create.sql',
	delete: 'temp_block/delete.sql',
	get: 'temp_block/get.sql',
	truncate: 'temp_block/truncate.sql',
	isEmpty: 'temp_block/isEmpty.sql',
};

class TempBlock extends BaseEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: TEXT });
		this.addField('height', 'number', { filter: NUMBER });
		this.addField('fullBlock', 'string');

		this.extendDefaultOptions({ sort: '' });

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('temp_block', sqlFiles, this.sqlDirectory);
	}

	// eslint-disable-next-line no-unused-vars
	create({ height, id, fullBlock }, _options = {}, tx = null) {
		assert(height && Number.isInteger(height), 'height must be a number');
		assert(id && typeof id === 'string', 'id must be a string');
		assert(fullBlock instanceof Object, 'block must be an object');

		const attributes = Object.keys(this.fields);
		const fields = Object.keys(this.fields)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		const values = [{ height, id, fullBlock: JSON.stringify(fullBlock) }];
		const createSet = this.getValuesSet(values, attributes);

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
		);
	}

	async get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	async getOne(filters = {}, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const { limit, offset, sort } = { ...this.defaultOptions, ...options };
		const parsedSort = this.parseSort(sort);

		const params = {
			limit,
			offset,
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

	delete(filters, _options, tx = null) {
		this.validateFilters(filters);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.delete,
				{ parsedFilters },
				{ expectedResultCount: 0 },
				tx,
			)
			.then(result => result);
	}

	truncate(tx = null) {
		return this.adapter.executeFile(
			this.SQLs.truncate,
			{},
			{ expectedResultCount: 0 },
			tx,
		);
	}

	isEmpty(tx = null) {
		return this.adapter
			.executeFile(this.SQLs.isEmpty, {}, {}, tx)
			.then(([result]) => (result ? result.bool : true));
	}
}

module.exports = TempBlock;
