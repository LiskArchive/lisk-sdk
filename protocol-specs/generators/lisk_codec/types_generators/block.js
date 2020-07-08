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
	$id: 'blockSchema',
	type: 'object',
	properties: {
		header: { dataType: 'bytes', fieldNumber: 1 },
		payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
	},
	required: ['header', 'payload'],
};

const generateValidBlockEncodings = () => {
	const input = {
		validBlock1: {
			object: {
				header: Buffer.from(
					'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
					'hex',
				),
				payload: [
					Buffer.from('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'hex'),
					Buffer.from('68a751863fe73b8ede8d832be628ff680d617fa15c74d00142f9025d5f37dd50', 'hex'),
				],
			},
			schema: blockSchema,
		},
		validBlock2: {
			object: {
				header: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				payload: [],
			},
			schema: blockSchema,
		},
	};

	const validBlock1Encoded = Block.encode(input.validBlock1.object).finish();
	const validBlock2Encoded = Block.encode(input.validBlock2.object).finish();

	return [
		{
			description: 'Encoding of valid block with payload',
			input: input.validBlock1,
			output: { value: validBlock1Encoded.toString('hex') },
		},
		{
			description: 'Encoding of valid block block without payload',
			input: input.validBlock2,
			output: { value: validBlock2Encoded.toString('hex') },
		},
	];
};

module.exports = generateValidBlockEncodings;
