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

/**
 * Validates sort options, methods and fields.
 * @memberof module:helpers
 * @function
 * @param {string|Object} sort
 * @param {Object} [options]
 * @param {string} options.fieldPrefix
 * @param {string} options.sortField
 * @param {string} options.sortMethod - asc / desc
 * @param {Array} options.sortFields
 * @return {Object} error | {sortField, sortMethod}.
 */
function sortBy(sort, options) {
	options = typeof options === 'object' ? options : {};
	options.sortField = options.sortField || null;
	options.sortMethod = options.sortMethod || null;
	options.sortFields = Array.isArray(options.sortFields)
		? options.sortFields
		: [];
	var self = this;

	if (typeof options.quoteField === 'undefined') {
		options.quoteField = true;
	} else {
		options.quoteField = Boolean(options.quoteField);
	}

	var sortField;
	var sortMethod;

	if (typeof sort === 'string') {
		var sortBy = String(sort).split(':');
		sortField = sortBy[0].replace(/[^\w\s]/gi, '');

		if (sortBy.length === 2) {
			sortMethod = sortBy[1] === 'desc' ? 'DESC' : 'ASC';
		} else {
			sortMethod = 'ASC';
		}
	} else if (typeof sort === 'object') {
		var keys = Object.keys(sort);

		if (keys.length === 0) {
			return self.sortBy('');
		} else if (keys.length === 1) {
			return self.sortBy(
				`${keys[0]}:${sort[keys[0]] === -1 ? 'desc' : 'asc'}`,
				options
			);
		} else {
			var sortFields = [];
			var sortMethods = [];
			keys.forEach(function(key) {
				var sortResult = self.sortBy(
					`${key}:${sort[key] === -1 ? 'desc' : 'asc'}`,
					options
				);
				sortFields.push(sortResult.sortField);
				sortMethods.push(sortResult.sortMethod);
			});
			return { sortField: sortFields, sortMethod: sortMethods };
		}
	}

	function prefixField(sortField) {
		if (!sortField) {
			return sortField;
		} else if (typeof options.fieldPrefix === 'string') {
			return options.fieldPrefix + sortField;
		} else if (typeof options.fieldPrefix === 'function') {
			return options.fieldPrefix(sortField);
		} else {
			return sortField;
		}
	}

	function quoteField(sortField) {
		if (sortField && options.quoteField) {
			return `"${sortField}"`;
		} else {
			return sortField;
		}
	}

	var emptyWhiteList = options.sortFields.length === 0;

	var inWhiteList =
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
		sortMethod = options.sortMethod;
	}

	return {
		sortField: quoteField(sortField) || '',
		sortMethod: sortField ? sortMethod : '',
	};
}

/**
 * Converts sortBy queries from string format like "field:asc"
 * to format accepted by "json-sql" library: {field: 1}.
 * Ascending sort method number equivalent is 1.
 * Descending sort method number equivalent is -1.
 * If only field is specified in sortQuery, sortOrder will be ascending.
 * @param {string} sortQuery - sortField|sortField:sortOrder
 * @param {Array} sortableFields
 * @returns {Object}[={}] returns {} if incorrect format of sortQuery given or if field
 */
function sortQueryToJsonSqlFormat(sortQuery, sortableFields) {
	if (sortableFields.indexOf(sortQuery) !== -1) {
		sortQuery += ':asc';
	}
	var sortQueryMatched =
		typeof sortQuery !== 'string'
			? null
			: sortQuery.match(/^([a-zA-Z0-9]+):(asc|desc)$/);
	if (!sortQueryMatched || sortableFields.indexOf(sortQueryMatched[1]) === -1) {
		return {};
	}
	var sortField = sortQueryMatched[1];
	var sortMethodsToNumbersMap = {
		asc: 1,
		desc: -1,
	};
	var result = {};
	var sortMethod = sortQueryMatched[2];
	result[sortField] = sortMethodsToNumbersMap[sortMethod];
	return result;
}

module.exports = {
	sortQueryToJsonSqlFormat: sortQueryToJsonSqlFormat,
	sortBy: sortBy,
};
