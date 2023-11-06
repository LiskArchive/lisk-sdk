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

const { Block } = prepareProtobuffersBlock();

const blockSchema = {
	$id: '/blockSchema',
	type: 'object',
	properties: {
		header: { dataType: 'bytes', fieldNumber: 1 },
		payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
	},
	required: ['header', 'payload'],
};

const validBlock1 = {
	header: Buffer.from('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'hex'),
	payload: [
		Buffer.from('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'hex'),
		Buffer.from('68a751863fe73b8ede8d832be628ff680d617fa15c74d00142f9025d5f37dd50', 'hex'),
	],
};

const validBlock2 = {
	header: Buffer.from('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'hex'),
	payload: [],
};

const validBlock1Encoded = Block.encode(validBlock1).finish();
const validBlock2Encoded = Block.encode(validBlock2).finish();

module.exports = {
	validBlockEncodingsTestCases: [
		{
			description: 'Encoding of valid block with payload',
			input: { object: validBlock1, schema: blockSchema },
			output: { value: validBlock1Encoded },
		},
		{
			description: 'Encoding of valid block block without payload',
			input: { object: validBlock2, schema: blockSchema },
			output: { value: validBlock2Encoded },
		},
	],

	validBlockDecodingsTestCases: [
		{
			description: 'Decoding of valid block with payload',
			input: { value: validBlock1Encoded, schema: blockSchema },
			output: { object: validBlock1 },
		},
		{
			description: 'Decoding of valid block block without payload',
			input: { value: validBlock2Encoded, schema: blockSchema },
			output: { object: validBlock2 },
		},
	],
};
