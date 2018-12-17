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
const filterType = require('../utils/filter_types');
const { stringToByte } = require('../utils/inputSerializers');
const { NonSupportedFilterTypeError } = require('../errors');
const BaseEntity = require('./base_entity');

const defaultCreateValues = {};

const readOnlyFields = [];

/**
 * Basic Peer
 * @typedef {Object} BasicPeer
 * @property {number} id
 * @property {inet} ip
 * @property {number} wsPort
 * @property {number} state
 * @property {string} os
 * @property {string} version
 * @property {number} clock
 * @property {string} broadhash
 * @property {number} height
 */

/**
 * Peer Filters
 * @typedef {Object} filters.Peer
 */

/**
 * @typedef {string} fieldSets.Peer
 * @enum
 * @value 'FIELD_SET_SIMPLE'
 */

const FIELD_SET_SIMPLE = Symbol('FIELD_SET_SIMPLE');

class Peer extends BaseEntity {
	/**
	 * Constructor
	 * @param {filters.Peer} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.overrideDefaultOptions({ fieldSet: FIELD_SET_SIMPLE });

		this.addField('id', 'number', {
			format: 'number',
			filter: filterType.NUMBER,
		});
		this.addField('ip', 'string', { format: 'ip', filter: filterType.TEXT });
		this.addField('wsPort', 'number', {
			format: 'number',
			filter: filterType.NUMBER,
		});
		this.addField('state', 'number', {
			format: 'number',
			filter: filterType.NUMBER,
		});
		this.addField('os', 'string', {
			format: 'string',
			filter: filterType.TEXT,
		});
		this.addField('version', 'string', {
			format: 'string',
			filter: filterType.TEXT,
		});
		this.addField('clock', 'number', {
			format: 'number',
			filter: filterType.NUMBER,
		});
		this.addField(
			'broadhash',
			'string',
			{ format: 'string', filter: filterType.TEXT },
			stringToByte
		);
		this.addField('height', 'number', {
			format: 'number',
			filter: filterType.NUMBER,
		});

		this.SQLs = {
			selectSimple: this.adapter.loadSQLFile('peers/get_simple.sql'),
			create: this.adapter.loadSQLFile('peers/create.sql'),
			update: this.adapter.loadSQLFile('peers/update.sql'),
			updateOne: this.adapter.loadSQLFile('peers/update_one.sql'),
			isPersisted: this.adapter.loadSQLFile('peers/is_persisted.sql'),
		};
	}

	// eslint-disable-next-line class-methods-use-this
	get FIELD_SET_SIMPLE() {
		return FIELD_SET_SIMPLE;
	}

	/**
	 * Get one peer
	 *
	 * @param {filters.Peer|filters.Peer[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {fieldSets.Peer} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicPeer|ExtendedPeer, Error>}
	 */
	getOne(filters, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{
				parsedFilters,
			}
		);

		return this.adapter.executeFile(
			{
				[Peer.prototype.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
			}[parsedOptions.fieldSet],
			params,
			{ expectedResult: 1 },
			tx
		);
	}

	/**
	 * Get list of peers
	 *
	 * @param {filters.Peer|filters.Peer[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {fieldSets.Peer} [options.fieldSet='FIELD_SET_SIMPLE'] - Fieldset to choose
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<BasicPeer[]|ExtendedPeer[], Error>}
	 */
	get(filters = {}, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'fieldSet']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'fieldSet'])
		);

		const params = Object.assign(
			{},
			{ limit: parsedOptions.limit, offset: parsedOptions.offset },
			{ parsedFilters }
		);

		return this.adapter.executeFile(
			{
				[this.FIELD_SET_SIMPLE]: this.SQLs.selectSimple,
			}[parsedOptions.fieldSet],
			params,
			{},
			tx
		);
	}

	/**
	 * Create peer object
	 *
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line no-unused-vars
	create(data, options = {}, tx) {
		const objectData = _.defaults(data, defaultCreateValues);
		const createSet = this.getValuesSet(objectData);
		const attributes = Object.keys(data)
			.map(k => `"${this.fields[k].fieldName}"`)
			.join(',');

		return this.adapter.executeFile(
			this.SQLs.create,
			{ createSet, attributes },
			{},
			tx
		);
	}

	/**
	 * Update the records based on given condition
	 *
	 * @param {filters.Peer} [filters]
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line no-unused-vars
	update(filters, data, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);
		const objectData = _.omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = Object.assign(objectData, {
			parsedFilters,
			updateSet,
		});

		return this.adapter.executeFile(this.SQLs.update, params, {}, tx);
	}

	/**
	 * Update one record based on the condition given
	 *
	 * @param {filters.Peer} filters
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} tx - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line no-unused-vars
	updateOne(filters, data, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);
		const objectData = _.omit(data, readOnlyFields);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);
		const updateSet = this.getUpdateSet(objectData);

		const params = Object.assign(objectData, {
			parsedFilters,
			updateSet,
		});

		return this.adapter.executeFile(this.SQLs.updateOne, params, {}, tx);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Peer} filters
	 * @param {Object} [options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	// eslint-disable-next-line no-unused-vars
	isPersisted(filters, options = {}, tx) {
		this.validateFilters(filters);
		this.validateOptions(options);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		if (parsedFilters === '') {
			throw new NonSupportedFilterTypeError(
				'Please provide some filters to check.',
				filters
			);
		}

		return this.adapter
			.executeFile(this.SQLs.isPersisted, { parsedFilters }, {}, tx)
			.then(result => result[0].exists);
	}

	getFieldSets() {
		return [this.FIELD_SET_SIMPLE];
	}

	/**
	 * Merge multiple filters together
	 * @param {Array.<Object>|Object} filters
	 * @return {*}
	 */
	mergeFilters(filters) {
		const mergedFilters = filters;

		if (Array.isArray(mergedFilters)) {
			const lastIndex = mergedFilters.length - 1;
			mergedFilters[lastIndex] = Object.assign(
				{},
				mergedFilters[lastIndex],
				this.defaultFilters
			);
			return mergedFilters;
		}
		return Object.assign({}, mergedFilters, this.defaultFilters);
	}
}

module.exports = Peer;
