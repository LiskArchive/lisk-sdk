'use strict';

// Root object
var test = {};

test._ = require('lodash');
test.supertest = require('supertest');

test.config = require('./data/config.json');

// Optional logging
if (process.env.SILENT === 'true') {
	test.debug = function () { };
} else {
	test.debug = console.log;
}

// Node configuration
test.baseUrl = 'http://' + test.config.address + ':' + test.config.httpPort;
test.api = test.supertest(test.baseUrl);

test._.mixin({
	/**
	 * Lodash mixin to sort collection case-insensitively.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	dbSort: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return test._.clone(arr).sort(function (a, b) {
			// If first element is empty push it downard
			if (!test._.isEmpty(a) && test._.isEmpty(b)) { return sortFactor * -1; }

			// If second element is empty pull it upward
			if (test._.isEmpty(a) && !test._.isEmpty(b)) { return sortFactor * 1; }

			// If both are empty keep same order
			if (test._.isEmpty(a) && test._.isEmpty(b)) { return sortFactor * 0; }

			// Convert to lower case and remove special characters
			var s1lower = a.toLowerCase().replace(/[^a-z0-9]/g, '');
			var s2lower = b.toLowerCase().replace(/[^a-z0-9]/g, '');

			return s1lower.localeCompare(s2lower) * sortFactor;
		});
	},

	/**
	 * Lodash mixin to check occurrence of a value in end of of array.
	 * @param {Array} arr - Array to be checked.
	 * @param {*} valueCheck - Value to check for.
	 * @return {boolean}
	 */
	appearsInLast: function (arr, valueCheck) {
		// Get list of indexes of desired value
		var indices = test._.compact(arr.map(function (data, index) {
			if (data === valueCheck) { return index; }
		}));

		// If last occurrence appears at the end of array
		if (indices[indices.length - 1] === arr.length - 1 &&
			// If first and last occurrence appears without any gaps
			indices.length === (indices[indices.length - 1] - indices[0] + 1)) {
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Lodash mixin to sort integer array correctly. Node default sort method sort them by ASCII codes.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	sortNumbers: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return arr.sort(function (a, b) {
			return (a - b) * sortFactor;
		});
	}
}, { chain: false });


// Exports
module.exports = test;