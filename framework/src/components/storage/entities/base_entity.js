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

const debug = require('debug')('lisk:storage:base_entity');
const {
	ImplementationPendingError,
	NonSupportedFilterTypeError,
	NonSupportedOptionError,
} = require('../errors');
const { isSortOptionValid, parseSortString } = require('../utils/sort_option');
const filterTypes = require('../utils/filter_types');
const Field = require('../utils/field');
const { filterGenerator } = require('../utils/filters');
const { defaultInput } = require('../utils/input_serializers');

class BaseEntity {
	constructor(adapter, defaultFilters = {}) {
		this.adapter = adapter;
		this.fields = {};
		this.filters = {};
		this.defaultFilters = defaultFilters;
		this.defaultOptions = {
			limit: 10,
			offset: 0,
			sort: false,
			extended: false,
		};
		this.sortingFields = [];
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	getOne(filters, options, tx) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	get(filters, options, tx) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	count(filters) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	create(data, options, tx) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	update(filters, data, options, tx) {
		throw new ImplementationPendingError();
	}

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

	extendDefaultOptions(options) {
		this.defaultOptions = { ...this.defaultOptions, ...options };
	}

	addField(name, type, options, writer) {
		// TODO: The dynamic generated json-schema should be implemented for validation

		this.fields[name] = new Field(name, type, options, writer);
		this.sortingFields.push(name);
		this.filters = {
			...this.filters,
			...this.fields[name].getFilters(),
		};
	}

	getUpdateSet(data) {
		debug('started: getUpdateSet');
		return this.adapter.parseQueryComponent(
			Object.keys(data)
				.map(key => {
					debug('key %s', key);
					const field = this.fields[key];

					// To avoid any dynamic field which is not specified through field set
					if (!field) return '';

					return `"${field.fieldName}" = ${field.serializeValue(
						data[key],
						'update',
					)}`;
				})
				.filter(Boolean)
				.join(','),
			data,
		);
	}

	getValuesSet(data, attributes = undefined, options = {}) {
		if (Array.isArray(data)) {
			return data
				.map(d => this._getValueSetForObject(d, attributes, options))
				.join(',');
		}

		return this._getValueSetForObject(data, attributes);
	}

	loadSQLFiles(entityLabel, sqlFiles, sqlDirectory) {
		return this.adapter.loadSQLFiles(entityLabel, sqlFiles, sqlDirectory);
	}

	begin(transactionName, cb, options = {}, tx) {
		return options.noTransaction
			? this.adapter.task(transactionName, cb, tx)
			: this.adapter.transaction(transactionName, cb, tx);
	}

	addFilter(filterName, filterType = filterTypes.NUMBER, options = {}) {
		// TODO: The dynamic generated json-schema for filters should be implemented for validation

		this.filters = {
			...this.filters,
			...filterGenerator(
				filterType,
				filterName,
				options.fieldName || filterName,
				options.inputSerializer,
				options.condition,
			),
		};
	}

	validateFilters(filters = {}, atLeastOneRequired = false) {
		if (atLeastOneRequired && (!filters || !Object.keys(filters).length)) {
			throw new NonSupportedFilterTypeError(
				'One or more filters are required for this operation.',
			);
		}

		let flattenedFilters = [];
		let invalidFilters = [];

		if (Array.isArray(filters)) {
			flattenedFilters = filters.reduce(
				(acc, curr) => ({ ...acc, ...curr }),
				{},
			);
		} else {
			flattenedFilters = filters;
		}

		invalidFilters = Object.keys(flattenedFilters).filter(
			item => !this.getFilters().includes(item),
		);

		if (invalidFilters.length) {
			throw new NonSupportedFilterTypeError(
				'One or more filters are not supported.',
				invalidFilters,
			);
		}

		return true;
	}

	validateOptions(options = {}, atLeastOneRequired = false) {
		if (atLeastOneRequired && (!options || !Object.keys(options).length)) {
			throw new NonSupportedOptionError(
				'One or more options are required for this operation.',
			);
		}

		const invalidOptions = Object.keys(options).filter(
			item => !(item in this.defaultOptions),
		);

		if (invalidOptions.length) {
			throw new NonSupportedOptionError(
				'One or more options are not supported.',
				invalidOptions,
			);
		}

		if (!isSortOptionValid(options.sort, this.sortingFields)) {
			throw new NonSupportedOptionError('Invalid sort option.', options.sort);
		}

		return true;
	}

	parseFilters(filters, options = { filterPrefix: 'WHERE' }) {
		const parseFilterObject = object =>
			`(${Object.keys(object)
				.map(key => this.filters[key])
				.join(' AND ')})`;

		const subQueries = (Array.isArray(filters) ? filters : [filters]).reduce(
			(accQueries, filterObject) => {
				const filterString = parseFilterObject(filterObject);

				// TODO: refactor this logic
				if (filterString === '()') {
					return accQueries;
				}

				return [
					...accQueries,
					`${this.adapter.parseQueryComponent(filterString, filterObject)}`,
				];
			},
			[],
		);

		return subQueries.length === 0
			? ''
			: `${options.filterPrefix} ${subQueries.join(' OR ')}`;
	}

	mergeFilters(filters) {
		if (Array.isArray(filters)) {
			return filters.map(item => ({ ...item, ...this.defaultFilters }));
		}
		return { ...filters, ...this.defaultFilters };
	}

	_getValueSetForObject(data, attributes = undefined, options = {}) {
		return `(${this.adapter.parseQueryComponent(
			(attributes || Object.keys(data))
				.map(key => {
					if (options.useRawObject) {
						return defaultInput.call(this, data[key], 'insert', key, key);
					}
					return this.fields[key].serializeValue(data[key], 'insert');
				})
				.join(','),
			data,
		)})`;
	}

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
