/*
 * Copyright © 2020 Lisk Foundation
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

const BaseGenerator = require('../base_generator');
const typesGenerators = require('./types_generators');

const generateValidNumberEncodings = () =>
	typesGenerators.generateValidNumberEncodings();

const generateValidBooleanEncodings = () =>
	typesGenerators.generateValidBooleanEncodings();

const generateValidStringEncodings = () =>
	typesGenerators.generateValidStringEncodings();

const generateValidBytesEncodings = () =>
	typesGenerators.generateValidBytesEncodings();

const generateValidObjectEncodings = () =>
	typesGenerators.generateValidObjectEncodings();

const generateValidArrayEncodings = () =>
	typesGenerators.generateValidArrayEncodings();

const validNumberEncodingsSuite = () => ({
	title: 'Valid number encodings',
	summary: 'Examples of encoding numbers as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validNumberEncodings',
	testCases: [generateValidNumberEncodings()],
});

const validBooleanEncodingsSuite = () => ({
	title: 'Valid boolean encodings',
	summary: 'Examples of encoding booleans as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validBooleanEncodings',
	testCases: [generateValidBooleanEncodings()],
});

const validStringEncodingsSuite = () => ({
	title: 'Valid string encodings',
	summary: 'Examples of encoding strings as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validStringEncodings',
	testCases: [generateValidStringEncodings()],
});

const validBytesEncodingsSuite = () => ({
	title: 'Valid bytes encodings',
	summary: 'Examples of encoding bytes as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validBytesEncodings',
	testCases: [generateValidBytesEncodings()],
});

const validObjectEncodingsSuite = () => ({
	title: 'Valid object encodings',
	summary: 'Examples of encoding objects as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validObjectEncodings',
	testCases: [generateValidObjectEncodings()],
});

const validArrayEncodingsSuite = () => ({
	title: 'Valid array encodings',
	summary: 'Examples of encoding arrays as required by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validArrayEncodings',
	testCases: [generateValidArrayEncodings()],
});

module.exports = BaseGenerator.runGenerator('lisk_codec', [
	validNumberEncodingsSuite,
	validBooleanEncodingsSuite,
	validStringEncodingsSuite,
	validBytesEncodingsSuite,
	validObjectEncodingsSuite,
	validArrayEncodingsSuite,
]);
