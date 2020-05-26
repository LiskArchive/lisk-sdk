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

const numberEncodingsSuite = () => ({
	title: 'Encondings for number types supported by lisk-codec',
	summary: 'Examples of encoding numbers with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'number_encodings',
	testCases: [...typesGenerators.generateValidNumberEncodings()],
});

const booleanEncodingsSuite = () => ({
	title: 'Encondings for boolean types supported by lisk-codec',
	summary: 'Examples of encoding booleans with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'boolean_encodings',
	testCases: [...typesGenerators.generateValidBooleanEncodings()],
});

const stringEncodingsSuite = () => ({
	title: 'Encondings for string types supported by lisk-codec',
	summary: 'Examples of encoding strings with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'string_encodings',
	testCases: [...typesGenerators.generateValidStringEncodings()],
});

const bytesEncodingsSuite = () => ({
	title: 'Encondings for bytes types supported by lisk-codec',
	summary: 'Examples of encoding bytes with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'bytes_encodings',
	testCases: [...typesGenerators.generateValidBytesEncodings()],
});

const objectEncodingsSuite = () => ({
	title: 'Encondings for objects types supported by lisk-codec',
	summary: 'Examples of encoding objects with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'objects_encodings',
	testCases: [...typesGenerators.generateValidObjectEncodings()],
});

const arrayEncodingsSuite = () => ({
	title: 'Encondings for arrays types supported by lisk-codec',
	summary: 'Examples of encoding arrays with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'arrays_encodings',
	testCases: [...typesGenerators.generateValidArrayEncodings()],
});

module.exports = BaseGenerator.runGenerator('lisk_codec', [
	numberEncodingsSuite,
	booleanEncodingsSuite,
	stringEncodingsSuite,
	bytesEncodingsSuite,
	objectEncodingsSuite,
	arrayEncodingsSuite,
]);
