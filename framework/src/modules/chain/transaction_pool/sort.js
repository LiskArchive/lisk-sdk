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

/**
 * Validates sort options, methods and fields.
 *
 * @param {string|Object} sort
 * @param {Object} [options]
 * @param {string} options.fieldPrefix
 * @param {string} options.sortField
 * @param {string} options.sortMethod - asc / desc
 * @param {Array} options.sortFields
 * @returns {Object} {error} | {sortField, sortMethod}
 * @todo Add description for the params
 */
// eslint-disable-next-line class-methods-use-this
const sortBy = (sort, options) => {
	options = typeof options === 'object' ? options : {};
	options.sortField = options.sortField || null;
	options.sortMethod = options.sortMethod || null;
	options.sortFields = Array.isArray(options.sortFields)
		? options.sortFields
		: [];

	if (typeof options.quoteField === 'undefined') {
		options.quoteField = true;
	} else {
		options.quoteField = Boolean(options.quoteField);
	}

	let sortField;
	let sortMethod;

	if (typeof sort === 'string') {
		const [field, order] = sort.split(':');
		sortField = field.replace(/[^\w\s]/gi, '');
		sortMethod = order === 'desc' ? 'DESC' : 'ASC';
	} else if (typeof sort === 'object') {
		const keys = Object.keys(sort);

		if (keys.length === 0) {
			return sortBy('');
		}
		if (keys.length === 1) {
			return sortBy(
				`${keys[0]}:${sort[keys[0]] === -1 ? 'desc' : 'asc'}`,
				options,
			);
		}
		const sortFields = [];
		const sortMethods = [];
		keys.forEach(key => {
			const sortResult = sortBy(
				`${key}:${sort[key] === -1 ? 'desc' : 'asc'}`,
				options,
			);
			sortFields.push(sortResult.sortField);
			sortMethods.push(sortResult.sortMethod);
		});
		return { sortField: sortFields, sortMethod: sortMethods };
	}
	/**
	 * Description of the function.
	 *
	 * @private
	 * @todo Add param-tag and descriptions
	 * @todo Add @returns tag
	 * @todo Add description for the function
	 */
	function prefixField(prefixSortedField) {
		if (!prefixSortedField) {
			return prefixSortedField;
		}
		if (typeof options.fieldPrefix === 'string') {
			return options.fieldPrefix + prefixSortedField;
		}
		if (typeof options.fieldPrefix === 'function') {
			return options.fieldPrefix(prefixSortedField);
		}
		return prefixSortedField;
	}

	/**
	 * Description of the function.
	 *
	 * @private
	 * @todo Add param-tag and descriptions
	 * @todo Add @returns tag
	 * @todo Add description for the function
	 */
	function quoteField(quoteSortedField) {
		if (quoteSortedField && options.quoteField) {
			return `"${sortField}"`;
		}
		return quoteSortedField;
	}

	const emptyWhiteList = options.sortFields.length === 0;

	const inWhiteList =
		options.sortFields.length >= 1 &&
		options.sortFields.indexOf(sortField) > -1;

	if (sortField) {
		if (emptyWhiteList || inWhiteList) {
			sortField = prefixField(sortField);
		} else {
			return {
				error: 'Invalid sort field',
			};
		}
	} else {
		sortField = prefixField(options.sortField);
	}

	if (!sortMethod) {
		({ sortMethod } = options);
	}

	return {
		sortField: quoteField(sortField) || '',
		sortMethod: sortField ? sortMethod : '',
	};
};

/**
 * @todo Add description for the params
 */
const sort = () => {};

module.exports = {
	sort,
	sortBy,
};
