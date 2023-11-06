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

const { BlockHeader } = prepareProtobuffersBlock();

const blockHeaderSchema = {
	$id: '/blockHeaderSchema',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
		generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: { dataType: 'bytes', fieldNumber: 8 },
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'transactionRoot',
		'generatorPublicKey',
		'reward',
		'asset',
	],
};

const validBlockHeader1 = {
	version: 1,
	timestamp: 1590557445,
	height: 12385603,
	previousBlockID: Buffer.from(
		'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
		'hex',
	),
	transactionRoot: Buffer.from(
		'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
		'hex',
	),
	generatorPublicKey: Buffer.from(
		'68a751863fe73b8ede8d832be628ff680d617fa15c74d00142f9025d5f37dd50',
		'hex',
	),
	reward: '400000000',
	asset: Buffer.from('d59386e0ae435e292fbe0ebcdb954b75ed5fb3922091277cb19f798fc5d50718', 'hex'),
	signature: Buffer.from(
		'8331b5123cac056e2ec8361c56e642db0ca0e13abe33696d23d4d00ad6de844919296e87abe8e172f67fd882b4c0b1c1804b7d9075ecf975cf2631d8d7efef0c',
		'hex',
	),
};

const validBlockHeader2 = {
	version: 3,
	timestamp: 1590557804,
	height: 901049,
	previousBlockID: Buffer.from(
		'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'hex',
	),
	transactionRoot: Buffer.from(
		'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'hex',
	),
	generatorPublicKey: Buffer.from(
		'acc56344dea609e80cf5d4165e46917104fe701927847fc2a5d40e37574b2b38',
		'hex',
	),
	reward: '400000000',
	asset: Buffer.from('eaaf9d4c65cb501c811ef812847a55513181474d734ead1b95b7e1e5b574d223', 'hex'),
	signature: Buffer.from(
		'1e65032943af975c3cdef94b1fce639645bddb29265321e0277a0f48143ef7f6f6daa1046234a09cc593969ff04d8d082edd15a4a9b90a7b8865fcd9dac44300',
		'hex',
	),
};

const validBlockHeader1Encoded = BlockHeader.encode(validBlockHeader1).finish();
const validBlockHeader2Encoded = BlockHeader.encode(validBlockHeader2).finish();

module.exports = {
	validBlockHeaderEncodingsTestCases: [
		{
			description: 'Encoding of valid block header 1',
			input: { object: validBlockHeader1, schema: blockHeaderSchema },
			output: { value: validBlockHeader1Encoded },
		},
		{
			description: 'Encoding of valid block header 2',
			input: { object: validBlockHeader2, schema: blockHeaderSchema },
			output: { value: validBlockHeader2Encoded },
		},
	],

	validBlockHeaderDecodingsTestCases: [
		{
			description: 'Decoding of valid block header 1',
			input: { value: validBlockHeader1Encoded, schema: blockHeaderSchema },
			output: { object: validBlockHeader1 },
		},
		{
			description: 'Decoding of valid block header 2',
			input: { value: validBlockHeader2Encoded, schema: blockHeaderSchema },
			output: { object: validBlockHeader2 },
		},
	],
};
