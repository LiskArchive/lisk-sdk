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

const allTestCases = [
	...typesGenerators.generateValidNumberEncodings(),
	...typesGenerators.generateValidBooleanEncodings(),
	...typesGenerators.generateValidStringEncodings(),
	...typesGenerators.generateValidBytesEncodings(),
	...typesGenerators.generateValidObjectEncodings(),
	...typesGenerators.generateValidArrayEncodings(),
];

const encodingsSuite = () => ({
	title: 'Encondings for types supported by lisk-codec',
	summary: 'Examples of encoding all the types supported by lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'validEncodings',
	testCases: allTestCases,
});

module.exports = BaseGenerator.runGenerator('lisk_codec', [encodingsSuite]);
