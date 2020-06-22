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

const blockAssetSchema = {
	$id: 'genesisBlockAssetSchema',
	type: 'object',
	required: ['accounts', 'initDelegates', 'initRounds'],
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
							delegate: {
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
									totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
								},
								required: [
									'username',
									'pomHeights',
									'consecutiveMissedBlocks',
									'lastForgedHeight',
									'isBanned',
									'totalVotesReceived',
								],
							},
							sentVotes: {
								type: 'array',
								fieldNumber: 2,
								items: {
									type: 'object',
									properties: {
										delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
										amount: { dataType: 'uint64', fieldNumber: 2 },
									},
									required: ['delegateAddress', 'amount'],
								},
							},
							unlocking: {
								type: 'array',
								fieldNumber: 3,
								items: {
									type: 'object',
									properties: {
										delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
										amount: { dataType: 'uint64', fieldNumber: 2 },
										unvoteHeight: { dataType: 'uint32', fieldNumber: 3 },
									},
									required: ['delegateAddress', 'amount', 'unvoteHeight'],
								},
							},
						},
					},
				},
				required: ['address', 'balance', 'publicKey', 'nonce', 'keys', 'asset'],
			},
			fieldNumber: 1,
		},
		initDelegates: {
			type: 'array',
			items: { dataType: 'bytes' },
			fieldNumber: 2,
		},
		initRounds: { dataType: 'uint32', fieldNumber: 3, minimum: 3 },
	},
};

const generateValidGenesisBlockAssetEncodings = () => {
	const input = {
		validGenesisBlockAsset1: {
			object: {
				initDelegates: [
					Buffer.from('A/bZC329BJfcOlLRwn4ju4x1iX8=', 'base64'),
					Buffer.from('CQP0xctZmnkorvJ+MU6YKR0eOIg=', 'base64'),
					Buffer.from('CtpqL2yPiRdpNm/Jqm/Z8frLNs8=', 'base64'),
				],
				initRounds: 3,
				accounts: [
					{
						address: Buffer.from('A/bZC329BJfcOlLRwn4ju4x1iX8=', 'base64'),
						publicKey: Buffer.from(
							'/GV3fB1MAPGvWIDCO6f2DNO/hNG/XGl6vE/+F896ysA=',
							'base64',
						),
						balance: '0',
						nonce: '0',
						keys: {
							mandatoryKeys: [],
							optionalKeys: [],
							numberOfSignatures: 0,
						},
						asset: {
							delegate: {
								username: 'genesis_34',
								pomHeights: [],
								consecutiveMissedBlocks: 0,
								lastForgedHeight: 0,
								isBanned: false,
								totalVotesReceived: '1000000000000',
							},
							sentVotes: [
								{
									delegateAddress: Buffer.from(
										'A/bZC329BJfcOlLRwn4ju4x1iX8=',
										'base64',
									),
									amount: '1000000000000',
								},
							],
							unlocking: [],
						},
					},
					{
						address: Buffer.from('CQP0xctZmnkorvJ+MU6YKR0eOIg=', 'base64'),
						publicKey: Buffer.from(
							'P1cTJOnceySBtxp9xWY38SNFBBWJhqJC6Qwz2NIP3ZI=',
							'base64',
						),
						balance: '0',
						nonce: '0',
						keys: {
							mandatoryKeys: [],
							optionalKeys: [],
							numberOfSignatures: 0,
						},
						asset: {
							delegate: {
								username: 'genesis_74',
								pomHeights: [],
								consecutiveMissedBlocks: 0,
								lastForgedHeight: 0,
								isBanned: false,
								totalVotesReceived: '1000000000000',
							},
							sentVotes: [],
							unlocking: [],
						},
					},
					{
						address: Buffer.from('CtpqL2yPiRdpNm/Jqm/Z8frLNs8=', 'base64'),
						publicKey: Buffer.from(
							'xpaY7zABKWSq+s++Y3u2OFS2EJzFxfIqpLPcPo3Kghc=',
							'base64',
						),
						balance: '0',
						nonce: '0',
						keys: {
							mandatoryKeys: [],
							optionalKeys: [],
							numberOfSignatures: 0,
						},
						asset: {
							delegate: {
								username: 'genesis_98',
								pomHeights: [],
								consecutiveMissedBlocks: 0,
								lastForgedHeight: 0,
								isBanned: false,
								totalVotesReceived: '1000000000000',
							},
							sentVotes: [
								{
									delegateAddress: Buffer.from(
										'CtpqL2yPiRdpNm/Jqm/Z8frLNs8=',
										'base64',
									),
									amount: '1000000000000',
								},
							],
							unlocking: [],
						},
					},
				],
			},
			schema: blockAssetSchema,
		},
	};

	const validBlockAssetEncoded = GenesisBlockAsset.encode(
		input.validGenesisBlockAsset1.object,
	).finish();

	return [
		{
			description: 'Encoding of valid block asset',
			input: input.validGenesisBlockAsset1,
			output: { value: validBlockAssetEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidGenesisBlockAssetEncodings;
