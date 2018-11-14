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
const {
	ImplementationPendingError,
	NonSupportedFilterTypeError,
} = require('../errors');
const filterTypes = require('./filter_types');

class BaseEntity {
	constructor() {
		this.defaultFieldSet = null;
		this.fields = {};
		this.filters = {};
	}

	/**
	 * Get one object from persistence layer
	 *
	 * @param {String | Object} filters - Multiple filters or just primary key
	 * @param {string} fieldSet - Field sets defining collection of fields to get
	 * @param {Object} options - Extended options
	 *
	 * @return {Promise}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	get(filters, fieldSet, options) {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	getAll() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	count() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	create() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	update() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	save() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	isPersisted() {
		throw new ImplementationPendingError();
	}

	/**
	 * Returns the available fields sets
	 * @return Array
	 */
	// eslint-disable-next-line class-methods-use-this
	getFieldSets() {
		throw new ImplementationPendingError();
	}

	getFilters() {
		return Object.keys(this.filters);
	}

	/**
	 * Add a field for manipulation
	 *
	 * @param {string} name - Name of the field
	 * @param {string} type - JSON-Schema type
	 * @param {Object} [options={}]
	 * @param {string} [options.realName] - Real name of the field
	 * @param {string} [options.filter] - Filter type
	 * @param {string} [options.filterCondition] - Filter condition
	 * @param {string} [options.format] - JSON-Schema format for provided type
	 * @param {*} [options.default] - Default value for insertion
	 * @param {function} [writer] - Writer encode writing logic
	 */
	addField(name, type, options, writer) {
		// TODO: The dynamic generated json-schema should be implemented for validation

		this.fields[name] = {
			type,
			realName: options.realName || name,
			writer:
				writer ||
				((value, mode, name, realName) => `"${realName}" = $\{${name}}`),
		};

		if (options.filter) {
			this.addFilter(
				name,
				options.filter,
				_.pick(
					{
						realName: options.realName,
						condition: options.filterCondition,
					},
					_.identity
				)
			);
		}
	}

	getUpdateSet(data) {
		return this.adapter.parseQueryComponent(
			Object.keys(data)
				.map(key =>
					this.fields[key].writer.call(
						null,
						data[key],
						'update',
						key,
						this.fields[key].realName
					)
				)
				.join(','),
			data
		);
	}

	getValuesSet(data) {
		return this.adapter.parseQueryComponent(
			Object.keys(data)
				.map(key => {
					this.fields[key].writer.call(
						null,
						data[key],
						'insert',
						key,
						this.fields[key].realName
					);
				})
				.join(','),
			data
		);
	}

	/**
	 * Setup the filters for getters
	 *
	 * @param {string} filterName
	 * @param {string} filterType
	 * @param {Object} options
	 * @param {string} [options.realName] - Actual name of the field
	 * @param {string} [options.condition] - custom condition in case of CUSTOM filter type
	 */
	addFilter(filterName, filterType = filterTypes.NUMBER, options = {}) {
		// TODO: The dynamic generated json-schema for filters should be implemented for validation

		const fieldName = options.realName || filterName;

		const setFilter = (filterAlias, condition) => {
			this.filters[filterAlias] = condition;
		};

		/* eslint-disable no-useless-escape */
		switch (filterType) {
			case filterTypes.BOOLEAN:
				setFilter(filterName, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_eql`, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_neql`, `"${fieldName}" <> $\{${filterName}\}`);
				break;

			case filterTypes.TEXT:
				setFilter(filterName, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_eql`, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_neql`, `"${fieldName}" <> $\{${filterName}\}`);
				setFilter(
					`${filterName}_in`,
					`"${filterName}" IN ($\{${filterName}_in:csv\})`
				);
				setFilter(
					`${filterName}_like`,
					`"${filterName}" LIKE $\{${filterName}_like\}`
				);
				break;

			case filterTypes.NUMBER:
				setFilter(filterName, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_eql`, `"${fieldName}" = $\{${filterName}\}`);
				setFilter(`${filterName}_neql`, `"${fieldName}" <> $\{${filterName}\}`);
				setFilter(`${filterName}_gt`, `"${fieldName}" > $\{${filterName}\}`);
				setFilter(`${filterName}_gte`, `"${fieldName}" >= $\{${filterName}\}`);
				setFilter(`${filterName}_lt`, `"${fieldName}" < $\{${filterName}\}`);
				setFilter(`${filterName}_lte`, `"${fieldName}" <= $\{${filterName}\}`);
				setFilter(
					`${filterName}_in`,
					`"${filterName}" IN ($\{${filterName}_in:csv\})`
				);
				break;

			case filterTypes.BINARY:
				setFilter(
					filterName,
					`"${fieldName}" = DECODE($\{${filterName}\}, 'hex')`
				);
				setFilter(
					`${filterName}_eql`,
					`"${fieldName}" = DECODE($\{${filterName}\}, 'hex')`
				);
				setFilter(
					`${filterName}_neql`,
					`"${fieldName}" <> DECODE($\{${filterName}\}, 'hex')`
				);
				break;

			case filterTypes.CUSTOM:
				setFilter(filterName, options.condition);
				break;

			default:
				throw new NonSupportedFilterTypeError(filterType);
		}
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

		if (filterString) {
			return `WHERE ${this.adapter.parseQueryComponent(filterString, filters)}`;
		}

		return '';
	}
}

module.exports = BaseEntity;
