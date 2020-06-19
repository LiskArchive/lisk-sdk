/*
 * Copyright © 2019 Lisk Foundation
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

import { StateStore, Block } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-db';
import { BlockProcessorV2 } from '../../../../../src/application/node/block_processor_v2';
import { BaseBlockProcessor } from '../../../../../src/application/node/processor/base_block_processor';

describe('block processor v2', () => {
	const defaultKeyPair = {
		privateKey: Buffer.from(
			'a8e169d600922cc214030a287948828d80b31776139cea9c209968374695aa9ac326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			'hex',
		),
		publicKey: Buffer.from(
			'c326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			'hex',
		),
	};
	const defaultAddress = getAddressFromPublicKey(defaultKeyPair.publicKey);
	const defaultAdditionalData = {
		lastBlockHeaders: [],
		networkIdentifier: Buffer.from(
			'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
			'hex',
		),
		lastBlockReward: BigInt(1000),
		defaultAsset: {},
	};

	let blockProcessor: BaseBlockProcessor;
	let chainModuleStub: any;
	let bftModuleStub: any;
	let dposModuleStub: any;
	let forgerDBStub: any;
	let loggerStub: any;

	beforeEach(() => {
		chainModuleStub = {
			newStateStore: jest.fn().mockResolvedValue({}),
			validateBlockHeader: jest.fn(),
			verifyInMemory: jest.fn(),
			blockReward: {
				calculateReward: jest.fn().mockReturnValue(5),
			},
			lastBlock: {
				height: 102,
			},
			dataAccess: {
				encodeBlockHeader: jest.fn().mockReturnValue(Buffer.from('00', 'hex')),
			},
		};
		bftModuleStub = {
			init: jest.fn(),
			deleteBlocks: jest.fn(),
			validateBlock: jest.fn(),
			maxHeightPrevoted: 0,
			isBFTProtocolCompliant: jest.fn().mockReturnValue(true),
		};

		dposModuleStub = {
			verifyBlockForger: jest.fn(),
			isDPoSProtocolCompliant: jest.fn().mockReturnValue(true),
		};
		forgerDBStub = {
			get: jest.fn(),
			put: jest.fn(),
		};
		loggerStub = {
			error: jest.fn(),
		};

		const defaultConstants = {
			maxPayloadLength: 15000,
		};

		blockProcessor = new BlockProcessorV2({
			networkIdentifier: defaultAdditionalData.networkIdentifier,
			chainModule: chainModuleStub,
			bftModule: bftModuleStub,
			dposModule: dposModuleStub,
			forgerDB: forgerDBStub,
			logger: loggerStub,
			constants: defaultConstants,
		});
	});

	// TODO: Fix this skipped test after state store modification
	// eslint-disable-next-line jest/no-disabled-tests
	describe('init', () => {
		it('should initialize BFT module', async () => {
			// Arrange & Act
			const stateStore = new StateStore(forgerDBStub, defaultAdditionalData);
			await blockProcessor.init.run({ stateStore });
			// Assert
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('validate', () => {
		it('should throw error on invalid data', async () => {
			// Arrange & Act
			const block = {
				header: {
					version: 2,
					timestamp: 0,
					previousBlockID: Buffer.from(
						'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
						'hex',
					),
					height: 1,
					asset: {
						seedReveal: Buffer.from('no-hex-value-000000FFFFFFFF'),
						maxHeightPreviouslyForged: 0,
						maxHeightPrevoted: 0,
					},
					reward: BigInt(0),
					generatorPublicKey: null,
					transactionRoot: Buffer.from(
						'19074b69c97e6f6b86969bb62d4f15b888898b499777bda56a3a2ee642a7f20a',
						'hex',
					),
					signature: Buffer.from(
						'9eb81604dec27d2386b7b7cdaf91c00eada99d6d3fac76ea25ef68a9eaca6f6877ed84c3b0864cec1cd1700e1f3bbffcf32dde9e26e174c75347ccf4da6eeb09',
						'hex',
					),
					id: Buffer.from(
						'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
						'hex',
					),
				},
				transactions: [],
			};
			// Assert
			await blockProcessor.validate.run({ block } as any);
			expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
		});
	});

	describe('create', () => {
		const stateStore = {} as StateStore;
		let block;

		it('should set maxPreviouslyForgedHeight to zero when the delegate did not forge before', async () => {
			// Arrange
			const maxHeightResult = Buffer.from(JSON.stringify({}));
			forgerDBStub.get.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					timestamp: 10,
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			// Assert
			expect(forgerDBStub.get).toHaveBeenCalledWith('forger:previouslyForged');
			// previousBlock.height + 1
			expect(block.header.asset.maxHeightPreviouslyForged).toBe(0);
		});

		it('should save maxPreviouslyForgedHeight as the block height created', async () => {
			const previouslyForgedHeight = 100;
			// Arrange
			const maxHeightResult = Buffer.from(
				JSON.stringify({
					[defaultAddress.toString('binary')]: { height: 100 },
				}),
			);
			forgerDBStub.get.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			// Assert
			expect(forgerDBStub.get).toHaveBeenCalledWith('forger:previouslyForged');
			expect(block.header.asset.maxHeightPreviouslyForged).toBe(
				previouslyForgedHeight,
			);
		});

		it('should update maxPreviouslyForgedHeight to the next higher one but not change for other delegates', async () => {
			// Arrange
			const list = {
				[defaultAddress.toString('binary')]: { height: 5 },
				[Buffer.from('a').toString('binary')]: { height: 4 },
				[Buffer.from('b').toString('binary')]: { height: 6 },
				[Buffer.from('c').toString('binary')]: { height: 7 },
				[Buffer.from('x').toString('binary')]: { height: 8 },
			};
			forgerDBStub.get.mockResolvedValue(Buffer.from(JSON.stringify(list)));
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			const maxHeightResult = Buffer.from(
				JSON.stringify({
					...list,
					[defaultAddress.toString('binary')]: {
						height: 11,
						maxHeightPrevoted: 0,
						maxHeightPreviouslyForged: 5,
					},
				}),
			);
			expect(forgerDBStub.put).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should set maxPreviouslyForgedHeight to forging height', async () => {
			forgerDBStub.get.mockRejectedValue(new NotFoundError('notfound'));
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			const maxHeightResult = Buffer.from(
				JSON.stringify({
					[defaultAddress.toString('binary')]: {
						height: 11,
						maxHeightPrevoted: 0,
						maxHeightPreviouslyForged: 0,
					},
				}),
			);
			expect(forgerDBStub.put).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should not set maxPreviouslyForgedHeight to next height if lower', async () => {
			// Arrange
			forgerDBStub.get.mockResolvedValue(
				Buffer.from(
					JSON.stringify({
						[defaultAddress.toString('binary')]: { height: 15 },
					}),
				),
			);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			expect(forgerDBStub.put).not.toHaveBeenCalled();
		});

		it('should include seed reveal as specified in the block', async () => {
			forgerDBStub.get.mockRejectedValue(new NotFoundError('notfound'));
			// Arange
			const seedReveal = Buffer.from('c04ecc8875400b2f51110f76cbb3dc28', 'hex');
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal,
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			expect(block.header.height).toBe(11);
			expect(block.header.asset.seedReveal).toBe(seedReveal);
		});

		it('should return a block', async () => {
			// Arrange
			forgerDBStub.get.mockRejectedValue(new NotFoundError('notfound'));
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
					transactions: [],
					previousBlock: {
						header: { height: 10 },
					} as Block,
				},
				stateStore,
			});
			expect(block.header.height).toBe(11);
			expect(block.header.generatorPublicKey).toBe(defaultKeyPair.publicKey);
			expect(block.header.asset.maxHeightPrevoted).toBe(0);
		});
	});
});
