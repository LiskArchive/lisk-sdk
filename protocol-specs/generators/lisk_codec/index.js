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
	cartSampleEncodingsTestCases,
	cartSampleDecodingsTestCases,
	validPeerInfoEncodingsTestCases,
	validPeerInfoDecodingsTestCases,
	validNestedArrayEncodingsTestCases,
	validNestedArrayDecodingsTestCases,
} = require('./types_generators');

const generateTestSuite = (data, handler, encodingTestCases, decodingTestCases) => [
	() => ({
		...data,
		title: `Encoding ${data.title}`,
		config: {
			network: 'devnet',
		},
		runner: 'lisk_codec',
		handler: `${handler}_encodings`,
		testCases: encodingTestCases,
	}),
	() => ({
		...data,
		title: `Decoding ${data.title}`,
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
			title: 'for number types supported by lisk-codec',
			summary: 'Examples of encoding numbers with lisk-codec',
		},
		'number',
		validNumberEncodingsTestCases,
		validNumberDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for boolean types supported by lisk-codec',
			summary: 'Examples of encoding booleans with lisk-codec',
		},
		'boolean',
		validBooleanEncodingsTestCases,
		validBooleanDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for string types supported by lisk-codec',
			summary: 'Examples of encoding strings with lisk-codec',
		},
		'string',
		validStringsEncodingTestCases,
		validStringsDecodingTestCases,
	),
	...generateTestSuite(
		{
			title: 'for bytes types supported by lisk-codec',
			summary: 'Examples of encoding bytes with lisk-codec',
		},
		'bytes',
		validBytesEncodingsTestCases,
		validBytesDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for objects types supported by lisk-codec',
			summary: 'Examples of encoding objects with lisk-codec',
		},
		'objects',
		validObjectEncodingsTestCases,
		validObjectDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for arrays types supported by lisk-codec',
			summary: 'Examples of encoding arrays with lisk-codec',
		},
		'arrays',
		validArrayEncodingsTestCases,
		validArrayDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for block types supported by lisk-codec',
			summary: 'Examples of encoding block with lisk-codec',
		},
		'block',
		validBlockEncodingsTestCases,
		validBlockDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for genesis block types supported by lisk-codec',
			summary: 'Examples of encoding block with lisk-codec',
		},
		'genesis_block',
		validGenesisBlockAssetEncodingsTestCases,
		validGenesisBlockAssetDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for block header types supported by lisk-codec',
			summary: 'Examples of encoding block header with lisk-codec',
		},
		'block_header',
		validBlockHeaderEncodingsTestCases,
		validBlockHeaderDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for block asset types supported by lisk-codec',
			summary: 'Examples of encoding block asset with lisk-codec',
		},
		'block_asset',
		validBlockAssetEncodingsTestCases,
		validBlockAssetDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for account types supported by lisk-codec',
			summary: 'Examples of encoding account with lisk-codec',
		},
		'account',
		validAccountEncodingTestCases,
		validAccountDecodingTestCases,
	),
	...generateTestSuite(
		{
			title: 'for transaction types supported by lisk-codec',
			summary: 'Examples of encoding transaction with lisk-codec',
		},
		'transaction',
		validTransactionEncodingsTestCases,
		validTransactionDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for a complex object',
			summary: 'Example of encoding a complex object that might exist in custom apps',
		},
		'cart_sample',
		cartSampleEncodingsTestCases,
		cartSampleDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for a peer info object',
			summary: 'Example of encoding a peer info object for p2p',
		},
		'peer_info_sample',
		validPeerInfoEncodingsTestCases,
		validPeerInfoDecodingsTestCases,
	),
	...generateTestSuite(
		{
			title: 'for a nested array',
			summary: 'Example of encoding a nested array',
		},
		'nested_array',
		validNestedArrayEncodingsTestCases,
		validNestedArrayDecodingsTestCases,
	),
]);
