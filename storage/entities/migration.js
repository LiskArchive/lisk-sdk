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

const { defaults, pick } = require('lodash');
const filterType = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

/**
 * Migration
 * @typedef {Object} Migration
 * @property {number} id
 * @property {string} name
 */

/**
 * Migration Filters
 * @typedef {Object} filters.Migration
 * @property {number} [id]
 * @property {number} [id_eql]
 * @property {number} [id_ne]
 * @property {number} [id_gt]
 * @property {number} [id_gte]
 * @property {number} [id_lt]
 * @property {number} [id_lte]
 * @property {number} [id_in]
 * @property {string} [name]
 * @property {string} [name_eql]
 * @property {string} [name_ne]
 * @property {string} [name_in]
 * @property {string} [name_like]
 */

class Migration extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Migration} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', { filter: filterType.TEXT });
		this.addField('name', 'string', { filter: filterType.TEXT });

		const defaultSort = { sort: 'id:asc' };
		this.extendDefaultOptions(defaultSort);

		this.SQLs = {
			select: this.adapter.loadSQLFile('migrations/get.sql'),
			isPersisted: this.adapter.loadSQLFile('migrations/is_persisted.sql'),
		};
	}

	/**
	 * Get one Migration
	 *
	 * @param {filters.Migration|filters.Migration[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Migration, Error>}
	 */
	getOne(filters, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of Migrations
	 *
	 * @param {filters.Migration|filters.Migration[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Migration[], Error>}
	 */
	get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
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
			this.SQLs.select,
			params,
			{ expectedResultCount },
			tx
		);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Migration} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx = null) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.isPersisted,
				{ parsedFilters },
				{ expectedResultCount: 1 },
				tx
			)
			.then(result => result.exists);
	}
}

module.exports = Migration;
