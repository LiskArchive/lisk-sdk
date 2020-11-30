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
	$id: 'blockAssetSchema',
	type: 'object',
	properties: {
		maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
		maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
		seedReveal: { dataType: 'bytes', fieldNumber: 3 },
	},
	required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
};

const generateValidBlockAssetEncodings = () => {
	const input = {
		validBlockAsset1: {
			object: {
				maxHeightPreviouslyForged: 1049,
				maxHeightPrevoted: 901049,
				seedReveal: Buffer.from('d59386e0ae435e292fbe0ebcdb954b75', 'hex'),
			},
			schema: blockAssetSchema,
		},
		validBlockAsset2: {
			object: {
				maxHeightPreviouslyForged: 0,
				maxHeightPrevoted: 1049,
				seedReveal: Buffer.from('eaaf9d4c65cb501c811ef812847a5551', 'hex'),
			},
			schema: blockAssetSchema,
		},
	};

	const validBlockAsset1Encoded = BlockAsset.encode(input.validBlockAsset1.object).finish();
	const validBlockAsset2Encoded = BlockAsset.encode(input.validBlockAsset2.object).finish();

	return [
		{
			description: 'Encoding of valid block asset',
			input: input.validBlockAsset1,
			output: { value: validBlockAsset1Encoded.toString('hex') },
		},
		{
			description: 'Encoding of valid block asset with zero previously forged',
			input: input.validBlockAsset2,
			output: { value: validBlockAsset2Encoded.toString('hex') },
		},
	];
};

module.exports = generateValidBlockAssetEncodings;
