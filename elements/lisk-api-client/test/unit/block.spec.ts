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

import { blockHeaderSchema, blockSchema, transactionSchema } from '@liskhq/lisk-chain';
import { hash } from '@liskhq/lisk-cryptography';
import { Channel } from '../../src/types';
import { Block } from '../../src/block';
import { schema as schemas } from '../utils/transaction';

describe('block', () => {
	let channel: Channel;
	let block: Block;
	const sampleHeight = 1;
	const encodedBlock =
		'0ae201080110c4d23d18c4d23d22144a462ea57a8c9f72d866c09770e5ec70cef187272a14be63fb1c0426573352556f18b21efd5b6183c39c3214b27ca21f40d44113c2090ca8f05fb706c54e87dd3a14b27ca21f40d44113c2090ca8f05fb706c54e87dd422030dda4fbc395828e5a9f2f8824771e434fce4945a1e7820012440d09dd1e2b6d4a147f9d96a09a3fd17f3478eb7bef3a8bda00e1238b509c8c3d589c8c3d6220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8556a06080012001a0072146da88e2fd4435e26e02682435f108002ccc3ddd5';
	const encodedBlockBuffer = Buffer.from(encodedBlock, 'hex');
	const sampleBlock = {
		header: {
			version: 1,
			timestamp: 1009988,
			height: 1009988,
			previousBlockID: Buffer.from('4a462ea57a8c9f72d866c09770e5ec70cef18727', 'hex'),
			stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
			transactionRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
			assetsRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
			eventRoot: Buffer.from(
				'30dda4fbc395828e5a9f2f8824771e434fce4945a1e7820012440d09dd1e2b6d',
				'hex',
			),
			generatorAddress: Buffer.from('be63fb1c0426573352556f18b21efd5b6183c39c', 'hex'),
			maxHeightPrevoted: 1000988,
			maxHeightGenerated: 1000988,
			validatorsHash: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			signature: Buffer.from('6da88e2fd4435e26e02682435f108002ccc3ddd5', 'hex'),
			id: Buffer.from('f14104e384546adaba487af56e658188eea07bb534a61b4cbb9ccaee54139b8c', 'hex'),
		},
		assets: [],
		transactions: [],
	};
	const blockId = sampleBlock.header.id;
	const schema = {
		block: blockSchema,
		blockHeader: blockHeaderSchema,
		transaction: transactionSchema,
		commands: [
			{
				moduleID: 5,
				moduleName: 'dpos',
				commandID: 3,
				commandName: 'reportDelegateMisbehavior',
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
			...schemas.commands,
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
			describe('block by id as buffer', () => {
				it('should invoke app_getBlockByID', async () => {
					// Act
					await block.get(blockId);

					// Assert
					expect(channel.invoke).toHaveBeenCalledTimes(1);
					expect(channel.invoke).toHaveBeenCalledWith('app_getBlockByID', {
						id: blockId.toString('hex'),
					});
				});
			});

			describe('block by id as hex', () => {
				it('should invoke app_getBlockByID', async () => {
					// Act
					await block.get(blockId.toString('hex'));

					// Assert
					expect(channel.invoke).toHaveBeenCalledTimes(1);
					expect(channel.invoke).toHaveBeenCalledWith('app_getBlockByID', {
						id: blockId.toString('hex'),
					});
				});
			});
		});

		describe('getByHeight', () => {
			it('should invoke app_getBlockByHeight', async () => {
				// Act
				await block.getByHeight(1);

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(sampleHeight);
				expect(channel.invoke).toHaveBeenCalledWith('app_getBlockByHeight', {
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
			describe('block from input as buffer', () => {
				it('should return decoded block', () => {
					// Act
					const decodedBlock = block.decode(encodedBlockBuffer);

					// Assert
					expect(decodedBlock).toEqual(sampleBlock);
				});
			});

			describe('block from input as hex', () => {
				it('should return decoded block', () => {
					// Act
					const decodedBlock = block.decode(encodedBlockBuffer.toString('hex'));

					// Assert
					expect(decodedBlock).toEqual(sampleBlock);
				});
			});
		});

		describe('toJSON', () => {
			it('should return decoded block in JSON', () => {
				// Arrange
				const tx = {
					moduleID: 2,
					commandID: 0,
					nonce: BigInt('54'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
						'hex',
					),
					params: {
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
				(decodedBlock as any).transactions.push(tx);
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
					commandID: 0,
					nonce: BigInt('54'),
					fee: BigInt('10000000'),
					senderPublicKey: Buffer.from(
						'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
						'hex',
					),
					params: {
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
					id: Buffer.from(
						'dd93e4ca5b48d0b604e7cf2e57ce21be43a3163f853c83d88d383032fd830bbf',
						'hex',
					),
				};
				const decodedBlock = block.decode(encodedBlockBuffer);
				(decodedBlock as any).transactions.push(tx);
				const decodedBlockJSON = block.toJSON(decodedBlock as any);
				// Act
				const decodedBlockFromJSON = block.fromJSON(decodedBlockJSON as any);

				// Assert
				expect(decodedBlockFromJSON).toEqual(decodedBlock);
			});
		});
	});
});
