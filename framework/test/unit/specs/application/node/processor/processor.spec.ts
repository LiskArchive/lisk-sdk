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
import { Processor } from '../../../../../../src/application/node/processor';

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
				expect(processor['_jobQueue']).toBeInstanceOf(jobHandlers.JobQueue);
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

			it('should register all defined functions to hooks', () => {
				processor.register(customModule0);
				processor.register(customModule1);
				expect(processor['_hooks'].afterGenesisBlockApply['stages']).toHaveLength(1);
				expect(processor['_hooks'].beforeBlockApply['stages']).toHaveLength(2);
				expect(processor['_hooks'].afterBlockApply['stages']).toHaveLength(1);
				expect(processor['_hooks'].beforeTransactionApply['stages']).toHaveLength(1);
				expect(processor['_hooks'].afterTransactionApply['stages']).toHaveLength(2);
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
			jest.spyOn(processor['_hooks'].afterGenesisBlockApply, 'run');

			// Act
			await processor.init(genesisBlock);

			// Assert
			expect(processor['_hooks'].afterGenesisBlockApply.run).toHaveBeenCalledTimes(1);
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			expect(chainModuleStub.saveBlock).toHaveBeenCalledTimes(1);
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});

		it('should not apply genesis block if it exists in chain', async () => {
			// Arrange
			jest.spyOn(chainModuleStub, 'genesisBlockExist').mockResolvedValue(true);
			jest.spyOn(processor['_hooks'].afterGenesisBlockApply, 'run');

			// Act
			await processor.init(genesisBlock);

			// Assert
			expect(processor['_hooks'].afterGenesisBlockApply.run).not.toHaveBeenCalled();
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			expect(bftModuleStub.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('process', () => {
		const blockV1 = ({
			header: {
				id: Buffer.from('fakelock1'),
				version: 1,
				height: 99,
			},
			payload: [
				new Transaction({
					asset: Buffer.alloc(0),
					moduleType: 3,
					assetType: 0,
					fee: BigInt(10000000),
					nonce: BigInt(3),
					senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
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
				await expect(processor.process(blockV1)).rejects.toThrow('Unknown fork status');
			});
		});

		describe('when the fork step returns ForkStatus.IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.IDENTICAL_BLOCK);
				await processor.process(blockV1);
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
				await processor.process(blockV1);
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
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and success to process', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.TIE_BREAK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV1);
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
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

			it('should emit broadcast event for the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith('EVENT_PROCESSOR_BROADCAST_BLOCK', {
					block: blockV1,
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
					await processor.process(blockV1);
				} catch (err) {
					// Expected error
				}
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
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
				await processor.process(blockV1);
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
					block: blockV1,
				});
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.DISCARD', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.DISCARD);
				await processor.process(blockV1);
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
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
			beforeEach(async () => {
				(bftModuleStub.forkChoice as jest.Mock).mockReturnValue(ForkStatus.VALID_BLOCK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV1);
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
					{ removeFromTempTable: false },
				);
			});

			it('should broadcast with the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith('EVENT_PROCESSOR_BROADCAST_BLOCK', {
					block: blockV1,
				});
			});
		});
	});

	describe('validate', () => {
		const tx = new Transaction({
			asset: Buffer.alloc(0),
			moduleType: 3,
			assetType: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
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

		it('should validate basic properties of block header', () => {
			processor.validate(blockV2);
			expect(chainModuleStub.validateBlockHeader).toHaveBeenCalledTimes(1);
		});

		it('should validate payload', () => {
			jest.spyOn(tx, 'validate');
			processor.validate(blockV2);
			expect(tx.validate).toHaveBeenCalledTimes(1);
		});

		it('should validate payload asset', () => {
			jest.spyOn(validator, 'validate');
			processor.validate(blockV2);
			expect(validator.validate).toHaveBeenCalledTimes(2);
			expect(validator.validate).toHaveBeenCalledWith(
				customModule0.transactionAssets[0].assetSchema,
				expect.any(Object),
			);
		});

		it('should fail when module type does not exist', () => {
			const block = ({
				header: {
					id: Buffer.from('fakelock2'),
					version: 2,
					height: 100,
				},
				payload: [
					new Transaction({
						asset: Buffer.alloc(0),
						moduleType: 20,
						assetType: 5,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
						signatures: [],
					}),
				],
			} as unknown) as Block;
			expect(() => processor.validate(block)).toThrow('Module type 20 does not exist');
		});

		it('should fail when asset type does not exist', () => {
			const block = ({
				header: {
					id: Buffer.from('fakelock2'),
					version: 2,
					height: 100,
				},
				payload: [
					new Transaction({
						asset: Buffer.alloc(0),
						moduleType: 3,
						assetType: 5,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
						signatures: [],
					}),
				],
			} as unknown) as Block;
			expect(() => processor.validate(block)).toThrow(
				'Asset type 5 does not exist in module type 3.',
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
					moduleType: 3,
					assetType: 0,
					fee: BigInt(10000000),
					nonce: BigInt(3),
					senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
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
			moduleType: 3,
			assetType: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
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
						asset: Buffer.from('Cghz0000IHN0cg==', 'base64'),
						moduleType: 99,
						assetType: 0,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Module type 99 does not exist');
		});

		it('should throw if asset is not registered', () => {
			expect(() =>
				processor.validateTransaction(
					new Transaction({
						asset: Buffer.from('Cghz0000IHN0cg==', 'base64'),
						moduleType: 3,
						assetType: 99,
						fee: BigInt(10000000),
						nonce: BigInt(3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Asset type 99 does not exist in module type 3');
		});

		it('should throw if root schema is invalid', () => {
			expect(() =>
				processor.validateTransaction(
					new Transaction({
						asset: Buffer.from('Cghz0000IHN0cg==', 'base64'),
						moduleType: 3,
						assetType: 0,
						fee: BigInt(10000000),
						nonce: BigInt(-3),
						senderPublicKey: Buffer.alloc(0),
						signatures: [],
					}),
				),
			).toThrow('Lisk validator found 1 error');
		});

		it('should throw if asset validation fails', () => {
			customModule0.transactionAssets[0].validateAsset.mockImplementation(() => {
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
			moduleType: 3,
			assetType: 0,
			fee: BigInt(10000000),
			nonce: BigInt(3),
			senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
			signatures: [],
		});
		const tx2 = new Transaction({
			asset: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
			moduleType: 3,
			assetType: 0,
			fee: BigInt(10100000),
			nonce: BigInt(4),
			senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
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
			expect(customModule0.transactionAssets[0].applyAsset).toHaveBeenCalledTimes(2);
			expect(customModule0.afterTransactionApply).toHaveBeenCalledTimes(2);
			expect(customModule1.afterTransactionApply).toHaveBeenCalledTimes(2);
		});

		it('should reject if module type does not exist', async () => {
			await expect(
				processor.verifyTransactions(
					[
						new Transaction({
							asset: Buffer.alloc(0),
							moduleType: 99,
							assetType: 0,
							fee: BigInt(10000000),
							nonce: BigInt(3),
							senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
							signatures: [],
						}),
					],
					stateStoreStub,
				),
			).rejects.toThrow('Module type 99 does not exist');
		});

		it('should reject if asset type does not exist', async () => {
			await expect(
				processor.verifyTransactions(
					[
						new Transaction({
							asset: Buffer.alloc(0),
							moduleType: 4,
							assetType: 0,
							fee: BigInt(10000000),
							nonce: BigInt(3),
							senderPublicKey: Buffer.from('Cghzb21lIHN0cg==', 'base64'),
							signatures: [],
						}),
					],
					stateStoreStub,
				),
			).rejects.toThrow('Asset type 0 does not exist in module type 4');
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
			expect(customModule0.reducers.testing).toHaveBeenCalledWith({ input: 0 }, stateStoreStub);
		});
	});
});
