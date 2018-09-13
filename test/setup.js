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
var mocha = require('mocha');
var coMocha = require('co-mocha');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var chaiAsPromised = require('chai-as-promised');
var supertest = require('supertest');
var _ = require('lodash');
var AppConfig = require('../helpers/config');
const packageJson = require('../package.json');
var Bignum = require('../helpers/bignum.js');

coMocha(mocha);

process.env.NODE_ENV = 'test';

chai.use(sinonChai);
chai.use(chaiAsPromised);

var testContext = {};

testContext.config = AppConfig(packageJson, false);

const genesisBlock = testContext.config.genesisBlock;

genesisBlock.totalAmount = new Bignum(genesisBlock.totalAmount);
genesisBlock.totalFee = new Bignum(genesisBlock.totalFee);
genesisBlock.reward = new Bignum(genesisBlock.reward);

testContext.config.genesisBlock = genesisBlock;

if (process.env.SILENT === 'true') {
	testContext.debug = function() {};
} else {
	testContext.debug = console.info;
}

if (process.env.LOG_DB_EVENTS === 'true') {
	testContext.config.db.logEvents = [
		'connect',
		'disconnect',
		'query',
		'task',
		'transact',
		'error',
	];
} else {
	testContext.config.db.logEvents = ['error'];
}

testContext.consoleLogLevel =
	process.env.LOG_LEVEL || testContext.consoleLogLevel;

testContext.baseUrl = `http://${testContext.config.address}:${
	testContext.config.httpPort
}`;
testContext.api = supertest(testContext.baseUrl);

_.mixin(
	{
		/**
		 * Lodash mixin to sort collection case-insensitively.
		 * @param {Array} arr - Array to be sorted.
		 * @param {string} [sortOrder=asc] - Sorting order asc|desc
		 * @return {*}
		 */
		dbSort(arr, sortOrder) {
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

				// Convert to lowercase and remove special characters
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
		appearsInLast(arr, valueCheck) {
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
			}
			return false;
		},

		/**
		 * Lodash mixin to sort integer array correctly. Node default sort method sort them by ASCII codes.
		 * @param {Array} arr - Array to be sorted.
		 * @param {string} [sortOrder=asc] - Sorting order asc|desc
		 * @return {*}
		 */
		sortNumbers(arr, sortOrder) {
			var sortFactor = sortOrder === 'desc' ? -1 : 1;

			return arr.sort((a, b) => {
				return (a - b) * sortFactor;
			});
		},
	},
	{ chain: false }
);

// Cloning the constants object to remove immutability
testContext.config.constants = _.cloneDeep(testContext.config.constants);
global.expect = chai.expect;
global.sinonSandbox = sinon.createSandbox();
global.__testContext = testContext;
global.constants = testContext.config.constants;
global.exceptions = testContext.config.exceptions;
global._ = _;
