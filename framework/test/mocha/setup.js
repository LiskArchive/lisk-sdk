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

require('colors');
const mocha = require('mocha');
const coMocha = require('co-mocha');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const supertest = require('supertest');
const _ = require('lodash');
const app = require('../test_app/app');

app._compileAndValidateConfigurations();

process.env.NODE_ENV = 'test';
coMocha(mocha);
chai.use(sinonChai);
chai.use(chaiAsPromised);

const testContext = {};

if (process.env.SILENT === 'true') {
	testContext.debug = function() {};
} else {
	testContext.debug = console.info;
}

const config = _.cloneDeep(app.config);

if (process.env.LOG_DB_EVENTS === 'true') {
	config.components.storage.logEvents = [
		'connect',
		'disconnect',
		'query',
		'task',
		'transact',
		'error',
	];
} else {
	config.components.storage.logEvents = ['error'];
}

testContext.config = config;
testContext.config.constants = _.cloneDeep(app.constants);
testContext.config.NORMALIZER = '100000000';
testContext.config.ADDITIONAL_DATA = {
	MIN_LENGTH: 1,
	MAX_LENGTH: 64,
};
testContext.config.MAX_VOTES_PER_TRANSACTION = 33;
testContext.config.MULTISIG_CONSTRAINTS = {
	MIN: {
		MINIMUM: 1,
		MAXIMUM: 15,
	},
	LIFETIME: {
		MINIMUM: 1,
		MAXIMUM: 72,
	},
	KEYSGROUP: {
		MIN_ITEMS: 1,
		MAX_ITEMS: 15,
	},
};

testContext.config.genesisBlock = _.cloneDeep(app.genesisBlock);
testContext.consoleLogLevel =
	process.env.LOG_LEVEL || config.components.logger.consoleLogLevel;

testContext.baseUrl = `http://${config.modules.http_api.address}:${
	config.modules.http_api.httpPort
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
			const sortFactor = sortOrder === 'desc' ? -1 : 1;

			return _.clone(arr).sort((a, b) => {
				// If first element is empty push it downard
				if (!_.isEmpty(a) && _.isEmpty(b)) {
					return sortFactor * -1;
				}

				// If second element is empty pull it upwardå
				if (_.isEmpty(a) && !_.isEmpty(b)) {
					return sortFactor * 1;
				}

				// If both are empty keep same order
				if (_.isEmpty(a) && _.isEmpty(b)) {
					return sortFactor * 0;
				}

				// Convert to lowercase and remove special characters
				const s1lower = a.toLowerCase().replace(/[^a-z0-9]/g, '');
				const s2lower = b.toLowerCase().replace(/[^a-z0-9]/g, '');

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
			const indices = _.compact(
				arr.filter(data => data === valueCheck).map((_data, index) => index)
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
			const sortFactor = sortOrder === 'desc' ? -1 : 1;

			return arr.sort((a, b) => (a - b) * sortFactor);
		},
	},
	{ chain: false }
);

// Cloning the constants object to remove immutability
global.expect = chai.expect;
global.sinonSandbox = sinon.createSandbox();
global.__testContext = testContext;
global.constants = _.cloneDeep(app.constants);
global.exceptions = _.cloneDeep(config.modules.chain.exceptions);
global._ = _;
