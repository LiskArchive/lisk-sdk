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

'use strict';

jest.mock('../../../../../../src/application/node/utils/jobs_queue');

const { when } = require('jest-when');
const { BFT } = require('@liskhq/lisk-bft');

const jobQueue = require('../../../../../../src/application/node/utils/jobs_queue');

const Node = require('../../../../../../src/application/node/node');
const {
	Synchronizer,
} = require('../../../../../../src/application/node/synchronizer/synchronizer');
const {
	Processor,
} = require('../../../../../../src/application/node/processor');
const {
	Forger,
	HighFeeForgingStrategy,
} = require('../../../../../../src/application/node/forger');
const { cacheConfig, nodeOptions } = require('../../../../../fixtures/node');

describe('Node', () => {
	let node;
	let subscribedEvents;
	const stubs = {};
	const lastBlock = { ...nodeOptions.genesisBlock };

	beforeEach(async () => {
		// Arrange
		subscribedEvents = {};

		jest.spyOn(Processor.prototype, 'init').mockResolvedValue(null);
		jest.spyOn(Synchronizer.prototype, 'init').mockResolvedValue(null);

		/* Arranging Stubs start */
		stubs.logger = {
			trace: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			fatal: jest.fn(),
			info: jest.fn(),
			cleanup: jest.fn(),
		};

		stubs.cache = {
			cleanup: jest.fn(),
		};
		stubs.storage = {
			cleanup: jest.fn(),
			entities: {
				Block: {
					get: jest.fn().mockResolvedValue([]),
					count: jest.fn().mockResolvedValue(0),
				},
				ChainMeta: { getKey: jest.fn() },
			},
		};
		stubs.modules = {
			module1: {
				cleanup: jest.fn().mockResolvedValue('module1cleanup'),
			},
			module2: {
				cleanup: jest.fn().mockResolvedValue('module2cleanup'),
			},
		};

		stubs.webSocket = {
			listen: jest.fn(),
			removeAllListeners: jest.fn(),
			destroy: jest.fn(),
		};

		stubs.channel = {
			invoke: jest.fn(),
			subscribe: jest.fn((event, cb) => {
				subscribedEvents[event] = cb;
			}),
			once: jest.fn(),
		};

		stubs.applicationState = {};

		stubs.jobsQueue = {
			register: jest.spyOn(jobQueue, 'register'),
		};

		when(stubs.channel.invoke)
			.calledWith('app:getComponentConfig', 'cache')
			.mockResolvedValue(cacheConfig);

		when(stubs.storage.entities.Block.get)
			.calledWith({}, { sort: 'height:desc', limit: 1, extended: true })
			.mockResolvedValue(lastBlock);

		// Act
		const params = {
			channel: stubs.channel,
			storage: stubs.storage,
			logger: stubs.logger,
			options: nodeOptions,
			applicationState: stubs.applicationState,
		};

		node = new Node(params);
	});

	describe('constructor', () => {
		it('should accept channel as first parameter and assign to object instance', () => {
			// Assert
			return expect(node.channel).toEqual(stubs.channel);
		});
		it('should accept options as second parameter and assign to object instance', () => {
			// Assert
			return expect(node.options).toEqual(nodeOptions);
		});
		it('should initialize class properties', async () => {
			expect(node.logger).toEqual(stubs.logger);
			expect(node.storage).toEqual(stubs.storage);
			expect(node.channel).toEqual(stubs.channel);
			expect(node.components).toBeNull();
			expect(node.sequence).toBeNull();
			expect(node.registeredTransactions).toBeNull();
			expect(node.genesisBlock).toBeNull();
		});
	});

	describe('actions', () => {
		beforeEach(async () => {
			node.modules = {
				chain: {
					getHighestCommonBlock: jest.fn(),
				},
			};
			node.logger = {
				debug: jest.fn(),
			};
		});
	});

	describe('bootstrap', () => {
		beforeEach(async () => {
			// Act
			await node.bootstrap();
		});

		it('should be an async function', () => {
			return expect(node.bootstrap.constructor.name).toEqual('AsyncFunction');
		});

		describe('when options.rebuildUpToRound is set to an integer value', () => {
			beforeEach(async () => {
				// Arrange
				node = new Node({
					channel: {
						invoke: jest.fn(),
						subscribe: jest.fn((event, cb) => {
							subscribedEvents[event] = cb;
						}),
						once: jest.fn(),
					},
					options: {
						...nodeOptions,
						rebuildUpToRound: 0,
					},
					logger: stubs.logger,
					storage: stubs.storage,
				});

				// Act
				await node.bootstrap();
			});

			it('should not subscribe to event', () => {
				return expect(node.channel.subscribe).not.toHaveBeenCalledWith(
					'app:processor:broadcast',
					expect.anything(),
				);
			});
		});

		it('should throw error when genesisBlock option is not provided', async () => {
			// Arrange
			node = new Node({
				channel: stubs.channel,
				logger: stubs.logger,
				options: { ...nodeOptions, genesisBlock: null },
			});

			// Act
			await node.bootstrap();

			// Assert
			expect(node.logger.fatal).toHaveBeenCalledTimes(1);
			expect(node.logger.fatal).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Missing genesis block' }),
				'Failed to initialization node',
			);
		});

		it('should throw error when waitThreshold is greater than blockTime', async () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					blockTime: 4,
				},
			};

			node = new Node({
				channel: stubs.channel,
				options: invalidChainOptions,
				logger: stubs.logger,
			});

			await node.bootstrap();

			expect(node.logger.fatal).toHaveBeenCalledTimes(1);
			// Ignoring the error object as its non-deterministic
			expect(node.logger.fatal).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining(
						'app.node.forging.waitThreshold=5 is greater or equal to app.genesisConfig.blockTime=4',
					),
				}),
				'Failed to initialization node',
			);
		});

		it('should throw error when waitThreshold is same as blockTime', async () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					blockTime: 5,
				},
			};

			node = new Node({
				channel: stubs.channel,
				options: invalidChainOptions,
				logger: stubs.logger,
			});

			await node.bootstrap();

			expect(node.logger.fatal).toHaveBeenCalledTimes(1);
			expect(node.logger.fatal).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining(
						'app.node.forging.waitThreshold=5 is greater or equal to app.genesisConfig.blockTime=5',
					),
				}),
				'Failed to initialization node',
			);
		});

		it('should initialize scope object with valid structure', async () => {
			// @todo write a snapshot tests after migrated this test to jest.
			expect(node).toHaveProperty('config');
			expect(node).toHaveProperty('genesisBlock.block');
			expect(node).toHaveProperty('sequence');
			expect(node).toHaveProperty('components.logger');
			expect(node).toHaveProperty('channel');
			expect(node).toHaveProperty('applicationState');
		});

		describe('_initModules', () => {
			it('should initialize bft module', async () => {
				expect(node.bft).toBeInstanceOf(BFT);
				expect(node.modules.bft).toBeInstanceOf(BFT);
			});

			it('should initialize forger module', async () => {
				expect(node.forger).toBeInstanceOf(Forger);
				expect(node.modules.forger).toBe(node.forger);
			});

			it('should initialize forger module with high fee strategy', async () => {
				expect(node.forger.forgingStrategy).toBeInstanceOf(
					HighFeeForgingStrategy,
				);
			});
		});

		it('should invoke Processor.init', async () => {
			expect(node.processor.init).toHaveBeenCalledTimes(1);
		});

		it('should invoke "app:updateApplicationState" with correct params', () => {
			// Assert
			return expect(node.channel.invoke).toHaveBeenCalledWith(
				'app:updateApplicationState',
				{
					height: lastBlock.height,
					blockVersion: lastBlock.version,
					maxHeightPrevoted: 0,
					lastBlockId: lastBlock.id,
				},
			);
		});

		it('should subscribe to "app:state:updated" event', () => {
			return expect(node.channel.subscribe).toHaveBeenCalledWith(
				'app:state:updated',
				expect.any(Function),
			);
		});

		it('should subscribe to "network:subscribe" event', () => {
			return expect(node.channel.subscribe).toHaveBeenCalledWith(
				'app:networkEvent',
				expect.any(Function),
			);
		});

		it('should start transaction pool', () => {
			jest.spyOn(node.transactionPool, 'start');
			subscribedEvents['app:ready']();
			return expect(node.transactionPool.start).toHaveBeenCalled();
		});

		describe('if any error thrown', () => {
			let processEmitStub;
			beforeEach(async () => {
				// Arrange
				node = new Node({
					channel: stubs.channel,
					options: {
						...nodeOptions,
						genesisBlock: null,
					},
					logger: stubs.logger,
					storage: stubs.storage,
				});
				processEmitStub = jest.spyOn(process, 'emit');

				// Act
				try {
					await node.bootstrap();
				} catch (e) {
					// ignore
				}
			});

			it('should log "Failed to initialization node module"', async () => {
				expect(node.logger.fatal).toHaveBeenCalledWith(
					expect.any(Object),
					'Failed to initialization node',
				);
			});
			it('should emit an event "cleanup" on the process', () => {
				return expect(processEmitStub).toHaveBeenCalledWith(
					'cleanup',
					expect.any(Object),
				);
			});
		});
	});

	describe('cleanup', () => {
		beforeEach(async () => {
			// Arrange
			await node.bootstrap();
		});

		it('should be an async function', () => {
			// Assert
			return expect(node.cleanup.constructor.name).toEqual('AsyncFunction');
		});

		it('should call transactionPool.stop', async () => {
			jest.spyOn(node.transactionPool, 'stop');
			await node.cleanup();
			// Assert
			expect(node.transactionPool.stop).toHaveBeenCalled();
		});

		it('should call cleanup on all modules', async () => {
			// replace with stub
			node.modules = stubs.modules;
			// Act
			await node.cleanup();

			// Assert
			expect(stubs.modules.module1.cleanup).toHaveBeenCalled();
			return expect(stubs.modules.module2.cleanup).toHaveBeenCalled();
		});
	});

	describe('#_forgingTask', () => {
		beforeEach(async () => {
			await node.bootstrap();
			jest.spyOn(node.forger, 'delegatesEnabled').mockReturnValue(true);
			jest.spyOn(node.forger, 'forge');
			jest.spyOn(node.sequence, 'add').mockImplementation(async fn => {
				await fn();
			});
			jest.spyOn(node.synchronizer, 'isActive', 'get').mockReturnValue(false);
		});

		it('should halt if no delegates are enabled', async () => {
			// Arrange
			node.forger.delegatesEnabled.mockReturnValue(false);

			// Act
			await node._forgingTask();

			// Assert
			expect(stubs.logger.trace).toHaveBeenNthCalledWith(
				1,
				'No delegates are enabled',
			);
			expect(node.sequence.add).toHaveBeenCalled();
			expect(node.forger.forge).not.toHaveBeenCalled();
		});

		it('should halt if the client is not ready to forge (is syncing)', async () => {
			// Arrange
			jest.spyOn(node.synchronizer, 'isActive', 'get').mockReturnValue(true);

			// Act
			await node._forgingTask();

			// Assert
			expect(stubs.logger.debug).toHaveBeenNthCalledWith(
				1,
				'Client not ready to forge',
			);
			expect(node.sequence.add).toHaveBeenCalled();
			expect(node.forger.forge).not.toHaveBeenCalled();
		});

		it('should execute forger.forge otherwise', async () => {
			await node._forgingTask();

			expect(node.sequence.add).toHaveBeenCalled();
			expect(node.forger.forge).toHaveBeenCalled();
		});
	});

	describe('#_startForging', () => {
		beforeEach(async () => {
			await node.bootstrap();
			jest.spyOn(node.forger, 'loadDelegates');
		});

		it('should load the delegates', async () => {
			await node._startForging();
			expect(node.forger.loadDelegates).toHaveBeenCalled();
		});

		it('should register a task in Jobs Queue named "nextForge" with a designated interval', async () => {
			const forgeInterval = 1000;
			await node._startForging();

			expect(stubs.jobsQueue.register).toHaveBeenCalledWith(
				'nextForge',
				expect.any(Function),
				forgeInterval,
			);
		});
	});
});
