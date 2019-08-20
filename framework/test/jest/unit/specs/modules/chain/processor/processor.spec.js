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

const {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
} = require('./block_processor');
const {
	Processor,
} = require('../../../../../../../src/modules/chain/processor');
const {
	Sequence,
} = require('../../../../../../../src/modules/chain/utils/sequence');
const {
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
	FORK_STATUS_VALID_BLOCK,
} = require('../../../../../../../src/modules/chain/blocks');

describe('processor', () => {
	let processor;
	let channelStub;
	let storageStub;
	let loggerStub;
	let blocksModuleStub;
	let blockProcessorV0;

	beforeEach(async () => {
		channelStub = {
			publish: jest.fn(),
		};
		storageStub = {
			entities: {
				Block: {
					begin: jest.fn(),
				},
			},
		};
		loggerStub = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
		};
		blocksModuleStub = {
			save: jest.fn(),
			saveGenesis: jest.fn(),
			remove: jest.fn(),
			exists: jest.fn(),
		};
		Object.defineProperty(blocksModuleStub, 'lastBlock', { get: jest.fn() });
		processor = new Processor({
			channel: channelStub,
			storage: storageStub,
			logger: loggerStub,
			blocksModule: blocksModuleStub,
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

			it('should assign storage to its context', async () => {
				expect(processor.storage).toBe(storageStub);
			});

			it('should assign blocks module to its context', async () => {
				expect(processor.blocksModule).toBe(blocksModuleStub);
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
		let txStub;

		beforeEach(async () => {
			initSteps = [jest.fn(), jest.fn()];
			applyGenesisSteps = [jest.fn(), jest.fn()];
			txStub = jest.fn();
			blockProcessorV0.init.pipe(initSteps);
			blockProcessorV0.applyGenesis.pipe(applyGenesisSteps);
			processor.register(blockProcessorV0);
		});

		describe('when genesis block does not exist on the storage', () => {
			beforeEach(async () => {
				blocksModuleStub.exists.mockResolvedValue(false);

				await processor.init(genesisBlock);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
			});

			it('should check if genesis block exists', async () => {
				expect(blocksModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should call all of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{ block: genesisBlock, tx: txStub },
						undefined,
					);
				});
			});

			it('should save the genesis block', async () => {
				expect(blocksModuleStub.saveGenesis).toHaveBeenCalledWith({
					block: genesisBlock,
					tx: txStub,
					skipSave: false,
				});
			});
		});

		describe('when the genesis block already exists', () => {
			beforeEach(async () => {
				blocksModuleStub.exists.mockResolvedValue(true);

				await processor.init(genesisBlock);
				await storageStub.entities.Block.begin.mock.calls[0][1](txStub);
			});

			it('should check if genesis block exists', async () => {
				expect(blocksModuleStub.exists).toHaveBeenCalledTimes(1);
			});

			it('should not call any of the apply genesis steps', async () => {
				applyGenesisSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the genesis block', async () => {
				expect(blocksModuleStub.saveGenesis).not.toHaveBeenCalled();
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
		let validateNewSteps;
		let validateSteps;
		let verifySteps;
		let applySteps;
		// let txStub;

		beforeEach(async () => {
			forkSteps = [jest.fn()];
			validateSteps = [jest.fn(), jest.fn()];
			validateNewSteps = [jest.fn(), jest.fn()];
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			// txStub = jest.fn();
			blockProcessorV0.fork.pipe(forkSteps);
			blockProcessorV0.validateNew.pipe(validateNewSteps);
			blockProcessorV0.validate.pipe(validateSteps);
			blockProcessorV0.verify.pipe(verifySteps);
			blockProcessorV0.apply.pipe(applySteps);
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

			it('should call fork pipelines with matching processor', async () => {
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
				blockProcessorV1.fork.pipe(forkSteps2);
				processor.register(blockProcessorV1);
			});

			it('should call fork pipelines with matching processor', async () => {
				await processor.process(blockV1);
				forkSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when the fork step returns FORK_STATUS_IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_IDENTICAL_BLOCK);
			});
		});

		describe('when the fork step returns FORK_STATUS_DOUBLE_FORGING', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DOUBLE_FORGING);
			});
		});

		describe('when the fork step returns FORK_STATUS_TIE_BREAK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_TIE_BREAK);
			});
		});

		describe('when the fork step returns FORK_STATUS_DIFFERENT_CHAIN', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DIFFERENT_CHAIN);
			});
		});

		describe('when the fork step returns FORK_STATUS_DISCARD', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_DISCARD);
			});
		});

		describe('when the fork step returns FORK_STATUS_VALID_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(FORK_STATUS_VALID_BLOCK);
			});
		});

		describe('when the block is not valid as a new block', () => {});

		describe('when the block is not valid', () => {});

		describe('when the block is fork status discarded', () => {});

		describe('when the block is fork status sync', () => {});

		describe('when the block is fork status revert', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block cannot be saved', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('create', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('validate', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});
	});

	describe('processValidated', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block cannot be saved', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('apply', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when block is not verifiable', () => {});

		describe('when block is not applicable', () => {});

		describe('when block successfully processed', () => {});
	});

	describe('deleteLastBlock', () => {
		describe('when only 1 processor is registered', () => {});

		describe('when more than 2 processor is registered', () => {});

		describe('when undo step fails', () => {});

		describe('when removing block fails', () => {});
	});
});
