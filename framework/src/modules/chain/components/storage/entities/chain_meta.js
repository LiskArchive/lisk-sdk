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
const { defaults, pick } = require('lodash');
const {
	entities: { BaseEntity },
	utils: {
		filterTypes: { BOOLEAN },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'chain_meta/create.sql',
	update: 'chain_meta/update.sql',
	upsert: 'chain_meta/upsert.sql',
	get: 'chain_meta/get.sql',
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
	 * Update the key value pair
	 *
	 * @param {Object} data
	 * @param {string} data.key
	 * @param {string} data.value
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<null, Error>}
	 */
	update({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.update,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}

	/**
	 * Create the key value pair
	 *
	 * @param {Object} data
	 * @param {string} data.key
	 * @param {string} data.value
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<null, Error>}
	 */
	create({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.create,
			{ key, value },
			{ expectedResultCount },
			tx
		);
	}

	/**
	 * Update or create the key value pair
	 *
	 * @param {Object} data
	 * @param {string} data.key
	 * @param {string} data.value
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<null, Error>}
	 */
	upsert({ key, value }, tx) {
		const expectedResultCount = 0;

		return this.adapter.executeFile(
			this.SQLs.upsert,
			{ key, value },
			{ expectedResultCount },
			tx
		);
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
	 * @return {Promise<{key: string, value: string} | {}>}
	 */
	fetch(key, tx) {
		return this.getOne({ key }, {}, tx)
			.then(data => data.value)
			.catch(error => {
				if (error.message === 'No data returned from the query.') {
					return null;
				}

				throw error;
			});
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
