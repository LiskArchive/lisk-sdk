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
const mocha = require('mocha');
const coMocha = require('co-mocha');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const supertest = require('supertest');
const _ = require('lodash');
const validator = require('../../src/controller/helpers/validator');
const constantsSchema = require('../../src/controller/schema/constants');
const applicationSchema = require('../../src/controller/schema/application');
const chainModuleSchema = require('../../src/modules/chain/defaults/config');
const apiModuleSchema = require('../../src/modules/http_api/defaults/config');

const packageJson = require('../../../package.json');
const netConfig = require('../../../config/devnet/config');
const constants = require('../../../config/devnet/constants');
const exceptions = require('../../../config/devnet/exceptions');
const genesisBlock = require('../../../config/devnet/genesis_block');

validator.loadSchema(constantsSchema);
validator.loadSchema(applicationSchema);

const config = {
	...netConfig,
	version: packageJson.version,
	minVersion: packageJson.lisk.minVersion,
	protocolVersion: packageJson.lisk.protocolVersion,
};
config.constants = validator.validateWithDefaults(
	constantsSchema.constants,
	constants
);

// TODO: This should be removed after https://github.com/LiskHQ/lisk/pull/2980
global.constants = config.constants;

config.genesisBlock = validator.validateWithDefaults(
	applicationSchema.genesisBlock,
	genesisBlock
);
config.nethash = config.genesisBlock.payloadHash;

config.modules.chain = validator.validateWithDefaults(
	chainModuleSchema,
	Object.assign({}, config.modules.chain, { exceptions })
);
config.modules.chain = {
	...config.modules.chain,
	constants: config.constants,
	genesisBlock: config.genesisBlock,
	version: config.version,
	minVersion: config.minVersion,
	protocolVersion: config.protocolVersion,
};

config.modules.http_api = validator.validateWithDefaults(
	apiModuleSchema,
	config.modules.http_api
);
config.modules.http_api = {
	...config.modules.http_api,
	constants: config.constants,
	genesisBlock: config.genesisBlock,
	version: config.version,
	minVersion: config.minVersion,
};

coMocha(mocha);

process.env.NODE_ENV = 'test';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const testContext = {};

if (process.env.SILENT === 'true') {
	testContext.debug = function() {};
} else {
	testContext.debug = console.info;
}

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
testContext.consoleLogLevel =
	process.env.LOG_LEVEL || testContext.config.components.logger.consoleLogLevel;

testContext.baseUrl = `http://${testContext.config.modules.http_api.address}:${
	testContext.config.modules.http_api.httpPort
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

				// If second element is empty pull it upward
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
testContext.config.constants = _.cloneDeep(testContext.config.constants);
global.expect = chai.expect;
global.sinonSandbox = sinon.createSandbox();
global.__testContext = testContext;
global.constants = testContext.config.constants;
global.exceptions = testContext.config.modules.chain.exceptions;
global._ = _;
