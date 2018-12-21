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

const {
	ImplementationPendingError,
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../errors');
const { isSortOptionValid, parseSortString } = require('../utils/sort_option');
const filterTypes = require('../utils/filter_types');
const Field = require('../utils/field');
const { filterGenerator } = require('../utils/filters');

class BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.BaseEntity} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		this.adapter = adapter;
		this.fields = {};
		this.filters = {};
		this.defaultFilters = defaultFilters;
		this.defaultOptions = {
			limit: 10,
			offset: 0,
			extended: false,
		};
	}

	/**
	 * Get one object from persistence layer
	 *
	 * @param {string | Object} filters - Multiple filters or just primary key
	 * @param {Object} options - Extended options
	 * @param {Object} tx - transaction object
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	getOne(filters, options, tx) {
		throw new ImplementationPendingError();
	}

	/**
	 * Get multiple objects from persistence layer
	 *
	 * @param {string | Object} filters - Multiple filters or just primary key
	 * @param {Object} options - Extended options
	 * @param {Object} tx - transaction object
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	get(filters, options, tx) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	count(filters) {
		throw new ImplementationPendingError();
	}

	/**
	 * Create an object and store it
	 *
	 * @param {Object} data - Data for the object
	 * @param {Object} options - Extended options
	 * @param {Object} tx - transaction object
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	create(data, options, tx) {
		throw new ImplementationPendingError();
	}

	/**
	 * Update already persisted object
	 *
	 * @param {string | Object} filters - Multiple filters or just primary key
	 * @param {Object} data - Data for the object
	 * @param {Object} options - Extended options
	 * @param {Object} tx - transaction object
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	update(filters, data, options, tx) {
		throw new ImplementationPendingError();
	}

	/**
	 * Update already persisted object
	 *
	 * @param {string | Object} filters - Multiple filters or just primary key
	 * @param {Object} data - Data for the object
	 * @param {Object} options - Extended options
	 * @param {Object} tx - transaction object
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	updateOne(filters, data, options, tx) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	isPersisted() {
		throw new ImplementationPendingError();
	}

	getFilters() {
		return Object.keys(this.filters);
	}

	/**
	 * Update the default options to be used in all methods
	 *
	 * @param {Object} options - Options object
	 */
	extendDefaultOptions(options) {
		this.defaultOptions = { ...this.defaultOptions, ...options };
	}

	/**
	 * Add a field for manipulation
	 *
	 * @param {string} name - Name of the field
	 * @param {string} type - JSON-Schema type
	 * @param {Object} [options={}]
	 * @param {string} [options.fieldName] - Real name of the field
	 * @param {string} [options.filter] - Filter type
	 * @param {string} [options.filterCondition] - Filter condition
	 * @param {string} [options.format] - JSON-Schema format for provided type
	 * @param {*} [options.default] - Default value for insertion
	 * @param {function} [writer] - Writer encode writing logic
	 */
	addField(name, type, options, writer) {
		// TODO: The dynamic generated json-schema should be implemented for validation

		this.fields[name] = new Field(name, type, options, writer);

		this.filters = {
			...this.filters,
			...this.fields[name].getFilters(),
		};
	}

	getUpdateSet(data) {
		return this.adapter.parseQueryComponent(
			Object.keys(data)
				.map(key => {
					const field = this.fields[key];
					return `"${field.fieldName}" = ${field.serializeValue(
						data[key],
						'update'
					)}`;
				})
				.join(','),
			data
		);
	}

	getValuesSet(data) {
		return `(${this.adapter.parseQueryComponent(
			Object.keys(data)
				.map(key => this.fields[key].serializeValue(data[key], 'insert'))
				.join(','),
			data
		)})`;
	}

	/**
	 * Begin a database transaction
	 *
	 * @param {string} transactionName - Name of the transaction
	 * @param {function} cb - Callback function transaction
	 * @param {Object} options
	 * @param {Boolean} options.noTransaction - Don't use begin/commit block
	 * @param {Object} tx - A parent transaction object
	 * @return {*}
	 */
	begin(transactionName, cb, options = {}, tx) {
		return options.noTransaction
			? this.adapter.task(transactionName, cb, tx)
			: this.adapter.transaction(transactionName, cb, tx);
	}

	/**
	 * Setup the filters for getters
	 *
	 * @param {string} filterName
	 * @param {string} filterType
	 * @param {Object} options
	 * @param {string} [options.fieldName] - Actual name of the field
	 * @param {string} [options.condition] - custom condition in case of CUSTOM filter type
	 * @param {Function} [options.inputSerializer] - Method to serialize the value to SQL
	 */
	addFilter(filterName, filterType = filterTypes.NUMBER, options = {}) {
		// TODO: The dynamic generated json-schema for filters should be implemented for validation

		this.filters = {
			...this.filters,
			...filterGenerator(
				filterType,
				filterName,
				options.fieldName || filterName,
				options.inputSerializer,
				options.condition
			),
		};
	}

	/**
	 * Validate allowed filters
	 * @param {Array.<Object>|Object} filters
	 * @param {Boolean} atLeastOneRequired
	 * @return {true, NonSupportedFilterTypeError>}
	 */
	validateFilters(filters = {}, atLeastOneRequired = false) {
		if (atLeastOneRequired && (!filters || !Object.keys(filters).length)) {
			throw new NonSupportedFilterTypeError(
				'One or more filters are required for this operation.'
			);
		}

		let flattenedFilters = [];
		let invalidFilters = [];

		if (Array.isArray(filters)) {
			flattenedFilters = filters.reduce(
				(acc, curr) => ({ ...acc, ...curr }),
				{}
			);
		} else {
			flattenedFilters = filters;
		}

		invalidFilters = Object.keys(flattenedFilters).filter(
			item => !this.getFilters().includes(item)
		);

		if (invalidFilters.length) {
			throw new NonSupportedFilterTypeError(
				'One or more filters are not supported.',
				invalidFilters
			);
		}

		return true;
	}

	/**
	 * Validate allowed options
	 * @param {Object} options
	 * @param {Boolean} atLeastOneRequired
	 * @return {true, NonSupportedFilterTypeError>}
	 */
	validateOptions(options = {}, atLeastOneRequired = false) {
		if (atLeastOneRequired && (!options || !Object.keys(options).length)) {
			throw new NonSupportedOptionError(
				'One or more options are required for this operation.'
			);
		}

		const invalidOptions = Object.keys(options).filter(
			item => !(item in this.defaultOptions)
		);

		if (invalidOptions.length) {
			throw new NonSupportedOptionError(
				'One or more options are not supported.',
				invalidOptions
			);
		}

		if (!isSortOptionValid(options.sort, Object.keys(this.fields))) {
			throw new NonSupportedOptionError('Invalid sort option.', options.sort);
		}

		return true;
	}

	parseFilters(filters) {
		let filterString = null;

		const parseFilterObject = object =>
			Object.keys(object)
				.map(key => this.filters[key])
				.join(' AND ');

		if (Array.isArray(filters)) {
			filterString = filters
				.map(filterObject => parseFilterObject(filterObject))
				.join(' OR ');
		} else if (typeof filters === 'object') {
			filterString = parseFilterObject(filters);
		}

		const filtersObject = Array.isArray(filters)
			? filters.reduce((acc, curr) => ({ ...acc, ...curr }), {})
			: filters;

		if (filterString) {
			return `WHERE ${this.adapter.parseQueryComponent(
				filterString,
				filtersObject
			)}`;
		}

		return '';
	}

	/**
	 * Merge multiple filters together
	 * @param {Array.<Object>|Object} filters
	 * @return {*}
	 */
	mergeFilters(filters) {
		if (Array.isArray(filters)) {
			return filters.map(item => ({ ...item, ...this.defaultFilters }));
		}
		return { ...filters, ...this.defaultFilters };
	}

	/**
	 * Parse sort option
	 * @param {Array.<String>|String} sortOption
	 * @return {string}
	 */
	parseSort(sortOption = this.defaultOptions.sort) {
		const sortString = Array.isArray(sortOption)
			? sortOption.map(parseSortString).join(', ')
			: parseSortString(sortOption);

		if (sortString) {
			return `ORDER BY ${sortString}`;
		}

		return '';
	}
}

module.exports = BaseEntity;
