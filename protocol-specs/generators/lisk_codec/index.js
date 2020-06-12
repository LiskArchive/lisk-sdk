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

const blockEncodingsSuite = () => ({
	title: 'Encondings for block types supported by lisk-codec',
	summary: 'Examples of encoding block with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'block_encodings',
	testCases: [...typesGenerators.generateValidBlock()],
});

const blockHeaderEncodingsSuite = () => ({
	title: 'Encondings for block header types supported by lisk-codec',
	summary: 'Examples of encoding block header with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'block_header_encodings',
	testCases: [...typesGenerators.generateValidBlockHeader()],
});

const blockAssetEncodingsSuite = () => ({
	title: 'Encondings for block asset types supported by lisk-codec',
	summary: 'Examples of encoding block asset with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'block_asset_encodings',
	testCases: [...typesGenerators.generateValidBlockAsset()],
});

const accountEncodingsSuite = () => ({
	title: 'Encondings for account types supported by lisk-codec',
	summary: 'Examples of encoding account with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'account_encodings',
	testCases: [...typesGenerators.generateValidAccount()],
});

const transactionEncodingsSuite = () => ({
	title: 'Encondings for transaction types supported by lisk-codec',
	summary: 'Examples of encoding transaction with lisk-codec',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'transaction_encodings',
	testCases: [...typesGenerators.generateValidTransaction()],
});

const cartSampleEncodingSuite = () => ({
	title: 'Encondings for a complex object',
	summary:
		'Example of encoding a complex object that might exist in custom apps',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'cart_sample_encoding',
	testCases: [...typesGenerators.generateCartEncodings()],
});

const peerInfoSampleEncodingSuite = () => ({
	title: 'Encondings for a peer info object',
	summary:
		'Example of encoding a peer info object for p2p',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'peer_info_sample_encoding',
	testCases: [...typesGenerators.generatePeerInfoEncodings()],
});

const nestedArrayEncodingSuite = () => ({
	title: 'Encondings for a nested array',
	summary:
		'Example of encoding a nested array',
	config: {
		network: 'devnet',
	},
	runner: 'lisk_codec',
	handler: 'nested_array_encoding',
	testCases: [...typesGenerators.generateNestedArrayEncodings()],
});

module.exports = BaseGenerator.runGenerator('lisk_codec', [
	numberEncodingsSuite,
	booleanEncodingsSuite,
	stringEncodingsSuite,
	bytesEncodingsSuite,
	objectEncodingsSuite,
	arrayEncodingsSuite,
	blockEncodingsSuite,
	blockHeaderEncodingsSuite,
	blockAssetEncodingsSuite,
	accountEncodingsSuite,
	transactionEncodingsSuite,
	cartSampleEncodingSuite,
	peerInfoSampleEncodingSuite,
	nestedArrayEncodingSuite,
]);
