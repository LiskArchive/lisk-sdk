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

'use strict';

const { ForkStatus } = require('@liskhq/lisk-bft');
const {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
} = require('./block_processor');
const {
	Processor,
} = require('../../../../../../../src/application/node/processor');
const {
	Sequence,
} = require('../../../../../../../src/application/node/utils/sequence');

describe('processor', () => {
	const defaultLastBlock = {
		id: 'lastId',
		version: 0,
		height: 98,
	};

	let processor;
	let channelStub;
	let loggerStub;
	let chainModuleStub;
	let blockProcessorV0;
	let stateStoreStub;

	beforeEach(async () => {
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
		chainModuleStub = {
			init: jest.fn(),
			save: jest.fn(),
			remove: jest.fn(),
			exists: jest.fn(),
			newStateStore: jest.fn().mockResolvedValue(stateStoreStub),
		};
		Object.defineProperty(chainModuleStub, 'lastBlock', {
			get: jest.fn().mockReturnValue(defaultLastBlock),
		});
		processor = new Processor({
			channel: channelStub,
			logger: loggerStub,
			chainModule: chainModuleStub,
		});

		blockProcessorV0 = new FakeBlockProcessorV0();
	});

	describe('constructor', () => {
		describe('when the instance is created', () => {
			it('should initialize the processors', async () => {
				expect(processor.processors).toEqual({});
			});

			it('should initialize the matchers', async () => {
				expect(processor.matchers).toEqual({});
			});

			it('should initialize the sequence', async () => {
				expect(processor.sequence).toBeInstanceOf(Sequence);
			});

			it('should assign channel to its context', async () => {
				expect(processor.channel).toBe(channelStub);
			});

			it('should assign blocks module to its context', async () => {
				expect(processor.chainModule).toBe(chainModuleStub);
			});

			it('should assign logger to its context', async () => {
				expect(processor.logger).toBe(loggerStub);
			});
		});
	});

	describe('register', () => {
		describe('when processor is register without version property', () => {
			it('should throw an error', async () => {
				expect(() => processor.register({})).toThrow(
					'version property must exist for processor',
				);
			});
		});

		describe('when processor is register without matcher', () => {
			it('should set the processors with the version key', async () => {
				processor.register(blockProcessorV0);
				expect(processor.processors[0]).toBe(blockProcessorV0);
			});

			it('should set a functions always return true to the matchers with the version key', async () => {
				processor.register(blockProcessorV0);
				expect(processor.matchers[0]()).toBe(true);
			});
		});

		describe('when processor is register with matcher', () => {
			it('should set the processor with the version key', async () => {
				processor.register(blockProcessorV0, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor.processors[0]).toBe(blockProcessorV0);
			});

			it('should set the functions to the matchers with the version key', async () => {
				processor.register(blockProcessorV0, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor.matchers[0]({ height: 0 })).toBe(true);
				expect(processor.matchers[0]({ height: 10 })).toBe(false);
			});
		});
	});

	describe('init', () => {
		const genesisBlock = { id: 'fakeGenesisBlock', version: 0 };

		let initSteps;
		let applyGenesisSteps;

		beforeEach(async () => {
			initSteps = [jest.fn(), jest.fn()];
			applyGenesisSteps = [jest.fn(), jest.fn()];
			blockProcessorV0.init.pipe(initSteps);
			blockProcessorV0.applyGenesis.pipe(applyGenesisSteps);
			processor.register(blockProcessorV0);
		});

		describe('when genesis block does not exist on the storage', () => {
			beforeEach(async () => {
				chainModuleStub.exists.mockResolvedValue(false);

				await processor.init(genesisBlock);
			});

			it('should call chainModule init', async () => {
				expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			});

			it('should check if genesis block exists', async () => {
				expect(chainModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should call all of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: genesisBlock, stateStore: stateStoreStub },
						undefined,
					);
				});
			});

			it('should save the genesis block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					genesisBlock,
					stateStoreStub,
					{ saveOnlyState: false },
				);
			});
		});

		describe('when the genesis block already exists', () => {
			beforeEach(async () => {
				chainModuleStub.exists.mockResolvedValue(true);

				await processor.init(genesisBlock);
			});

			it('should call chainModule init', async () => {
				expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
			});

			it('should check if genesis block exists', async () => {
				expect(chainModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should not call any of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the genesis block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});
		});

		describe('when processor has multiple block processor registered', () => {
			let initSteps2;
			let blockProcessorV1;

			beforeEach(async () => {
				initSteps2 = [jest.fn(), jest.fn()];
				blockProcessorV1 = new FakeBlockProcessorV1();
				blockProcessorV1.init.pipe(initSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call all of the init steps', async () => {
				await processor.init(genesisBlock);
				for (const step of initSteps2) {
					expect(step).toHaveBeenCalledTimes(1);
				}
			});
		});

		describe('when processor fails to initialize', () => {
			it('should throw an error', async () => {
				initSteps[0].mockRejectedValue(new Error('failed to proceess init'));
				await expect(processor.init(genesisBlock)).rejects.toThrow(
					'failed to proceess init',
				);
			});
		});
	});

	describe('process', () => {
		const blockV0 = { id: 'fakelock1', version: 0, height: 99 };
		const blockV1 = { id: 'fakelock2', version: 1, height: 100 };

		let forkSteps;
		let validateSteps;
		let verifySteps;
		let applySteps;
		let undoSteps;

		beforeEach(async () => {
			forkSteps = [jest.fn().mockResolvedValue(1)];
			validateSteps = [jest.fn(), jest.fn()];
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			undoSteps = [jest.fn(), jest.fn()];
			blockProcessorV0.forkStatus.pipe(forkSteps);
			blockProcessorV0.validate.pipe(validateSteps);
			blockProcessorV0.verify.pipe(verifySteps);
			blockProcessorV0.apply.pipe(applySteps);
			blockProcessorV0.undo.pipe(undoSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.process(blockV1)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.process(blockV0);
				forkSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV1;
			let forkSteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				forkSteps2 = [jest.fn(), jest.fn()];
				forkSteps2[1].mockResolvedValue(2);
				blockProcessorV1.forkStatus.pipe(forkSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.process(blockV1);
				forkSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when the fork step returns unknown fork status', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(undefined);
			});

			it('should throw an error', async () => {
				await expect(processor.process(blockV0)).rejects.toThrow(
					'Unknown fork status',
				);
			});
		});

		describe('when the fork step returns ForkStatus.IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.IDENTICAL_BLOCK);
				await processor.process(blockV0);
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish any event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns ForkStatus.DOUBLE_FORGING', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DOUBLE_FORGING);
				await processor.process(blockV0);
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish fork event', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: blockV0,
				});
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and success to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.TIE_BREAK);
				await processor.process(blockV0);
			});

			it('should publish fork event', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: blockV0,
				});
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							stateStore: stateStoreStub,
							block: blockV0,
							lastBlock: defaultLastBlock,
						},
						undefined,
					);
				});
			});

			it('should save the block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV0,
					stateStoreStub,
					{ removeFromTempTable: false },
				);
			});

			it('should emit broadcast event for the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'app:block:broadcast',
					{ block: blockV0 },
				);
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and fail to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.TIE_BREAK);
				try {
					await processor.process(blockV0);
				} catch (err) {
					// Expected error
				}
			});

			it('should publish fork event', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: blockV0,
				});
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should not emit broadcast event for the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should verify the last block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should apply the last block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should save the last block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
				);
			});
		});

		describe('when the fork step returns ForkStatus.DIFFERENT_CHAIN', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DIFFERENT_CHAIN);
				await processor.process(blockV0);
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish sync', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:sync', {
					block: blockV0,
				});
			});

			it('should publish fork event', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: blockV0,
				});
			});
		});

		describe('when the fork step returns ForkStatus.DISCARD', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DISCARD);
				await processor.process(blockV0);
			});

			it('should not validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish fork event', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: blockV0,
				});
			});
		});

		describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.VALID_BLOCK);
				await processor.process(blockV0);
			});

			it('should validate block', async () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should verify block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should apply block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should save block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledTimes(1);
			});

			it('should broadcast with the block', async () => {
				expect(channelStub.publish).toHaveBeenCalledWith(
					'app:block:broadcast',
					{ block: blockV0 },
				);
			});
		});
	});

	describe('create', () => {
		const createInput = {
			timestamp: 777,
			keyPair: {
				publicKey: Buffer.from('publicKey', 'utf8'),
				privateKey: Buffer.from('privateKey', 'utf8'),
			},
			previousBlock: defaultLastBlock,
		};

		const createResult = {
			id: 'fakeNewBlock',
		};

		let createSteps;

		beforeEach(async () => {
			createSteps = [jest.fn(), jest.fn().mockResolvedValue(createResult)];
			blockProcessorV0.create.pipe(createSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.create(createInput);
				createSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV1;
			let createSteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				createSteps2 = [jest.fn(), jest.fn().mockResolvedValue(2)];
				blockProcessorV1.create.pipe(createSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call create pipelines with matching processor', async () => {
				await processor.create(createInput);
				createSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when create is called', () => {
			it('should return the result of create pipeline', async () => {
				const result = await processor.create(createInput);
				expect(result).toEqual(createResult);
			});
		});
	});

	describe('validate', () => {
		const blockV0 = { id: 'fakelock1', version: 0, height: 99 };
		const blockV1 = { id: 'fakelock2', version: 1, height: 100 };

		let validateSteps;

		beforeEach(async () => {
			validateSteps = [jest.fn(), jest.fn()];
			blockProcessorV0.validate.pipe(validateSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should call validate pipelines with matching processor', async () => {
				await processor.validate(blockV0);
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV1;
			let validateSteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				validateSteps2 = [jest.fn(), jest.fn()];
				blockProcessorV1.validate.pipe(validateSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call validate pipelines with matching processor', async () => {
				await processor.validate(blockV1);
				validateSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});
	});

	describe('processValidated', () => {
		const blockV0 = { id: 'fakelock1', version: 0, height: 99 };
		const blockV1 = { id: 'fakelock2', version: 1, height: 100 };

		let verifySteps;
		let applySteps;

		beforeEach(async () => {
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			blockProcessorV0.verify.pipe(verifySteps);
			blockProcessorV0.apply.pipe(applySteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.processValidated(blockV1)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call verify pipelines with matching processor', async () => {
				await processor.processValidated(blockV0);
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processors are registered', () => {
			let blockProcessorV1;
			let verifySteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				verifySteps2 = [jest.fn(), jest.fn()];
				blockProcessorV1.verify.pipe(verifySteps2);
				processor.register(blockProcessorV1);
			});

			it('should call verify pipelines with matching processor', async () => {
				await processor.processValidated(blockV1);
				verifySteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when block is not verifiable', () => {
			beforeEach(async () => {
				verifySteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV0);
				} catch (error) {
					// expected error
				}
			});

			it('should not apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block is not applicable', () => {
			beforeEach(async () => {
				applySteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV0);
				} catch (err) {
					// expected error
				}
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it.todo(
				'should not save the block (figure out how to test if database tx was rolled back)',
			);

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block cannot be saved', () => {
			beforeEach(async () => {
				chainModuleStub.save.mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV0);
				} catch (error) {
					// expected error
				}
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalled();
				});
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block successfully processed with flag removeFromTempTable = true', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV0, {
					removeFromTempTable: true,
				});
			});

			it('should remove block from temp_blocks table', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV0,
					stateStoreStub,
					{ removeFromTempTable: true },
				);
			});
		});

		describe('when block successfully processed', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV0);
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should save the block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV0,
					stateStoreStub,
					{ removeFromTempTable: false },
				);
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});
		});
	});

	describe('apply', () => {
		const blockV0 = { id: 'fakelock1', version: 0, height: 99 };
		const blockV1 = { id: 'fakelock2', version: 1, height: 100 };

		let verifySteps;
		let applySteps;

		beforeEach(async () => {
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			blockProcessorV0.verify.pipe(verifySteps);
			blockProcessorV0.apply.pipe(applySteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.apply(blockV1)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call apply pipelines with matching processor', async () => {
				await processor.apply(blockV0);
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV1;
			let verifySteps2;

			beforeEach(async () => {
				blockProcessorV1 = new FakeBlockProcessorV1();
				verifySteps2 = [jest.fn(), jest.fn()];
				blockProcessorV1.verify.pipe(verifySteps2);
				processor.register(blockProcessorV1);
			});

			it('should call verify pipelines with matching processor', async () => {
				await processor.apply(blockV1);
				verifySteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when block is not verifiable', () => {
			beforeEach(async () => {
				verifySteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.apply(blockV0);
				} catch (error) {
					// expected error
				}
			});

			it('should not apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the block', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block is not applicable', () => {
			beforeEach(async () => {
				applySteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.apply(blockV0);
				} catch (err) {
					// expected error
				}
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							skipExistingCheck: true,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it.todo(
				'should not save the block (figure out how to test if database tx was rolled back)',
			);

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block cannot be saved', () => {
			beforeEach(async () => {
				chainModuleStub.save.mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.apply(blockV0);
				} catch (error) {
					// expected error
				}
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							skipExistingCheck: true,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							skipExistingCheck: true,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block successfully processed', () => {
			beforeEach(async () => {
				await processor.apply(blockV0);
			});

			it('should verify the block', async () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
							skipExistingCheck: true,
						},
						undefined,
					);
				});
			});

			it('should apply the block', async () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV0,
							lastBlock: defaultLastBlock,
							skipExistingCheck: true,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should not save the block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV0,
					stateStoreStub,
					{
						saveOnlyState: true,
						removeFromTempTable: false,
					},
				);
			});

			it('should not broadcast the block', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', async () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});
	});

	describe('deleteLastBlock', () => {
		let undoSteps;

		beforeEach(async () => {
			undoSteps = [jest.fn(), jest.fn()];
			blockProcessorV0.undo.pipe(undoSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when undo step fails', () => {
			beforeEach(async () => {
				undoSteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.deleteLastBlock();
				} catch (error) {
					// expected error
				}
			});

			it('should not call remove of chainModule', async () => {
				expect(chainModuleStub.remove).not.toHaveBeenCalled();
			});
		});

		describe('when removing block fails', () => {
			beforeEach(async () => {
				chainModuleStub.remove.mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.deleteLastBlock();
				} catch (error) {
					// expected error
				}
			});

			it('should call undo steps', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});
		});

		describe('when everything is successful', () => {
			beforeEach(async () => {
				await processor.deleteLastBlock();
			});

			it('should call undo steps', async () => {
				undoSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should call remove from chainModule', async () => {
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});
		});
	});

	describe('applyGenesisBlock', () => {
		const genesisBlock = {
			version: 0,
			height: 1,
			id: 'genesis',
		};

		let applyGenesisSteps;

		beforeEach(async () => {
			applyGenesisSteps = [jest.fn(), jest.fn()];
			blockProcessorV0.applyGenesis.pipe(applyGenesisSteps);
			processor.register(blockProcessorV0, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when genesis block is not stored yet', () => {
			beforeEach(async () => {
				chainModuleStub.exists.mockResolvedValue(false);
			});

			it('should call exists on chainModule', async () => {
				try {
					await processor.applyGenesisBlock(genesisBlock, true);
				} catch (err) {
					// expected error
				}

				// Assert && Act
				expect(chainModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should throw an error', async () => {
				await expect(
					processor.applyGenesisBlock(genesisBlock, true),
				).rejects.toThrow();
			});
		});

		describe('when genesis block is stored already (rebuilding)', () => {
			beforeEach(async () => {
				chainModuleStub.exists.mockResolvedValue(true);
				await processor.applyGenesisBlock(genesisBlock, true);
			});

			it('should call exists on chainModule', async () => {
				expect(chainModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should apply genesis block', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: genesisBlock, stateStore: stateStoreStub },
						undefined,
					);
				});
			});

			it('should not save the block', async () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					genesisBlock,
					stateStoreStub,
					{ saveOnlyState: true },
				);
			});
		});

		describe('when apply fails when skip is false and genesis block is not stored', () => {
			beforeEach(async () => {
				chainModuleStub.exists.mockResolvedValue(false);
				applyGenesisSteps[0].mockRejectedValue(new Error('apply error'));
				try {
					await processor.applyGenesisBlock(genesisBlock, false);
				} catch (err) {
					// expected error
				}
			});

			it('should call exists on chainModule', async () => {
				expect(chainModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should not save genesis block with saveOnlyState', async () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});
		});
	});
});
