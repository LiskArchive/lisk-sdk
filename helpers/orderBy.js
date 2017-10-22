'use strict';

/**
 * Validates sort options, methods and fields.
 * @memberof module:helpers
 * @function
 * @param {Array} orderBy
 * @param {Object} options
 * @param {string} options.fieldPrefix
 * @param {string} options.sortField
 * @param {string} options.sortMethod - asc / desc
 * @param {Array} options.sortFields
 * @return {Object} error | {sortField, sortMethod}.
 */
function OrderBy (orderBy, options) {
	options = (typeof options === 'object') ? options : {};
	options.sortField  = options.sortField  || null;
	options.sortMethod = options.sortMethod || null;
	options.sortFields = Array.isArray(options.sortFields) ? options.sortFields : [];

	if (typeof options.quoteField === 'undefined') {
		options.quoteField = true;
	} else {
		options.quoteField = Boolean(options.quoteField);
	}

	var sortField, sortMethod;

	if (orderBy) {
		var sort = String(orderBy).split(':');
		sortField = sort[0].replace(/[^\w\s]/gi, '');

		if (sort.length === 2) {
			sortMethod = sort[1] === 'desc' ? 'DESC' : 'ASC';
		}
	}

	function prefixField (sortField) {
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

	function quoteField (sortField) {
		if (sortField && options.quoteField) {
			return ('"' + sortField + '"');
		} else {
			return sortField;
		}
	}

	var emptyWhiteList = options.sortFields.length === 0;

	var inWhiteList = options.sortFields.length >= 1 && options.sortFields.indexOf(sortField) > -1;

	if (sortField) {
		if (emptyWhiteList || inWhiteList) {
			sortField = prefixField(sortField);
		} else {
			return {
				error: 'Invalid sort field'
			};
		}
	} else {
		sortField = prefixField(options.sortField);
	}

	if (!sortMethod) {
		sortMethod = options.sortMethod;
	}

	return {
		sortField: quoteField(sortField),
		sortMethod: sortMethod
	};
}

/**
 * Converts orderBy queries from string format like "field:asc"
 * to format accepted by "json-sql" library: {field: 1}.
 * Ascending sort method number equivalent is 1.
 * Descending sort method number equivalent is -1.
 * If only field is specified in sortQuery, sortOrder will be ascending.
 * @param {string} sortQuery - sortField|sortField:sortOrder
 * @param {Array} sortableFields
 * @returns {Object}[={}] returns {} if incorrect format of sortQuery given or if field
 */
OrderBy.sortQueryToJsonSqlFormat = function (sortQuery, sortableFields) {
	if (sortableFields.indexOf(sortQuery) !== -1) {
		sortQuery = sortQuery + ':asc';
	}
	var sortQueryMatched = typeof sortQuery !== 'string' ? null : sortQuery.match(/^([a-zA-Z0-9]+):(asc|desc)$/);
	if (!sortQueryMatched || sortableFields.indexOf(sortQueryMatched[1]) === -1) {
		return {};
	}
	var sortField = sortQueryMatched[1];
	var sortMethodsToNumbersMap = {
		asc: 1,
		desc: -1
	};
	var result = {};
	var sortMethod = sortQueryMatched[2];
	result[sortField] = sortMethodsToNumbersMap[sortMethod];
	return result;
};

module.exports = OrderBy;
