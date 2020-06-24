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

import { Block, BlockHeader } from '@liskhq/lisk-chain';
import { ForkStatus } from '@liskhq/lisk-bft';
import {
	FakeBlockProcessorV0,
	FakeBlockProcessorV1,
	FakeBlockProcessorV2,
} from './block_processor';
import { Processor } from '../../../../../../src/application/node/processor';
import { Sequence } from '../../../../../../src/application/node/utils/sequence';

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
	let chainModuleStub: any;
	let bftModuleStub: any;
	let genesisBlockProcessor: any;
	let blockProcessorV1: any;
	let stateStoreStub: any;

	beforeEach(() => {
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
			genesisBlock: jest.fn(),
			save: jest.fn(),
			remove: jest.fn(),
			exists: jest.fn(),
			newStateStore: jest.fn().mockResolvedValue(stateStoreStub),
			dataAccess: {
				encode: jest.fn(),
				decode: jest.fn(),
			},
		};
		bftModuleStub = {
			finalityManager: {
				finalizedHeight: 5,
			},
		};

		Object.defineProperty(chainModuleStub, 'lastBlock', {
			get: jest.fn().mockReturnValue(defaultLastBlock),
		});
		processor = new Processor({
			channel: channelStub,
			logger: loggerStub,
			chainModule: chainModuleStub,
			bftModule: bftModuleStub,
		});

		genesisBlockProcessor = new FakeBlockProcessorV0();
		blockProcessorV1 = new FakeBlockProcessorV1();
	});

	describe('constructor', () => {
		describe('when the instance is created', () => {
			it('should initialize the processors', () => {
				expect(processor['processors']).toEqual({});
			});

			it('should initialize the matchers', () => {
				expect(processor['matchers']).toEqual({});
			});

			it('should initialize the sequence', () => {
				expect(processor['sequence']).toBeInstanceOf(Sequence);
			});

			it('should assign channel to its context', () => {
				expect(processor['channel']).toBe(channelStub);
			});

			it('should assign blocks module to its context', () => {
				expect(processor['chainModule']).toBe(chainModuleStub);
			});

			it('should assign logger to its context', () => {
				expect(processor['logger']).toBe(loggerStub);
			});
		});
	});

	describe('register', () => {
		describe('when processor is register without version property', () => {
			it('should throw an error', () => {
				expect(() => processor.register({} as any)).toThrow(
					'version property must exist for processor',
				);
			});
		});

		describe('when processor is register without matcher', () => {
			it('should set the processors with the version key', () => {
				processor.register(blockProcessorV1);
				expect(processor['processors'][1]).toBe(blockProcessorV1);
			});

			it('should set a functions always return true to the matchers with the version key', () => {
				processor.register(blockProcessorV1);
				expect(processor['matchers'][1]({} as any)).toBe(true);
			});
		});

		describe('when processor is register with matcher', () => {
			it('should set the processor with the version key', () => {
				processor.register(blockProcessorV1, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor['processors'][1]).toBe(blockProcessorV1);
			});

			it('should set the functions to the matchers with the version key', () => {
				processor.register(blockProcessorV1, {
					matcher: ({ height }) => height === 0,
				});
				expect(processor['matchers'][1]({ height: 0 } as BlockHeader)).toBe(
					true,
				);
				expect(processor['matchers'][1]({ height: 10 } as BlockHeader)).toBe(
					false,
				);
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
		} as unknown) as Block;

		let initSteps: jest.Mock[];
		let genesisInitSteps: jest.Mock[];

		beforeEach(() => {
			chainModuleStub.genesisBlock = genesisBlock;
			initSteps = [jest.fn(), jest.fn()];
			genesisInitSteps = [jest.fn(), jest.fn()];
			processor.register(genesisBlockProcessor, {
				matcher: header => header.version === genesisBlockProcessor.version,
			});
			genesisBlockProcessor.init.pipe(genesisInitSteps);
			genesisBlockProcessor.verify.pipe([jest.fn(), jest.fn()]);
			genesisBlockProcessor.apply.pipe([jest.fn(), jest.fn()]);
			blockProcessorV1.init.pipe(initSteps);
			processor.register(blockProcessorV1);
		});

		it('should invoke processValidated for genesis block if it does not exists in chain', async () => {
			// Arrange
			jest.spyOn(chainModuleStub, 'exists').mockResolvedValue(false);
			jest.spyOn(processor, 'processValidated');

			// Act
			await processor.init();

			// Assert
			expect(processor.processValidated).toHaveBeenCalledWith(genesisBlock, {
				removeFromTempTable: true,
			});
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
		});

		it('should not invoke processValidated for genesis block if it exists in chain', async () => {
			// Arrange
			jest.spyOn(chainModuleStub, 'exists').mockResolvedValue(true);
			jest.spyOn(processor, 'processValidated');

			// Act
			await processor.init();

			// Assert
			expect(processor.processValidated).not.toHaveBeenCalled();
			expect(chainModuleStub.init).toHaveBeenCalledTimes(1);
		});

		it('should init chainModule', () => {});

		describe('when processor has multiple block processor registered', () => {
			let initSteps2: jest.Mock[];
			let blockProcessorV2;

			beforeEach(() => {
				initSteps2 = [jest.fn(), jest.fn()];
				blockProcessorV2 = new FakeBlockProcessorV2();
				blockProcessorV2.init.pipe(initSteps2);
				processor.register(blockProcessorV2);
			});

			it('should call all of the init steps', async () => {
				await processor.init();
				for (const step of initSteps2) {
					expect(step).toHaveBeenCalledTimes(1);
				}
				for (const step of genesisInitSteps) {
					expect(step).toHaveBeenCalledTimes(1);
				}
			});
		});

		describe('when processor fails to initialize', () => {
			it('should throw an error', async () => {
				initSteps[0].mockRejectedValue(new Error('failed to proceess init'));
				await expect(processor.init()).rejects.toThrow(
					'failed to proceess init',
				);
			});
		});
	});

	describe('process', () => {
		const blockV1 = {
			header: {
				id: Buffer.from('fakelock1'),
				version: 1,
				height: 99,
			},
		} as Block;
		const blockV2 = {
			header: {
				id: Buffer.from('fakelock2'),
				version: 2,
				height: 100,
			},
		} as Block;

		const encodedBlock = Buffer.from('encoded block');

		let forkSteps: jest.Mock[];
		let validateSteps: jest.Mock[];
		let verifySteps: jest.Mock[];
		let applySteps: jest.Mock[];

		beforeEach(() => {
			forkSteps = [jest.fn().mockResolvedValue(1)];
			validateSteps = [jest.fn(), jest.fn()];
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];

			blockProcessorV1.forkStatus.pipe(forkSteps);
			blockProcessorV1.validate.pipe(validateSteps);
			blockProcessorV1.verify.pipe(verifySteps);
			blockProcessorV1.apply.pipe(applySteps);
			processor.register(blockProcessorV1, {
				matcher: ({ height }) => height < 100,
			});
			chainModuleStub.dataAccess.encode.mockReturnValue(encodedBlock);
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.process(blockV2)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.process(blockV1);
				forkSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV2;
			let forkSteps2: jest.Mock[];

			beforeEach(() => {
				blockProcessorV2 = new FakeBlockProcessorV2();
				forkSteps2 = [jest.fn(), jest.fn()];
				forkSteps2[1].mockResolvedValue(2);
				blockProcessorV2.forkStatus.pipe(forkSteps2);
				blockProcessorV2.validate.pipe([jest.fn()]);
				blockProcessorV2.verify.pipe([jest.fn()]);
				blockProcessorV2.apply.pipe([jest.fn()]);
				processor.register(blockProcessorV2);
			});

			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.process(blockV2);
				forkSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when the fork step returns unknown fork status', () => {
			beforeEach(() => {
				forkSteps[0].mockResolvedValue(undefined);
			});

			it('should throw an error', async () => {
				await expect(processor.process(blockV1)).rejects.toThrow(
					'Unknown fork status',
				);
			});
		});

		describe('when the fork step returns ForkStatus.IDENTICAL_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.IDENTICAL_BLOCK);
				await processor.process(blockV1);
			});

			it('should not validate block', () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not publish any event', () => {
				expect(channelStub.publish).not.toHaveBeenCalled();
			});
		});

		describe('when the fork step returns ForkStatus.DOUBLE_FORGING', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DOUBLE_FORGING);
				await processor.process(blockV1);
			});

			it('should not validate block', () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and success to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.TIE_BREAK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV1);
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
			});

			it('should validate block', () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', () => {
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});

			it('should verify the block', () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							stateStore: stateStoreStub,
							block: blockV1,
							lastBlock: defaultLastBlock,
						},
						undefined,
					);
				});
			});

			it('should save the block', () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV1,
					stateStoreStub,
					{ removeFromTempTable: false },
				);
			});

			it('should emit broadcast event for the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith(
					'EVENT_PROCESSOR_BROADCAST_BLOCK',
					{
						block: blockV1,
					},
				);
			});
		});

		describe('when the fork step returns ForkStatus.TIE_BREAK and fail to process', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.TIE_BREAK);
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
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should revert the last block', () => {
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should not emit broadcast event for the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should verify the last block', () => {
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
			it.skip('should apply the last block', () => {
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
			it.skip('should save the last block', () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
				);
			});
		});

		describe('when the fork step returns ForkStatus.DIFFERENT_CHAIN', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DIFFERENT_CHAIN);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV1);
			});

			it('should not validate block', () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish sync', () => {
				expect(processor.events.emit).toHaveBeenCalledWith(
					'EVENT_PROCESSOR_SYNC_REQUIRED',
					{
						block: blockV1,
					},
				);
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.DISCARD', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.DISCARD);
				await processor.process(blockV1);
			});

			it('should not validate block', () => {
				validateSteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not verify block', () => {
				verifySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not apply block', () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save block', () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should publish fork event', () => {
				expect(channelStub.publish).toHaveBeenCalledWith('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
			});
		});

		describe('when the fork step returns ForkStatus.VALID_BLOCK', () => {
			beforeEach(async () => {
				forkSteps[0].mockResolvedValue(ForkStatus.VALID_BLOCK);
				jest.spyOn(processor.events, 'emit');
				await processor.process(blockV1);
			});

			it('should validate block', () => {
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should verify block', () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should apply block', () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});

			it('should save block', () => {
				expect(chainModuleStub.save).toHaveBeenCalledTimes(1);
			});

			it('should broadcast with the block', () => {
				expect(processor.events.emit).toHaveBeenCalledWith(
					'EVENT_PROCESSOR_BROADCAST_BLOCK',
					{
						block: blockV1,
					},
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

		let createSteps: jest.Mock[];

		beforeEach(() => {
			createSteps = [jest.fn(), jest.fn().mockResolvedValue(createResult)];
			blockProcessorV1.create.pipe(createSteps);
			processor.register(blockProcessorV1, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should call forkStatus pipelines with matching processor', async () => {
				await processor.create(createInput as any);
				createSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV2;
			let createSteps2: jest.Mock[];

			beforeEach(() => {
				blockProcessorV2 = new FakeBlockProcessorV2();
				createSteps2 = [jest.fn(), jest.fn().mockResolvedValue(2)];
				blockProcessorV2.create.pipe(createSteps2);
				processor.register(blockProcessorV2);
			});

			it('should call create pipelines with matching processor', async () => {
				await processor.create(createInput as any);
				createSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when create is called', () => {
			it('should return the result of create pipeline', async () => {
				const result = await processor.create(createInput as any);
				expect(result).toEqual(createResult);
			});
		});
	});

	describe('validate', () => {
		const blockV1 = {
			header: {
				id: Buffer.from('fakelock1'),
				version: 1,
				height: 99,
			},
		} as Block;
		const blockV2 = {
			header: {
				id: Buffer.from('fakelock2'),
				version: 2,
				height: 100,
			},
		} as Block;

		let validateSteps: jest.Mock[];

		beforeEach(() => {
			validateSteps = [jest.fn(), jest.fn()];
			blockProcessorV1.validate.pipe(validateSteps);
			processor.register(blockProcessorV1, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should call validate pipelines with matching processor', async () => {
				await processor.validate(blockV1);
				validateSteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processor is registered', () => {
			let blockProcessorV2;
			let validateSteps2: jest.Mock[];

			beforeEach(() => {
				blockProcessorV2 = new FakeBlockProcessorV2();
				validateSteps2 = [jest.fn(), jest.fn()];
				blockProcessorV2.validate.pipe(validateSteps2);
				processor.register(blockProcessorV2);
			});

			it('should call validate pipelines with matching processor', async () => {
				await processor.validate(blockV2);
				validateSteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});
	});

	describe('processValidated', () => {
		const blockV1 = {
			header: {
				id: Buffer.from('fakelock1'),
				version: 1,
				height: 99,
			},
		} as Block;

		const blockV2 = {
			header: {
				id: Buffer.from('fakelock2'),
				version: 2,
				height: 100,
			},
		} as Block;

		let verifySteps: jest.Mock[];
		let applySteps: jest.Mock[];

		beforeEach(() => {
			verifySteps = [jest.fn(), jest.fn()];
			applySteps = [jest.fn(), jest.fn()];
			blockProcessorV1.verify.pipe(verifySteps);
			blockProcessorV1.apply.pipe(applySteps);
			processor.register(blockProcessorV1, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when only 1 processor is registered', () => {
			it('should throw an error if the matching block version does not exist', async () => {
				await expect(processor.processValidated(blockV2)).rejects.toThrow(
					'Block processing version is not registered',
				);
			});

			it('should call verify pipelines with matching processor', async () => {
				await processor.processValidated(blockV1);
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when more than 2 processors are registered', () => {
			let blockProcessorV2;
			let verifySteps2: jest.Mock[];

			beforeEach(() => {
				blockProcessorV2 = new FakeBlockProcessorV2();
				verifySteps2 = [jest.fn(), jest.fn()];
				blockProcessorV2.verify.pipe(verifySteps2);
				blockProcessorV2.apply.pipe([jest.fn()]);
				processor.register(blockProcessorV2);
			});

			it('should call verify pipelines with matching processor', async () => {
				await processor.processValidated(blockV2);
				verifySteps2.forEach(step => {
					expect(step).toHaveBeenCalledTimes(1);
				});
			});
		});

		describe('when block is not verifiable', () => {
			beforeEach(async () => {
				verifySteps[0].mockRejectedValue(new Error('Invalid block'));
				try {
					await processor.processValidated(blockV1);
				} catch (error) {
					// expected error
				}
			});

			it('should not apply the block', () => {
				applySteps.forEach(step => {
					expect(step).not.toHaveBeenCalled();
				});
			});

			it('should not save the block', () => {
				expect(chainModuleStub.save).not.toHaveBeenCalled();
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
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
					await processor.processValidated(blockV1);
				} catch (err) {
					// expected error
				}
			});

			it('should verify the block', () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
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

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
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
					await processor.processValidated(blockV1);
				} catch (error) {
					// expected error
				}
			});

			it('should verify the block', () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalled();
				});
			});

			it('should not broadcast the block', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:broadcast',
					expect.anything(),
				);
			});

			it('should not emit newBlock event', () => {
				expect(channelStub.publish).not.toHaveBeenCalledWith(
					'app:block:new',
					expect.anything(),
				);
			});
		});

		describe('when block successfully processed with flag removeFromTempTable = true', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV1, {
					removeFromTempTable: true,
				});
			});

			it('should remove block from temp_blocks table', () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV1,
					stateStoreStub,
					{ removeFromTempTable: true },
				);
			});
		});

		describe('when block successfully processed', () => {
			beforeEach(async () => {
				await processor.processValidated(blockV1);
			});

			it('should verify the block', () => {
				verifySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should apply the block', () => {
				applySteps.forEach(step => {
					expect(step).toHaveBeenCalledWith(
						{
							block: blockV1,
							lastBlock: defaultLastBlock,
							stateStore: stateStoreStub,
						},
						undefined,
					);
				});
			});

			it('should save the block', () => {
				expect(chainModuleStub.save).toHaveBeenCalledWith(
					blockV1,
					stateStoreStub,
					{ removeFromTempTable: false },
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
		beforeEach(() => {
			processor.register(blockProcessorV1, {
				matcher: ({ height }) => height < 100,
			});
		});

		describe('when everything is successful', () => {
			beforeEach(async () => {
				await processor.deleteLastBlock();
			});

			it('should call remove from chainModule', () => {
				expect(chainModuleStub.remove).toHaveBeenCalledWith(
					defaultLastBlock,
					stateStoreStub,
					{ saveTempBlock: false },
				);
			});
		});
	});
});
