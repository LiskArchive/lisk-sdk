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

require('colors');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var supertest = require('supertest');

process.env.NODE_ENV = 'test';

chai.use(sinonChai);

var testContext = {};

testContext.config = require('./data/config.json');
testContext.config.root = process.cwd();

if (process.env.SILENT === 'true') {
	testContext.debug = function() {};
} else {
	testContext.debug = console.log;
}

testContext.baseUrl = `http://${testContext.config.address}:${
	testContext.config.httpPort
}`;
testContext.api = supertest(testContext.baseUrl);

var _ = require('lodash');

_.mixin(
	{
		/**
		 * Lodash mixin to sort collection case-insensitively.
		 * @param {Array} arr - Array to be sorted.
		 * @param {string} [sortOrder=asc] - Sorting order asc|desc
		 * @return {*}
		 */
		dbSort: function(arr, sortOrder) {
			var sortFactor = sortOrder === 'desc' ? -1 : 1;

			return _.clone(arr).sort((a, b) => {
				// If first element is empty push it downard
				if (!_.isEmpty(a) && _.isEmpty(b)) {
					return sortFactor * -1;
				}

				// If second element is empty pull it upward
				if (_.isEmpty(a) && !_.isEmpty(b)) {
					return sortFactor * 1;
				}

				// If both are empty keep same order
				if (_.isEmpty(a) && _.isEmpty(b)) {
					return sortFactor * 0;
				}

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
		appearsInLast: function(arr, valueCheck) {
			// Get list of indexes of desired value
			var indices = _.compact(
				arr.map((data, index) => {
					if (data === valueCheck) {
						return index;
					}
				})
			);

			// If last occurrence appears at the end of array
			if (
				indices[indices.length - 1] === arr.length - 1 &&
				// If first and last occurrence appears without any gaps
				indices.length === indices[indices.length - 1] - indices[0] + 1
			) {
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
		sortNumbers: function(arr, sortOrder) {
			var sortFactor = sortOrder === 'desc' ? -1 : 1;

			return arr.sort((a, b) => {
				return (a - b) * sortFactor;
			});
		},
	},
	{ chain: false }
);

global.expect = chai.expect;
global.sinonSandbox = sinon.createSandbox();
global.__testContext = testContext;
global._ = _;
