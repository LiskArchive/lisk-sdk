'use strict';

require('colors');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var supertest = require('supertest');
process.env.NODE_ENV = 'test';

// Root object
var testSuite = {};

testSuite.config = require('./data/config.json');
testSuite.config.root = process.cwd();

// Optional logging
if (process.env.SILENT === 'true') {
	testSuite.debug = function () { };
} else {
	testSuite.debug = console.log;
}

// Node configuration
testSuite.baseUrl = 'http://' + testSuite.config.address + ':' + testSuite.config.httpPort;
testSuite.api = supertest(testSuite.baseUrl);

// Custom lodash mixin
testSuite._ = require('lodash');

testSuite._.mixin({
	/**
	 * Lodash mixin to sort collection case-insensitively.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	dbSort: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return testSuite._.clone(arr).sort(function (a, b) {
			// If first element is empty push it downard
			if (!testSuite._.isEmpty(a) && testSuite._.isEmpty(b)) { return sortFactor * -1; }

			// If second element is empty pull it upward
			if (testSuite._.isEmpty(a) && !testSuite._.isEmpty(b)) { return sortFactor * 1; }

			// If both are empty keep same order
			if (testSuite._.isEmpty(a) && testSuite._.isEmpty(b)) { return sortFactor * 0; }

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
		var indices = testSuite._.compact(arr.map(function (data, index) {
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

// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: chai.should() });
global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;
global.sinonChai = sinonChai;
global.sandbox = sinon.sandbox.create();
global.supertest = supertest;
global.testSuite = testSuite;
