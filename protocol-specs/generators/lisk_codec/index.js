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
const {
	validNumberEncodingsTestCases,
	validNumberDecodingsTestCases,
	validBooleanEncodingsTestCases,
	validBooleanDecodingsTestCases,
	validStringsEncodingTestCases,
	validStringsDecodingTestCases,
	validBytesEncodingsTestCases,
	validBytesDecodingsTestCases,
	validObjectEncodingsTestCases,
	validObjectDecodingsTestCases,
	validArrayEncodingsTestCases,
	validArrayDecodingsTestCases,
	validBlockEncodingsTestCases,
	validBlockDecodingsTestCases,
	validGenesisBlockAssetEncodingsTestCases,
	validGenesisBlockAssetDecodingsTestCases,
	validBlockHeaderEncodingsTestCases,
	validBlockHeaderDecodingsTestCases,
	validBlockAssetEncodingsTestCases,
	validBlockAssetDecodingsTestCases,
	validAccountEncodingTestCases,
	validAccountDecodingTestCases,
	validTransactionEncodingsTestCases,
	validTransactionDecodingsTestCases,
	cartEncodingsTestCases,
	cartDecodingsTestCases,
	validPeerInfoEncodingsTestCases,
	validPeerInfoDecodingsTestCases,
	validNestedArrayEncodingsTestCases,
	validNestedArrayDecodingsTestCases,
} = require('./types_generators');

const generateTestSuite = (data, handler, encodingTestCases, decodingTestCases) => [
	() => ({
		...data,
		config: {
			network: 'devnet',
		},
		runner: 'lisk_codec',
		handler: `${handler}_encodings`,
		testCases: encodingTestCases,
	}),
	() => ({
		...data,
		config: {
			network: 'devnet',
		},
		runner: 'lisk_codec',
		handler: `${handler}_decodings`,
		testCases: decodingTestCases,
	}),
];

module.exports = BaseGenerator.runGenerator('lisk_codec', [
	...generateTestSuite(
		{
			title: 'Encondings for number types supported by lisk-codec',
			summary: 'Examples of encoding numbers with lisk-codec',
		},
		'number',
		validNumberEncodingsTestCases,
		validNumberDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for boolean types supported by lisk-codec',
			summary: 'Examples of encoding booleans with lisk-codec',
		},
		'boolean',
		validBooleanEncodingsTestCases,
		validBooleanDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for string types supported by lisk-codec',
			summary: 'Examples of encoding strings with lisk-codec',
		},
		'string',
		validStringsEncodingTestCases,
		validStringsDecodingTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for bytes types supported by lisk-codec',
			summary: 'Examples of encoding bytes with lisk-codec',
		},
		'bytes',
		validBytesEncodingsTestCases,
		validBytesDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for objects types supported by lisk-codec',
			summary: 'Examples of encoding objects with lisk-codec',
		},
		'objects',
		validObjectEncodingsTestCases,
		validObjectDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for arrays types supported by lisk-codec',
			summary: 'Examples of encoding arrays with lisk-codec',
		},
		'arrays',
		validArrayEncodingsTestCases,
		validArrayDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for block types supported by lisk-codec',
			summary: 'Examples of encoding block with lisk-codec',
		},
		'block',
		validBlockEncodingsTestCases,
		validBlockDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for genesis block types supported by lisk-codec',
			summary: 'Examples of encoding block with lisk-codec',
		},
		'genesis_block',
		validGenesisBlockAssetEncodingsTestCases,
		validGenesisBlockAssetDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for block header types supported by lisk-codec',
			summary: 'Examples of encoding block header with lisk-codec',
		},
		'block_header',
		validBlockHeaderEncodingsTestCases,
		validBlockHeaderDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for block asset types supported by lisk-codec',
			summary: 'Examples of encoding block asset with lisk-codec',
		},
		'block_asset',
		validBlockAssetEncodingsTestCases,
		validBlockAssetDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for account types supported by lisk-codec',
			summary: 'Examples of encoding account with lisk-codec',
		},
		'account',
		validAccountEncodingTestCases,
		validAccountDecodingTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for transaction types supported by lisk-codec',
			summary: 'Examples of encoding transaction with lisk-codec',
		},
		'transaction',
		validTransactionEncodingsTestCases,
		validTransactionDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for a complex object',
			summary: 'Example of encoding a complex object that might exist in custom apps',
		},
		'cart_sample',
		cartEncodingsTestCases,
		cartDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for a peer info object',
			summary: 'Example of encoding a peer info object for p2p',
		},
		'peer_info_sample',
		validPeerInfoEncodingsTestCases,
		validPeerInfoDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'Encondings for a nested array',
			summary: 'Example of encoding a nested array',
		},
		'nested_array',
		validNestedArrayEncodingsTestCases,
		validNestedArrayDecodingsTestCases,
	),
]);
