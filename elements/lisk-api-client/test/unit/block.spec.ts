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
 *
 */

import {
	blockHeaderSchema,
	blockSchema,
	blockHeaderAssetSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import { Channel } from '../../src/types';
import { Block } from '../../src/block';
import { schema as schemas } from '../utils/transaction';

describe('block', () => {
	let channel: Channel;
	let block: Block;
	const sampleHeight = 1;
	const encodedBlock =
		'0ad601080210a7feddfc0518b0c90c2220e69286cc8efdfc794a3aabc7755415bd201832b80c29493d9f2c50e597aab4562a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220e91e2241030b0dad7022ec05d98343394043e0f31bc63f296ed07cce35cbd3d53880cab5ee01421a08cdc80c10ecc80c1a10fe22dd75b833d917e98539f586954ba54a40fb67faefdb95a624a83cb02115c5aacd6d22bd7074e69f2b31f0a261570e27518e2d93eb2ffb1e0eaf9ab0ce5b69889672ea344ff6e4d4bdc315c299fc2d010e';
	const encodedBlockBuffer = Buffer.from(encodedBlock, 'hex');
	const sampleBlock = {
		header: {
			version: 2,
			timestamp: 1603764007,
			height: 206000,
			previousBlockID: Buffer.from(
				'e69286cc8efdfc794a3aabc7755415bd201832b80c29493d9f2c50e597aab456',
				'hex',
			),
			transactionRoot: Buffer.from(
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'hex',
			),
			generatorPublicKey: Buffer.from(
				'e91e2241030b0dad7022ec05d98343394043e0f31bc63f296ed07cce35cbd3d5',
				'hex',
			),
			reward: BigInt('500000000'),
			asset: {
				maxHeightPreviouslyForged: 205901,
				maxHeightPrevoted: 205932,
				seedReveal: Buffer.from('fe22dd75b833d917e98539f586954ba5', 'hex'),
			},
			signature: Buffer.from(
				'fb67faefdb95a624a83cb02115c5aacd6d22bd7074e69f2b31f0a261570e27518e2d93eb2ffb1e0eaf9ab0ce5b69889672ea344ff6e4d4bdc315c299fc2d010e',
				'hex',
			),
			id: Buffer.from('ff960b7762cad26b2b6e22e47e9aecbb933f7238ecb54ec36e212260dba82db7', 'hex'),
		},
		payload: [],
	};
	const blockId = sampleBlock.header.id;
	const accountSchema = {
		$id: 'accountSchema',
		type: 'object',
		properties: {
			sequence: {
				type: 'object',
				fieldNumber: 3,
				properties: {
					nonce: {
						fieldNumber: 1,
						dataType: 'uint64',
					},
				},
			},
		},
	};
	const schema = {
		account: accountSchema,
		block: blockSchema,
		blockHeader: blockHeaderSchema,
		blockHeadersAssets: {
			2: blockHeaderAssetSchema,
		},
		transaction: transactionSchema,
		transactionsAssets: [
			{
				moduleID: 5,
				moduleName: 'dpos',
				assetID: 3,
				assetName: 'reportDelegateMisbehavior',
				schema: {
					$id: 'lisk/dpos/pom',
					type: 'object',
					required: ['header1', 'header2'],
					properties: {
						header1: {
							...blockHeaderSchema,
							fieldNumber: 1,
						},
						header2: {
							...blockHeaderSchema,
							fieldNumber: 2,
						},
					},
				},
			},
			...schemas.transactionsAssets,
		],
	} as any;

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn().mockResolvedValue(encodedBlock),
			subscribe: jest.fn(),
		};
		block = new Block(channel, schema);
	});

	describe('Block', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(block['_channel']).toBe(channel);
			});
		});

		describe('get', () => {
			it('should invoke app:getBlockByID', async () => {
				// Act
				await block.get(blockId);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app:getBlockByID', {
					id: blockId.toString('hex'),
				});
			});
		});

		describe('getByHeight', () => {
			it('should invoke app:getBlockByHeight', async () => {
				// Act
				await block.getByHeight(1);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(sampleHeight);
				expect(channel.invoke).toHaveBeenCalledWith('app:getBlockByHeight', {
					height: sampleHeight,
				});
			});
		});

		describe('encode', () => {
			it('should return encoded block', () => {
				// Act
				const returnedBlock = block.encode(sampleBlock as any);

				// Assert
				expect(returnedBlock).toEqual(encodedBlockBuffer);
			});
		});

		describe('decode', () => {
			it('should return decoded block', () => {
				// Act
				const decodedBlock = block.decode(encodedBlockBuffer);

				// Assert
				expect(decodedBlock).toEqual(sampleBlock);
			});
		});

		describe('toJSON', () => {
			it('should return decoded block in JSON', () => {
				// Arrange
				const tx = {
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('54'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
						'hex',
					),
					asset: {
						amount: BigInt('10000000'),
						recipientAddress: Buffer.from('654087c2df870402ab0b1996616fd3355d61f62c', 'hex'),
						data: '',
					},
					signatures: [
						Buffer.from(
							'79cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700',
							'hex',
						),
					],
					id: 'dd93e4ca5b48d0b604e7cf2e57ce21be43a3163f853c83d88d383032fd830bbf',
				};
				const decodedBlock = block.decode(encodedBlockBuffer);
				(decodedBlock as any).payload.push(tx);
				// Act
				const decodedBlockJSON = block.toJSON(decodedBlock as any);
				// Assert
				expect(() => JSON.parse(JSON.stringify(decodedBlockJSON))).not.toThrow();
			});
		});

		describe('fromJSON', () => {
			it('should return object from JSON block', () => {
				// Arrange
				const tx = {
					moduleID: 2,
					assetID: 0,
					nonce: BigInt('54'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
						'hex',
					),
					asset: {
						amount: BigInt('10000000'),
						recipientAddress: Buffer.from('654087c2df870402ab0b1996616fd3355d61f62c', 'hex'),
						data: '',
					},
					signatures: [
						Buffer.from(
							'79cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700',
							'hex',
						),
					],
					id: 'dd93e4ca5b48d0b604e7cf2e57ce21be43a3163f853c83d88d383032fd830bbf',
				};
				const decodedBlock = block.decode(encodedBlockBuffer);
				(decodedBlock as any).payload.push(tx);
				const decodedBlockJSON = block.toJSON(decodedBlock as any);
				// Act
				const decodedBlockFromJSON = block.fromJSON(decodedBlockJSON as any);

				// Remove ids in test too as ids are not present in schemas
				delete (decodedBlock as any).header.id;

				for (const aTx of (decodedBlock as any).payload) {
					delete aTx.id;
				}

				// Assert
				expect(decodedBlockFromJSON).toEqual(decodedBlock);
			});
		});
	});
});
