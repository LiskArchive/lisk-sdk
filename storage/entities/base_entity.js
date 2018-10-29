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

const assert = require('assert');
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
	 * @param {String} fieldSet - Field sets defining collection of fields to get
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

	addField(fieldName, filterType = filterTypes.NUMBER, fieldSets = []) {
		assert(fieldSets, 'Must provide array of field sets');

		// eslint-disable-next-line no-return-assign
		fieldSets.forEach(fs => (this.fields[fs] = this.fields[fs] || []));
		// eslint-disable-next-line no-return-assign
		fieldSets.forEach(fs => this.fields[fs].push(fieldName));

		/* eslint-disable no-useless-escape */
		switch (filterType) {
			case filterTypes.BOOLEAN:
				this.filters[fieldName] = `"${fieldName}" = $\{${fieldName}\}`;
				this.filters[
					`${fieldName}_ne`
				] = `"${fieldName}" <> $\{${fieldName}_ne\}`;
				break;

			case filterTypes.TEXT:
				this.filters[fieldName] = `"${fieldName}" = $\{${fieldName}\}`;
				this.filters[
					`${fieldName}_ne`
				] = `"${fieldName}" <> $\{${fieldName}_ne\}`;
				this.filters[
					`${fieldName}_in`
				] = `"${fieldName}" IN ($\{${fieldName}_in:csv\})`;
				this.filters[
					`${fieldName}_like`
				] = `"${fieldName}" LIKE $\{${fieldName}_like\}`;
				break;

			case filterTypes.NUMBER:
				this.filters[fieldName] = `"${fieldName}" = $\{${fieldName}\}`;
				this.filters[
					`${fieldName}_gt`
				] = `"${fieldName}" > $\{${fieldName}_gt\}`;
				this.filters[
					`${fieldName}_gte`
				] = `"${fieldName}" >= $\{${fieldName}_gte\}`;
				this.filters[
					`${fieldName}_lt`
				] = `"${fieldName}" < $\{${fieldName}_lt\}`;
				this.filters[
					`${fieldName}_lte`
				] = `"${fieldName}" <= $\{${fieldName}_lte\}`;
				this.filters[
					`${fieldName}_ne`
				] = `"${fieldName}" <> $\{${fieldName}_ne\}`;
				this.filters[
					`${fieldName}_in`
				] = `"${fieldName}" IN ($\{${fieldName}_in:csv)\}`;
				break;

			case filterTypes.BINARY:
				this.filters[
					`${fieldName}_like`
				] = `"${fieldName}" = DECODE($\{${fieldName}_like:val\}, 'hex')"`;
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
