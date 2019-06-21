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
		filterTypes: { BOOLEAN },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	upsert: 'chain_meta/upsert.sql',
	get: 'chain_meta/get.sql',
	delete: 'chain_meta/delete.sql',
};

/**
 * ChainMeta
 * @typedef {Object} ChainMeta
 * @property {string} key
 * @property {string} value
 */

/**
 * ChainMeta Filters
 * @typedef {Object} filters.ChainMeta
 * @property {string} [key]
 * @property {string} [key_eql]
 * @property {string} [key_ne]
 */

class ChainMeta extends BaseEntity {
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('key', 'string', { filter: BOOLEAN });
		this.addField('value', 'string');

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');
		this.SQLs = this.loadSQLFiles('chain_meta', sqlFiles, this.sqlDirectory);
	}

	/**
	 * Get list of meta information
	 *
	 * @param {filters.ChainMeta|filters.ChainMeta[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<ChainMeta[], Error>}
	 */
	get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Get list of meta information
	 *
	 * @param {filters.ChainMeta|filters.ChainMeta[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<ChainMeta, Error>}
	 */
	getOne(filters = {}, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Fetch the key value or resolve to null
	 *
	 * @param {string} key - Key to fetch
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise<{key: string, value: string} | null>}
	 */
	async getKey(key, tx) {
		assert(key, 'Must provide the key to get');

		return this.get({ key }, {}, tx).then(data => {
			if (data.length === 0) {
				return null;
			}

			return data[0].value;
		});
	}

	/**
	 * Update or create the key value pair
	 *
	 * @param {string} key
	 * @param {string} value
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<null, Error>}
	 */
	async setKey(key, value, tx) {
		assert(key, 'Must provide the key to set');
		assert(value, 'Must provide the value to set');

		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.upsert,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}

	/**
	 * Delete the keys with following conditions
	 *
	 * @param {filters.ChainMeta} filters
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
}

module.exports = ChainMeta;
