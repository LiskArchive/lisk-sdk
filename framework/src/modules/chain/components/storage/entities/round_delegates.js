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
		filterTypes: { NUMBER },
	},
} = require('../../../../../components/storage');

const sqlFiles = {
	create: 'round_delegates/create.sql',
	delete: 'round_delegates/delete.sql',
	get: 'round_delegates/get.sql',
	getActiveDelegatesForRound: 'round_delegates/get_round_delegates.sql',
};

/**
 * Round
 * @typedef {Object} Round
 * @property {string} address
 * @property {number} amount
 * @property {string} delegate
 * @property {number} round
 */

/**
 * Round Filters
 * @typedef {Object} filters.Round
 * @property {number} [round]
 * @property {number} [round_eql]
 * @property {number} [round_ne]
 * @property {number} [round_gt]
 * @property {number} [round_gte]
 * @property {number} [round_lt]
 * @property {number} [round_lte]
 * @property {number} [round_in]
 * @property {json} [delegatePublicKeys]
 */

class RoundDelegates extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrieve the data from
	 * @param {filters.Round} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('delegatePublicKeys', 'string');
		this.addField('round', 'number', { filter: NUMBER });

		this.extendDefaultOptions({ sort: '' });

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('dpos', sqlFiles, this.sqlDirectory);
	}

	/**
	 * @returns {string[]} delegatePublicKeys
	 */
	async getActiveDelegatesForRound(round, tx) {
		const [result] = await this.adapter.executeFile(
			this.SQLs.getActiveDelegatesForRound,
			{
				round,
			},
			{},
			tx,
		);
		/**
		 * The query above returns delegatePublicKeys for the round.
		 * But it returns them in following format: [{ delegatePublicKeys: [] }]
		 * That's why if that record does not exist, we return an empty array.
		 */
		return result ? result.delegatePublicKeys : [];
	}

	/**
	 * Create round object
	 *
	 * @param {Object} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {null}
	 */
	// eslint-disable-next-line no-unused-vars
	create({ round, delegatePublicKeys }, _options = {}, tx = null) {
		assert(round && Number.isInteger(round), 'Round must be a number');
		assert(
			Array.isArray(delegatePublicKeys),
			'delegatePublicKeys must be an array of strings',
		);

		const attributes = Object.keys(this.fields);
		const fields = Object.keys(this.fields)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		const values = [
			{ round, delegatePublicKeys: JSON.stringify(delegatePublicKeys) },
		];
		const createSet = this.getValuesSet(values, attributes);

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, fields },
			{ expectedResultCount: 0 },
			tx,
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
				tx,
			)
			.then(result => result);
	}

	/**
	 * Get a list of RoundDelegates entries
	 * @param {filters.RoundDelegates|filters.RoundDelegates[]} filters
	 * @param {Object} [options]
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Transaction object
	 * @return {Promise} Promise object which represents the response returned from the database
	 */
	async get(filters = {}, options = {}, tx = null) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Get one entry of RoundDelegates
	 * @param {filters.RoundDelegates|filters.RoundDelegates[]} filters
	 * @param {Object} [options]
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Transaction object
	 * @return {Promise} Promise object which represents the response returned from the database
	 */
	async getOne(filters = {}, options = {}, tx = null) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of RoundDelegates
	 *
	 * @param {filters.RoundDelegates|filters.RoundDelegates[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<RoundDelegates[], Error>}
	 */
	_getResults(filters, options, tx, expectedResultCount) {
		this.validateFilters(filters);
		this.validateOptions(options);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const { limit, offset, sort } = {
			...this.defaultOptions,
			...options,
		};
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
}

module.exports = RoundDelegates;
