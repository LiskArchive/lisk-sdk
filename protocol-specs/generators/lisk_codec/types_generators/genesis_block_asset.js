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

const { GenesisBlockAsset } = prepareProtobuffersBlock();

const genesisBlockAssetSchema = {
	$id: '/genesisBlockAssetSchema',
	type: 'object',
	required: ['accounts', 'initValidators', 'initRounds'],
	properties: {
		accounts: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					address: { dataType: 'bytes', fieldNumber: 1 },
					balance: { dataType: 'uint64', fieldNumber: 2 },
					publicKey: { dataType: 'bytes', fieldNumber: 3 },
					nonce: { dataType: 'uint64', fieldNumber: 4 },
					keys: {
						fieldNumber: 5,
						type: 'object',
						properties: {
							numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
							mandatoryKeys: {
								type: 'array',
								items: { dataType: 'bytes' },
								fieldNumber: 2,
							},
							optionalKeys: {
								type: 'array',
								items: { dataType: 'bytes' },
								fieldNumber: 3,
							},
						},
						required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
					},
					asset: {
						fieldNumber: 6,
						type: 'object',
						properties: {
							validator: {
								type: 'object',
								fieldNumber: 1,
								properties: {
									username: { dataType: 'string', fieldNumber: 1 },
									pomHeights: {
										type: 'array',
										items: { dataType: 'uint32' },
										fieldNumber: 2,
									},
									consecutiveMissedBlocks: {
										dataType: 'uint32',
										fieldNumber: 3,
									},
									lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
									isBanned: { dataType: 'boolean', fieldNumber: 5 },
									totalStakeReceived: { dataType: 'uint64', fieldNumber: 6 },
								},
								required: [
									'username',
									'pomHeights',
									'consecutiveMissedBlocks',
									'lastForgedHeight',
									'isBanned',
									'totalStakeReceived',
								],
							},
							sentStakes: {
								type: 'array',
								fieldNumber: 2,
								items: {
									type: 'object',
									properties: {
										validatorAddress: { dataType: 'bytes', fieldNumber: 1 },
										amount: { dataType: 'uint64', fieldNumber: 2 },
									},
									required: ['validatorAddress', 'amount'],
								},
							},
							unlocking: {
								type: 'array',
								fieldNumber: 3,
								items: {
									type: 'object',
									properties: {
										validatorAddress: { dataType: 'bytes', fieldNumber: 1 },
										amount: { dataType: 'uint64', fieldNumber: 2 },
										unstakeHeight: { dataType: 'uint32', fieldNumber: 3 },
									},
									required: ['validatorAddress', 'amount', 'unstakeHeight'],
								},
							},
						},
					},
				},
				required: ['address', 'balance', 'publicKey', 'nonce', 'keys', 'asset'],
			},
			fieldNumber: 1,
		},
		initValidators: {
			type: 'array',
			items: { dataType: 'bytes' },
			fieldNumber: 2,
		},
		initRounds: { dataType: 'uint32', fieldNumber: 3, minimum: 3 },
	},
};

const validGenesisBlockAsset1 = {
	initValidators: [
		Buffer.from('03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f', 'hex'),
		Buffer.from('0903f4c5cb599a7928aef27e314e98291d1e3888', 'hex'),
		Buffer.from('0ada6a2f6c8f891769366fc9aa6fd9f1facb36cf', 'hex'),
	],
	initRounds: 3,
	accounts: [
		{
			address: Buffer.from('03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f', 'hex'),
			publicKey: Buffer.from(
				'fc65777c1d4c00f1af5880c23ba7f60cd3bf84d1bf5c697abc4ffe17cf7acac0',
				'hex',
			),
			balance: '0',
			nonce: '0',
			keys: {
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			},
			asset: {
				validator: {
					username: 'genesis_34',
					pomHeights: [],
					consecutiveMissedBlocks: 0,
					lastForgedHeight: 0,
					isBanned: false,
					totalStakeReceived: '1000000000000',
				},
				sentStakes: [
					{
						validatorAddress: Buffer.from('03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f', 'hex'),
						amount: '1000000000000',
					},
				],
				unlocking: [],
			},
		},
		{
			address: Buffer.from('0903f4c5cb599a7928aef27e314e98291d1e3888', 'hex'),
			publicKey: Buffer.from(
				'3f571324e9dc7b2481b71a7dc56637f1234504158986a242e90c33d8d20fdd92',
				'hex',
			),
			balance: '0',
			nonce: '0',
			keys: {
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			},
			asset: {
				validator: {
					username: 'genesis_74',
					pomHeights: [],
					consecutiveMissedBlocks: 0,
					lastForgedHeight: 0,
					isBanned: false,
					totalStakeReceived: '1000000000000',
				},
				sentStakes: [],
				unlocking: [],
			},
		},
		{
			address: Buffer.from('0ada6a2f6c8f891769366fc9aa6fd9f1facb36cf', 'hex'),
			publicKey: Buffer.from(
				'c69698ef30012964aafacfbe637bb63854b6109cc5c5f22aa4b3dc3e8dca8217',
				'hex',
			),
			balance: '0',
			nonce: '0',
			keys: {
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
			},
			asset: {
				validator: {
					username: 'genesis_98',
					pomHeights: [],
					consecutiveMissedBlocks: 0,
					lastForgedHeight: 0,
					isBanned: false,
					totalStakeReceived: '1000000000000',
				},
				sentStakes: [
					{
						validatorAddress: Buffer.from('0ada6a2f6c8f891769366fc9aa6fd9f1facb36cf', 'hex'),
						amount: '1000000000000',
					},
				],
				unlocking: [],
			},
		},
	],
};

const validBlockAssetEncoded = GenesisBlockAsset.encode(validGenesisBlockAsset1).finish();

module.exports = {
	validGenesisBlockAssetEncodingsTestCases: [
		{
			description: 'Encoding of valid genesis block asset',
			input: { object: validGenesisBlockAsset1, schema: genesisBlockAssetSchema },
			output: { value: validBlockAssetEncoded },
		},
	],

	validGenesisBlockAssetDecodingsTestCases: [
		{
			description: 'Decoding of valid genesis block asset',
			input: { value: validBlockAssetEncoded, schema: genesisBlockAssetSchema },
			output: { object: validGenesisBlockAsset1 },
		},
	],
};
