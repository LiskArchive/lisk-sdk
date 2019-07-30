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
const { defaults, pick } = require('lodash');
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
};

/**
 * Block temp
 * @typedef {Object} temp_block
 * @property {string} id
 * @property {number} height
 * @property {object} fullBlock
 */

/**
 * Round Filters
 * @typedef {Object} filters.Round
 * @property {number} [id]
 * @property {string} [id_eql]
 * @property {string} [id_ne]
 * @property {string} [id_in]
 * @property {string} [id_like]
 * @property {number} [height]
 * @property {number} [height_eql]
 * @property {number} [height_ne]
 * @property {number} [height_gt]
 * @property {number} [height_gte]
 * @property {number} [height_lt]
 * @property {number} [height_lte]
 * @property {number} [height_in]
 */

class TempBlock extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Round} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: TEXT });
		this.addField('height', 'number', { filter: NUMBER });
		this.addField('fullBlock', 'string');

		this.extendDefaultOptions({ sort: '' });

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('temp_block', sqlFiles, this.sqlDirectory);
	}

	/**
	 * Create temp_block row entry
	 *
	 * @param {Object} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
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
			tx
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
		const parsedOptions = defaults(
			{},
			pick(options, ['limit', 'offset', 'sort']),
			pick(this.defaultOptions, ['limit', 'offset', 'sort'])
		);
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
			tx
		);
	}

	/**
	 * Delete records with following conditions
	 *
	 * @param {filters.Round} filters
	 * @param {Object} [options]
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
			.then(result => result);
	}
}

module.exports = TempBlock;
