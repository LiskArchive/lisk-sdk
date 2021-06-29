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

import { GenesisBlock, Chain, Block, Transaction } from '@liskhq/lisk-chain';
import { jobHandlers } from '@liskhq/lisk-utils';
import { ForkStatus, BFT } from '@liskhq/lisk-bft';
import { validator } from '@liskhq/lisk-validator';
import { CustomModule0, CustomModule1 } from './custom_modules';
import { Processor } from '../../../../src/node/processor';

describe('processor', () => {
	const defaultLastBlock = {
		header: {
			id: Buffer.from('lastId'),
			version: 1,
			height: 98,
		},
		payload: [],
	};

	let processor: Processor;
	let channelStub: any;
	let loggerStub: any;
	let chainModuleStub: Chain;
	let bftModuleStub: BFT;
	let stateStoreStub: any;
	let customModule0: CustomModule0;
	let customModule1: CustomModule1;

	beforeEach(() => {
		customModule0 = new CustomModule0({} as any);
		customModule1 = new CustomModule1({} as any);
		channelStub = {
			publish: jest.fn(),
		};
		loggerStub = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
		};
		stateStoreStub = {
			chain: {
				cache: jest.fn(),
			},
		};
		chainModuleStub = ({
			init: jest.fn(),
			genesisBlockExist: jest.fn(),
			validateGenesisBlockHeader: jest.fn(),
			applyGenesisBlock: jest.fn(),
			validateBlockHeader: jest.fn(),
			validateTransaction: jest.fn(),
			verifyBlockHeader: jest.fn(),
			saveBlock: jest.fn(),
			removeBlock: jest.fn(),
			newStateStore: jest.fn().mockResolvedValue(stateStoreStub),
			dataAccess: {
				encode: jest.fn(),
				decode: jest.fn(),
			},
		} as unknown) as Chain;
		bftModuleStub = ({
			init: jest.fn(),
			forkChoice: jest.fn(),
			verifyBlockHeader: jest.fn(),
			applyBlockHeader: jest.fn(),
			finalizedHeight: 5,
		} as unknown) as BFT;

		Object.defineProperty(chainModuleStub, 'lastBlock', {
			get: jest.fn().mockReturnValue(defaultLastBlock),
		});
		processor = new Processor({
			channel: channelStub,
			logger: loggerStub,
			chainModule: chainModuleStub,
			bftModule: bftModuleStub,
		});
	});

	describe('constructor', () => {
		describe('when the instance is created', () => {
			it('should initialize the sequence', () => {
				expect(processor['_mutex']).toBeInstanceOf(jobHandlers.Mutex);
			});

			it('should assign channel to its context', () => {
				expect(processor['_channel']).toBe(channelStub);
			});

			it('should assign blocks module to its context', () => {
				expect(processor['_chain']).toBe(chainModuleStub);
			});

			it('should assign logger to its context', () => {
				expect(processor['_logger']).toBe(loggerStub);
			});
		});
	});

	describe('register', () => {
		describe('when module is registered', () => {
			it('should store the module', () => {
				processor.register(customModule0);
				processor.register(customModule1);
				expect(processor['_modules']).toHaveLength(2);
			});
		});
	});

	describe('init', () => {
		const genesisBlock = ({
			header: {
				id: Buffer.from('fakeGenesisBlock'),
				version: 0,
			},
			payload: [],
		} as unknown) as GenesisBlock;

		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		it('should process genesis block if genesis block does not exist', async () => {
			// Arrange
			jest.spyOn(chainModuleStub, 'genesisBlockExist').mockResolvedValue(false);

			// Act
			await processor.init(genesisBlock);

			// Assert
			expect(customModule0.afterGenesisBlockApply).toHaveBeenCalledTimes(1);
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			expect(chainModuleStub.saveBlock).toHaveBeenCalledTimes(1);
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});

		it('should not apply genesis block if it exists in chain', async () => {
			// Arrange
			jest.spyOn(chainModuleStub, 'genesisBlockExist').mockResolvedValue(true);

			// Act
			await processor.init(genesisBlock);

			// Assert
			expect(customModule0.afterGenesisBlockApply).not.toHaveBeenCalled();
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('process', () => {
		const blockV2 = ({
			header: {
				id: Buffer.from('fakelock1'),
				version: 2,
				height: 99,
			},
			payload: [
				new Transaction({
					asset: Buffer.alloc(0),
					moduleID: 3,
					assetID: 0,
					fee: BigInt(10000000),
					nonce: BigInt(3),
					senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
					signatures: [],
				}),
			],
		} as unknown) as Block;

		const encodedBlock = Buffer.from('encoded block');

		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
			(chainModuleStub.dataAccess.encode as jest.Mock).mockReturnValue(encodedBlock);
		});

		describe('when the fork step returns unknown fork status', () => {
			beforeEach(() => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(undefined);
			});

			it('should throw an error', async () => {
				await expect(processor.process(blockV2)).rejects.toThrow('Unknown fork status');
			});
		});

		describe('when the fork step returns ForkStatus.IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.IDENTICAL_BLOCK);
				await processor.process(blockV2);
			});

			it('should not validate block', () => {
				expect(chainModuleStub.validateBlockHeader).not.toHaveBeenCalled();
			});

			it('should not verify block', () => {
				expect(chainModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
				expect(bftModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
			});

			it('should not call hooks', () => {
				expect(customModule0.beforeBlockApply).not.toHaveBeenCalled();
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not save block', () => {
				expect(chainModuleStub.saveBlock).not.toHaveBeenCalled();
			});

			it('should not publish any event', () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns ForkStatus.DOUBLE_FORGING', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.DOUBLE_FORGING);
				await processor.process(blockV2);
			});

			it('should not validate block', () => {
				expect(chainModuleStub.validateBlockHeader).not.toHaveBeenCalled();
			});

			it('should not verify block', () => {
				expect(chainModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
				expect(bftModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
			});

			it('should not call hooks', () => {
				expect(customModule0.beforeBlockApply).not.toHaveBeenCalled();
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not save block', () => {
				expect(chainModuleStub.saveBlock).not.toHaveBeenCalled();
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('hex'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and success to process', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.TIE_BREAK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV2);
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('hex'),
				});
			});

			it('should validate block', () => {
				expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should revert the last block', () => {
				expect(chainModuleStub.removeBlock).toHaveBeenCalledWith(defaultLastBlock, stateStoreStub, {
					saveTempBlock: false,
				});
			});

			it('should verify the block', () => {
				expect(chainModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
				expect(bftModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should apply the block', () => {
				expect(bftModuleStub.applyBlockHeader).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(1);
			});

			it('should save the block', () => {
				expect(chainModuleStub.saveBlock).toHaveBeenCalledWith(
					blockV2,
					stateStoreStub,
					bftModuleStub.finalizedHeight,
					{
						removeFromTempTable: false,
					},
				);
			});

			it('should emit broadcast event for the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith('EVENT_PROCESSOR_BROADCAST_BLOCK', {
					block: blockV2,
				});
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and fail to process', () => {
			beforeEach(async () => {
				(chainModuleStub.verifyBlockHeader as jest.Mock).mockRejectedValueOnce(
					new Error('invalid block'),
				);
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.TIE_BREAK);
				try {
					await processor.process(blockV2);
				} catch (err) {
					// Expected error
				}
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('hex'),
				});
			});

			it('should validate block', () => {
				expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should revert the last block', () => {
				expect(chainModuleStub.removeBlock).toHaveBeenCalledWith(defaultLastBlock, stateStoreStub, {
					saveTempBlock: false,
				});
			});

			it('should not emit broadcast event for the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should verify the last block', () => {
				expect(chainModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(2);
				expect(bftModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should apply the last block', () => {
				expect(bftModuleStub.applyBlockHeader).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(0);
				expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(0);
			});

			it('should save the last block', () => {
				expect(chainModuleStub.saveBlock).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					bftModuleStub.finalizedHeight,
					{ removeFromTempTable: false },
				);
			});
		});

		describe('when the fork step returns ForkStatus.DIFFERENT_CHAIN', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.DIFFERENT_CHAIN);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV2);
			});

			it('should not validate block', () => {
				expect(chainModuleStub.validateBlockHeader).not.toHaveBeenCalled();
			});

			it('should not verify block', () => {
				expect(chainModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
				expect(bftModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
			});

			it('should not call hooks', () => {
				expect(customModule0.beforeBlockApply).not.toHaveBeenCalled();
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not save block', () => {
				expect(chainModuleStub.saveBlock).not.toHaveBeenCalled();
			});

			it('should publish sync', () => {
				expect(processor.events.emit).toHaveBeenCalledWith('EVENT_PROCESSOR_SYNC_REQUIRED', {
					block: blockV2,
				});
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('hex'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.DISCARD', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.DISCARD);
				await processor.process(blockV2);
			});

			it('should not validate block', () => {
				expect(chainModuleStub.validateBlockHeader).not.toHaveBeenCalled();
			});

			it('should not verify block', () => {
				expect(chainModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
				expect(bftModuleStub.verifyBlockHeader).not.toHaveBeenCalled();
			});

			it('should not call hooks', () => {
				expect(customModule0.beforeBlockApply).not.toHaveBeenCalled();
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not save block', () => {
				expect(chainModuleStub.saveBlock).not.toHaveBeenCalled();
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('hex'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.VALID_BLOCK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV2);
			});

			it('should validate block', () => {
				expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should not emit broadcast event for the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should verify the last block', () => {
				expect(chainModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
				expect(bftModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should apply the block', () => {
				expect(bftModuleStub.applyBlockHeader).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(1);
			});

			it('should save the block', () => {
				expect(chainModuleStub.saveBlock).toHaveBeenCalledWith(
					blockV2,
					stateStoreStub,
					bftModuleStub.finalizedHeight,
					{ removeFromTempTable: false },
				);
			});

			it('should broadcast with the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith('EVENT_PROCESSOR_BROADCAST_BLOCK', {
					block: blockV2,
				});
			});
		});
	});

	describe('validate', () => {
		const tx = new Transaction({
			asset: Buffer.alloc(0),
			moduleID: 3,
			assetID: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
			signatures: [],
		});
		const blockV2 = ({
			header: {
				id: Buffer.from('fakelock2'),
				version: 2,
				height: 100,
			},
			payload: [tx],
		} as unknown) as Block;

		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		it('should throw error if version is not 2', async () => {
			const blockV3 = {
				...blockV2,
				header: {
					...blockV2.header,
					version: 3,
				},
			};
			await expect(processor.validate(blockV3)).rejects.toThrow('Block version must be 2');
		});

		it('should validate basic properties of block header', async () => {
			await processor.validate(blockV2);
			expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
		});

		it('should validate payload', async () => {
			await processor.validate(blockV2);
			expect(chainModuleStub.validateTransaction).toHaveBeenCalledTimes(1);
		});

		it('should validate payload asset', async () => {
			jest.spyOn(validator, 'validate');
			await processor.validate(blockV2);
			expect(validator.validate).toHaveBeenCalledTimes(1);
			expect(validator.validate).toHaveBeenCalledWith(
				customModule0.transactionAssets[0].schema,
				expect.any(Object),
			);
		});

		it('should fail when module id does not exist', async () => {
			const block = ({
				header: {
					id: Buffer.from('fakelock2'),
					version: 2,
					height: 100,
				},
				payload: [
					new Transaction({
						asset: Buffer.alloc(0),
						moduleID: 20,
						assetID: 5,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
						signatures: [],
					}),
				],
			} as unknown) as Block;
			await expect(processor.validate(block)).rejects.toThrow('Module id 20 does not exist');
		});

		it('should fail when asset id does not exist', async () => {
			const block = ({
				header: {
					id: Buffer.from('fakelock2'),
					version: 2,
					height: 100,
				},
				payload: [
					new Transaction({
						asset: Buffer.alloc(0),
						moduleID: 3,
						assetID: 5,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
						signatures: [],
					}),
				],
			} as unknown) as Block;
			await expect(processor.validate(block)).rejects.toThrow(
				'Asset id 5 does not exist in module id 3.',
			);
		});
	});

	describe('processValidated', () => {
		const blockV1 = ({
			header: {
				id: Buffer.from('fakelock1'),
				version: 1,
				height: 99,
			},
			payload: [
				new Transaction({
					asset: Buffer.alloc(0),
					moduleID: 3,
					assetID: 0,
					fee: BigInt(10000000),
					nonce: BigInt(3),
					senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
					signatures: [],
				}),
			],
		} as unknown) as Block;

		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		describe('when block is not verifiable', () => {
			beforeEach(async () => {
				(chainModuleStub.verifyBlockHeader as jest.Mock).mockRejectedValueOnce(
					new Error('invalid block header'),
				);
				try {
					await processor.processValidated(blockV1);
				} catch (error) {
					// expected error
				}
			});

			it('should not apply the block', () => {
				expect(bftModuleStub.applyBlockHeader).not.toHaveBeenCalled();
				expect(customModule0.beforeBlockApply).not.toHaveBeenCalled();
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not save the block', () => {
				expect(chainModuleStub.saveBlock).not.toHaveBeenCalled();
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith('app:block:new', expect.anything());
			});
		});

		describe('when block is not applicable', () => {
			beforeEach(async () => {
				customModule0.beforeBlockApply.mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV1);
				} catch (err) {
					// expected error
				}
			});

			it('should call subsequent hooks', () => {
				expect(customModule0.afterBlockApply).not.toHaveBeenCalled();
				expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
				expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith('app:block:new', expect.anything());
			});
		});

		describe('when block cannot be saved', () => {
			beforeEach(async () => {
				(chainModuleStub.saveBlock as jest.Mock).mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV1);
				} catch (error) {
					// expected error
				}
			});

			it('should verify the block', () => {
				expect(chainModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
				expect(bftModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should apply the block', () => {
				expect(bftModuleStub.applyBlockHeader).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(1);
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith('app:block:new', expect.anything());
			});
		});

		describe('when block successfully processed with flag removeFromTempTable = true', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV1, {
					removeFromTempTable: true,
				});
			});

			it('should remove block from temp_blocks table', () => {
				expect(chainModuleStub.saveBlock).toHaveBeenCalledWith(
					blockV1,
					stateStoreStub,
					bftModuleStub.finalizedHeight,
					{
						removeFromTempTable: true,
					},
				);
			});
		});

		describe('when block successfully processed', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV1);
			});

			it('should verify the block', () => {
				expect(chainModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
				expect(bftModuleStub.verifyBlockHeader).toHaveBeenCalledTimes(1);
			});

			it('should apply the block', () => {
				expect(bftModuleStub.applyBlockHeader).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterBlockApply).toHaveBeenCalledTimes(1);
				expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(1);
				expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(1);
			});

			it('should save the block', () => {
				expect(chainModuleStub.saveBlock).toHaveBeenCalledWith(
					blockV1,
					stateStoreStub,
					bftModuleStub.finalizedHeight,
					{
						removeFromTempTable: false,
					},
				);
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});
		});
	});

	describe('deleteLastBlock', () => {
		describe('when everything is successful', () => {
			beforeEach(async () => {
				await processor.deleteLastBlock();
			});

			it('should call remove from chainModule', () => {
				expect(chainModuleStub.removeBlock).toHaveBeenCalledWith(defaultLastBlock, stateStoreStub, {
					saveTempBlock: false,
				});
			});
		});
	});

	describe('validateTransaction', () => {
		const tx = new Transaction({
			asset: Buffer.alloc(0),
			moduleID: 3,
			assetID: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
			signatures: [],
		});
		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		it('should throw if module is not registered', () => {
			expect(() =>
				processor.validateTransaction(
					new Transaction({
						asset: Buffer.from('0a0873d34d3420737472', 'hex'),
						moduleID: 99,
						assetID: 0,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Module id 99 does not exist');
		});

		it('should throw if asset is not registered', () => {
			expect(() =>
				processor.validateTransaction(
					new Transaction({
						asset: Buffer.from('0a0873d34d3420737472', 'hex'),
						moduleID: 3,
						assetID: 99,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Asset id 99 does not exist in module id 3');
		});

		it('should throw if root schema is invalid', () => {
			(chainModuleStub.validateTransaction as jest.Mock).mockImplementation(() => {
				throw new Error('Lisk validator found 1 error');
			});
			expect(() =>
				processor.validateTransaction(
					new Transaction({
						asset: Buffer.from('0a0873d34d3420737472', 'hex'),
						moduleID: 3,
						assetID: 0,
						fee: BigInt(10000000),
						nonce: BigInt(-3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Lisk validator found 1 error');
		});

		it('should throw if asset validation fails', () => {
			customModule0.transactionAssets[0].validate.mockImplementation(() => {
				throw new Error('invalid tx');
			});
			expect(() => processor.validateTransaction(tx)).toThrow('invalid tx');
		});

		it('should not throw transaction is valid', () => {
			expect(() => processor.validateTransaction(tx)).not.toThrow();
		});
	});

	describe('verifyTransaction', () => {
		const tx = new Transaction({
			asset: Buffer.alloc(0),
			moduleID: 3,
			assetID: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
			signatures: [],
		});
		const tx2 = new Transaction({
			asset: Buffer.from('0a08736f6d6520737472', 'hex'),
			moduleID: 3,
			assetID: 0,
			fee: BigInt(10100000),
			nonce: BigInt(4),
			senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
			signatures: [],
		});
		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		it('should not verify if transaction input is empty', async () => {
			await processor.verifyTransactions([], stateStoreStub);
			expect(customModule0.beforeTransactionApply).not.toHaveBeenCalled();
			expect(customModule0.afterTransactionApply).not.toHaveBeenCalled();
		});

		it('should call all hooks for transaction', async () => {
			await processor.verifyTransactions([tx, tx2], stateStoreStub);
			expect(customModule0.beforeTransactionApply).toHaveBeenCalledTimes(2);
			expect(customModule0.transactionAssets[0].apply).toHaveBeenCalledTimes(2);
			expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(2);
			expect(customModule1.afterTransactionApply).toHaveBeenCalledTimes(2);
		});

		it('should reject if module id does not exist', async () => {
			await expect(
				processor.verifyTransactions(
					[
						new Transaction({
							asset: Buffer.alloc(0),
							moduleID: 99,
							assetID: 0,
							fee: BigInt(10000000),
							nonce: BigInt(3),
							senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
							signatures: [],
						}),
					],
					stateStoreStub,
				),
			).rejects.toThrow('Module id 99 does not exist');
		});

		it('should reject if asset id does not exist', async () => {
			await expect(
				processor.verifyTransactions(
					[
						new Transaction({
							asset: Buffer.alloc(0),
							moduleID: 4,
							assetID: 0,
							fee: BigInt(10000000),
							nonce: BigInt(3),
							senderPublicKey: Buffer.from('0a08736f6d6520737472', 'hex'),
							signatures: [],
						}),
					],
					stateStoreStub,
				),
			).rejects.toThrow('Asset id 0 does not exist in module id 4');
		});

		it('should resolve transaction is valid', async () => {
			await expect(
				processor.verifyTransactions([tx, tx2], stateStoreStub),
			).resolves.toBeUndefined();
		});
	});

	// TODO: this is private function, so there should be better way to test it from outside
	describe('_createReducerHandler', () => {
		beforeEach(() => {
			processor.register(customModule0);
			processor.register(customModule1);
		});

		it('should reject if format name is invalid', async () => {
			const handler = processor['_createReducerHandler'](stateStoreStub);
			await expect(handler.invoke('customModule0:testing:input', { input: 0 })).rejects.toThrow(
				'Invalid format to call reducer',
			);
		});

		it('should reject if function is not registered', async () => {
			const handler = processor['_createReducerHandler'](stateStoreStub);
			await expect(handler.invoke('customModule0:notFound', { input: 0 })).rejects.toThrow(
				'notFound does not exist in module customModule0',
			);
		});

		it('should resolve to the response of the reducer', async () => {
			customModule0.reducers.testing.mockResolvedValue(BigInt(200));
			const handler = processor['_createReducerHandler'](stateStoreStub);
			const res = await handler.invoke('customModule0:testing', { input: 0 });
			expect(res).toEqual(BigInt(200));
			expect(customModule0.reducers.testing).toHaveBeenCalledWith({ input: 0 }, expect.anything());
		});
	});
});
