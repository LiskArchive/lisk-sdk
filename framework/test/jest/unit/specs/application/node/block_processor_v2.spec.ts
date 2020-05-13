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

import { StateStore, BlockInstance } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	BlockProcessorV2,
	getBytes,
} from '../../../../../../src/application/node/block_processor_v2';
import { BaseBlockProcessor } from '../../../../../../src/application/node/processor/base_block_processor';

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
	const defaultAddress = getAddressFromPublicKey(
		defaultKeyPair.publicKey.toString('hex'),
	);
	const defaultAdditionalData = {
		lastBlockHeaders: [],
		networkIdentifier:
			'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e',
		lastBlockReward: BigInt(1000),
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
			undo: jest.fn(),
			validateBlockHeader: jest.fn(),
			verifyInMemory: jest.fn(),
			blockReward: {
				calculateReward: jest.fn().mockReturnValue(5),
			},
			lastBlock: {
				height: 102,
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
			undo: jest.fn(),
			verifyBlockForger: jest.fn(),
			isDPoSProtocolCompliant: jest.fn().mockReturnValue(true),
		};
		forgerDBStub = {
			get: jest.fn(),
			put: jest.fn(),
		};
		loggerStub = {};

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
	describe.skip('init', () => {
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
				version: 2,
				timestamp: 0,
				previousBlockId:
					'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
				height: 1,
				seedReveal: 'no-hex-value-000000FFFFFFFF',
				maxHeightPreviouslyForged: 0,
				maxHeightPrevoted: 0,
				reward: '0',
				totalFee: '0',
				communityIdentifier: 'Lisk',
				generatorPublicKey:
					'e925106c5b0f276dfb0a3d60c4ed6068ec0181a70dab680199d65369fb69b9f8',
				payloadHash:
					'19074b69c97e6f6b86969bb62d4f15b888898b499777bda56a3a2ee642a7f20a',
				payloadLength: 39677,
				totalAmount: '10000000000000000',
				numberOfTransactions: 310,
				blockSignature:
					'9eb81604dec27d2386b7b7cdaf91c00eada99d6d3fac76ea25ef68a9eaca6f6877ed84c3b0864cec1cd1700e1f3bbffcf32dde9e26e174c75347ccf4da6eeb09',
				id: '9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
				transactions: [],
			};
			// Assert
			expect.assertions(3);
			try {
				await blockProcessor.validate.run({ block } as any);
			} catch (errors) {
				// eslint-disable-next-line jest/no-try-expect
				expect(errors).toHaveLength(2);
				// eslint-disable-next-line jest/no-try-expect
				expect(errors[0].message).toContain(
					'should NOT be shorter than 32 characters',
				);
				// eslint-disable-next-line jest/no-try-expect
				expect(errors[1].message).toContain('should match format "hex"');
			}
		});
	});

	// TODO: Fix this skipped test after state store modification
	// eslint-disable-next-line jest/no-disabled-tests
	describe.skip('undo', () => {
		it('should reject the promise when dpos undo fails', async () => {
			const stateStore = new StateStore(forgerDBStub, defaultAdditionalData);
			dposModuleStub.undo.mockRejectedValue(new Error('Invalid error'));
			await expect(
				blockProcessor.undo.run({
					block: { height: 1 } as BlockInstance,
					stateStore,
				}),
			).rejects.toThrow('Invalid error');
		});

		it('should reject the promise when bft deleteBlocks fails', async () => {
			const stateStore = new StateStore(forgerDBStub, defaultAdditionalData);
			bftModuleStub.deleteBlocks.mockRejectedValue(new Error('Invalid error'));
			await expect(
				blockProcessor.undo.run({
					block: { height: 1 } as BlockInstance,
					stateStore,
				}),
			).rejects.toThrow('Invalid error');
		});
	});

	describe('create', () => {
		const stateStore = {} as StateStore;
		let block;

		it('should set maxPreviouslyForgedHeight to zero when the delegate did not forge before', async () => {
			// Arrange
			const maxHeightResult = JSON.stringify({});
			forgerDBStub.get.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					seedReveal: '00000000000000000000000000000000',
					timestamp: 10,
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			// Assert
			expect(forgerDBStub.get).toHaveBeenCalledWith('forger:previouslyForged');
			// previousBlock.height + 1
			expect(block.maxHeightPreviouslyForged).toBe(0);
		});

		it('should save maxPreviouslyForgedHeight as the block height created', async () => {
			const previouslyForgedHeight = 100;
			// Arrange
			const maxHeightResult = JSON.stringify({
				[defaultAddress]: { height: 100 },
			});
			forgerDBStub.get.mockResolvedValue(maxHeightResult);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			// Assert
			expect(forgerDBStub.get).toHaveBeenCalledWith('forger:previouslyForged');
			expect(block.maxHeightPreviouslyForged).toBe(previouslyForgedHeight);
		});

		it('should update maxPreviouslyForgedHeight to the next higher one but not change for other delegates', async () => {
			// Arrange
			const list = {
				[defaultAddress]: { height: 5 },
				a: { height: 4 },
				b: { height: 6 },
				c: { height: 7 },
				x: { height: 8 },
			};
			forgerDBStub.get.mockResolvedValue(JSON.stringify(list));
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			const maxHeightResult = JSON.stringify({
				...list,
				[defaultAddress]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 5,
				},
			});
			expect(forgerDBStub.put).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should set maxPreviouslyForgedHeight to forging height', async () => {
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			const maxHeightResult = JSON.stringify({
				[defaultAddress]: {
					height: 11,
					maxHeightPrevoted: 0,
					maxHeightPreviouslyForged: 0,
				},
			});
			expect(forgerDBStub.put).toHaveBeenCalledWith(
				'forger:previouslyForged',
				maxHeightResult,
			);
		});

		it('should not set maxPreviouslyForgedHeight to next height if lower', async () => {
			// Arrange
			forgerDBStub.get.mockResolvedValue(
				JSON.stringify({
					[defaultAddress]: { height: 15 },
				}),
			);
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			expect(forgerDBStub.put).not.toHaveBeenCalled();
		});

		it('should include seed reveal as specified in the block', async () => {
			// Arange
			const seedReveal = 'c04ecc8875400b2f51110f76cbb3dc28';
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal,
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			expect(block.height).toBe(11);
			expect(block.seedReveal).toBe(seedReveal);
		});

		it('should return a block', async () => {
			// Act
			block = await blockProcessor.create.run({
				data: {
					keypair: defaultKeyPair,
					timestamp: 10,
					seedReveal: '00000000000000000000000000000000',
					transactions: [],
					previousBlock: {
						height: 10,
					} as BlockInstance,
				},
				stateStore,
			});
			expect(block.height).toBe(11);
			expect(block.generatorPublicKey).toBe(
				defaultKeyPair.publicKey.toString('hex'),
			);
			expect(block.maxHeightPrevoted).toBe(0);
		});
	});

	describe('getBytes', () => {
		const defaultSeedReveal = 'c04ecc8875400b2f51110f76cbb3dc28';
		const block = {
			version: 2,
			totalAmount: BigInt(0),
			totalFee: BigInt(0),
			seedReveal: defaultSeedReveal,
			reward: 5,
			payloadHash:
				'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			timestamp: 10,
			numberOfTransactions: 0,
			payloadLength: 0,
			previousBlockId: undefined,
			generatorPublicKey:
				'c326f1068baa038b97f28f6cfe6b37e6c7041c3ea035c79c5923cd62f2b1f167',
			transactions: [],
			height: 11,
			maxHeightPreviouslyForged: 0,
			maxHeightPrevoted: 0,
			blockSignature:
				'768a0a5709861b4ea7ff502d5049219a3ebb0a79554abac17eaabb4fe0acf19e80e4799c1a718baccd95e8062026631c181077c70f768d6ec2ef08dde45fe90e',
		};

		it('should include seedReveal after previousBlockId', () => {
			const bytes = getBytes(block as any);
			// version(4), timestamp(4), previousBlockID(8)
			const seedRevealBytes = bytes.slice(40, 40 + 16);
			expect(seedRevealBytes.toString('hex')).toEqual(defaultSeedReveal);
		});
	});
});
