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

const protobuf = require('protobufjs');

const prepareProtobuffersBlock = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/block.proto');

const { BlockAsset } = prepareProtobuffersBlock();

const blockAssetSchema = {
	$id: '/blockAssetSchema',
	type: 'object',
	properties: {
		maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
		maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
		seedReveal: { dataType: 'bytes', fieldNumber: 3 },
	},
	required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
};

const validBlockAsset1 = {
	maxHeightPreviouslyForged: 1049,
	maxHeightPrevoted: 901049,
	seedReveal: Buffer.from('d59386e0ae435e292fbe0ebcdb954b75', 'hex'),
};

const validBlockAsset2 = {
	maxHeightPreviouslyForged: 0,
	maxHeightPrevoted: 1049,
	seedReveal: Buffer.from('eaaf9d4c65cb501c811ef812847a5551', 'hex'),
};

const validBlockAsset1Encoded = BlockAsset.encode(validBlockAsset1).finish();
const validBlockAsset2Encoded = BlockAsset.encode(validBlockAsset2).finish();

module.exports = {
	validBlockAssetEncodingsTestCases: [
		{
			description: 'Encoding of valid block asset',
			input: { object: validBlockAsset1, schema: blockAssetSchema },
			output: { value: validBlockAsset1Encoded },
		},
		{
			description: 'Encoding of valid block asset with zero previously forged',
			input: { object: validBlockAsset2, schema: blockAssetSchema },
			output: { value: validBlockAsset2Encoded },
		},
	],

	validBlockAssetDecodingsTestCases: [
		{
			description: 'Decoding of valid block asset',
			input: { value: validBlockAsset1Encoded, schema: blockAssetSchema },
			output: { object: validBlockAsset1 },
		},
		{
			description: 'Decoding of valid block asset with zero previously forged',
			input: { value: validBlockAsset2Encoded, schema: blockAssetSchema },
			output: { object: validBlockAsset2 },
		},
	],
};
