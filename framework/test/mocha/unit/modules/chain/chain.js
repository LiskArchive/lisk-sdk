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

/* eslint-disable mocha/no-pending-tests */
const rewire = require('rewire');

const Chain = rewire('../../../../../src/modules/chain/chain');
const { Processor } = require('../../../../../src/modules/chain/processor');
const { BFT } = require('../../../../../src/modules/chain/bft');
const {
	loggerConfig,
	cacheConfig,
	storageConfig,
	chainOptions,
} = require('./chain.fixtures');

describe('Chain', () => {
	let chain;
	const stubs = {};

	beforeEach(async () => {
		// Arrange

		sinonSandbox.stub(Processor.prototype, 'init').resolves();

		/* Arranging Stubs start */
		stubs.logger = {
			error: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			fatal: sinonSandbox.stub(),
			info: sinonSandbox.stub(),
			cleanup: sinonSandbox.stub(),
		};

		stubs.cache = {
			cleanup: sinonSandbox.stub(),
		};
		stubs.storage = {
			cleanup: sinonSandbox.stub(),
			entities: {
				Block: { get: sinonSandbox.stub().resolves([]) },
				ChainMeta: { getKey: sinonSandbox.stub() },
			},
		};
		stubs.modules = {
			module1: {
				cleanup: sinonSandbox.stub().resolves('module1cleanup'),
			},
			module2: {
				cleanup: sinonSandbox.stub().resolves('module2cleanup'),
			},
		};

		stubs.webSocket = {
			listen: sinonSandbox.stub(),
			removeAllListeners: sinonSandbox.stub(),
			destroy: sinonSandbox.stub(),
		};

		stubs.channel = {
			invoke: sinonSandbox.stub(),
			subscribe: sinonSandbox.stub(),
			once: sinonSandbox.stub(),
		};

		stubs.jobsQueue = {
			register: sinonSandbox.stub(),
		};

		stubs.channel.invoke
			.withArgs('app:getComponentConfig', 'logger')
			.resolves(loggerConfig);
		stubs.channel.invoke
			.withArgs('app:getComponentConfig', 'storage')
			.resolves(storageConfig);
		stubs.channel.invoke
			.withArgs('app:getComponentConfig', 'cache')
			.resolves(cacheConfig);
		stubs.channel.invoke.withArgs('app:getApplicationState').resolves({});

		stubs.createLoggerComponent = sinonSandbox.stub().returns(stubs.logger);
		stubs.createCacheComponent = sinonSandbox.stub().returns(stubs.cache);
		stubs.createStorageComponent = sinonSandbox.stub().returns(stubs.storage);

		stubs.initSteps = {
			bootstrapStorage: sinonSandbox.stub(),
			bootstrapCache: sinonSandbox.stub(),
		};

		/* Arranging Stubs end */

		Chain.__set__('createLoggerComponent', stubs.createLoggerComponent);
		Chain.__set__('createCacheComponent', stubs.createCacheComponent);
		Chain.__set__('createStorageComponent', stubs.createStorageComponent);
		Chain.__set__('bootstrapStorage', stubs.initSteps.bootstrapStorage);
		Chain.__set__('bootstrapCache', stubs.initSteps.bootstrapCache);
		Chain.__set__('jobQueue', stubs.jobsQueue);

		// Act
		chain = new Chain(stubs.channel, chainOptions);
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should accept channel as first parameter and assign to object instance', () => {
			// Assert
			return expect(chain.channel).to.be.equal(stubs.channel);
		});
		it('should accept options as second parameter and assign to object instance', () => {
			// Assert
			return expect(chain.options).to.be.equal(chainOptions);
		});
		it('should assign logger, scope, blockReward, slots properties as null', () => {
			expect(chain.logger).to.be.null;
			expect(chain.scope).to.be.null;
			return expect(chain.slots).to.be.null;
		});
	});

	describe('actions', () => {
		beforeEach(async () => {
			chain.scope = {
				modules: {
					blocks: {
						getHighestCommonBlock: sinonSandbox.stub(),
					},
				},
			};
			chain.logger = {
				debug: sinonSandbox.stub(),
			};
		});

		describe('getHighestCommonBlock', () => {
			const actionQuery = {
				params: { ids: ['1', '1'] },
			};

			it('should validate the request and return a validation error and debug log it if it fails', async () => {
				try {
					await chain.actions.getHighestCommonBlock(actionQuery);
				} catch (error) {
					expect(error.message).to.equal(
						'should NOT have duplicate items (items ## 1 and 0 are identical): undefined',
					);
					expect(chain.logger.debug).to.be.calledWith(
						{
							err:
								'should NOT have duplicate items (items ## 1 and 0 are identical): undefined',
							req: actionQuery.params,
						},
						'getHighestCommonBlock request validation failed',
					);
				}
			});

			it('should return null if commonBlock has not been found', async () => {
				chain.scope.modules.blocks.getHighestCommonBlock.returns(undefined);
				const response = await chain.actions.getHighestCommonBlock({
					params: {
						ids: ['1', '2'],
					},
				});
				expect(response).to.be.null;
			});

			it('should return the block id if commonBlock has been found', async () => {
				chain.scope.modules.blocks.getHighestCommonBlock.returns({
					id: '123',
					height: '1',
				});
				const response = await chain.actions.getHighestCommonBlock({
					params: { ids: ['1', '2'] },
				});
				expect(response).to.eql({ id: '123', height: '1' });
			});

			it('should call blocks.getHighestCommonBlock with proper arguments', async () => {});
		});
	});

	describe('bootstrap', () => {
		beforeEach(async () => {
			// Act
			await chain.bootstrap();
		});

		it('should be an async function', () => {
			return expect(chain.bootstrap.constructor.name).to.be.equal(
				'AsyncFunction',
			);
		});

		it('should create logger component with loggerConfig coming from app:getComponentConfig', () => {
			// Assert
			expect(stubs.createLoggerComponent).to.have.been.calledWith({
				...loggerConfig,
				module: 'chain',
			});

			return expect(chain.logger).to.be.equal(stubs.logger);
		});

		describe('dbLogger', () => {
			it('should set to logger if main log file is same as storage log file', () => {
				return expect(chain.logger).to.be.equal(stubs.logger);
			});

			it('should create new logger component if main log file is not same as storage log file', async () => {
				// Arrange
				const differentStorageConfig = {
					logFileName: 'logs_different.log',
				};
				stubs.channel.invoke
					.withArgs('app:getComponentConfig', 'storage')
					.resolves(differentStorageConfig);

				// eslint-disable-next-line no-shadow
				const chain = new Chain(stubs.channel, chainOptions);

				// Act
				await chain.bootstrap();

				// Assert
				expect(stubs.createLoggerComponent.getCall(0).args).to.eql([
					{ ...loggerConfig, module: 'chain' },
				]);
				expect(stubs.createLoggerComponent.getCall(1).args).to.eql([
					{ ...loggerConfig, module: 'chain' },
				]);
				return expect(
					stubs.createLoggerComponent.getCall(2).args[0].logFileName,
				).to.eql(differentStorageConfig.logFileName);
			});
		});

		it('should set global.constants from the constants passed by options', () => {
			return expect(global.constants).to.be.equal(chainOptions.constants);
		});

		it('should set global.exceptions as a merger default exceptions and passed options', () => {
			return expect(global.exceptions).to.be.equal(chainOptions.exceptions);
		});

		describe('when options.loading.rebuildUpToRound is truthy', () => {
			beforeEach(async () => {
				// Arrange
				chain = new Chain(stubs.channel, {
					...chainOptions,
					loading: {
						rebuildUpToRound: true,
					},
					broadcasts: {},
					syncing: {},
				});
				// Act
				await chain.bootstrap();
			});

			it('should set options.broadcasts.active=false', () => {
				return expect(chain.options.broadcasts.active).to.be.equal(false);
			});

			it('should set options.syncing.active=false', () => {
				return expect(chain.options.syncing.active).to.be.equal(false);
			});
		});

		it('should throw error when genesisBlock option is not provided', async () => {
			// Arrange
			chain = new Chain(stubs.channel, {
				...chainOptions,
				genesisBlock: null,
			});

			// Act
			await chain.bootstrap();

			// Assert
			expect(chain.logger.fatal).to.be.calledOnce;
			expect(chain.logger.fatal).to.have.been.calledWith(
				'Chain initialization',
			);
			expect(chain.logger.fatal.firstCall.args[1].message).to.be.eql(
				'Failed to assign nethash from genesis block',
			);
		});

		it('should throw error when waitThreshold is greater than BLOCK_TIME', async () => {
			const invalidChainOptions = {
				...chainOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					BLOCK_TIME: 4,
				},
			};

			chain = new Chain(stubs.channel, invalidChainOptions);

			await chain.bootstrap();

			expect(chain.logger.fatal).to.be.calledOnce;
			expect(chain.logger.fatal).to.have.been.calledWith(
				'Chain initialization',
			);
			expect(chain.logger.fatal.firstCall.args[1].message).to.be.eql(
				'modules.chain.forging.waitThreshold=5 is greater or equal to app.genesisConfig.BLOCK_TIME=4. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold',
			);
		});

		it('should throw error when waitThreshold is same as BLOCK_TIME', async () => {
			const invalidChainOptions = {
				...chainOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					BLOCK_TIME: 5,
				},
			};

			chain = new Chain(stubs.channel, invalidChainOptions);

			await chain.bootstrap();

			expect(chain.logger.fatal).to.be.calledOnce;
			expect(chain.logger.fatal).to.have.been.calledWith(
				'Chain initialization',
			);
			expect(chain.logger.fatal.firstCall.args[1].message).to.be.eql(
				'modules.chain.forging.waitThreshold=5 is greater or equal to app.genesisConfig.BLOCK_TIME=5. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold',
			);
		});

		it('should create cache component', () => {
			return expect(chain.scope.components.cache).to.be.equal(stubs.cache);
		});

		it('should create storage component', () => {
			return expect(chain.scope.components.storage).to.be.equal(stubs.storage);
		});

		it('should set options.loggerConfig with received loggerConfig', () => {
			return expect(chain.options.loggerConfig).to.be.equal(loggerConfig);
		});

		it('should initialize scope object with valid structure', async () => {
			// @todo write a snapshot tests after migrated this test to jest.
			expect(chain.scope).to.have.property('config');
			expect(chain.scope).to.have.nested.property('genesisBlock.block');
			expect(chain.scope).to.have.property('sequence');
			expect(chain.scope).to.have.nested.property('components.storage');
			expect(chain.scope).to.have.nested.property('components.cache');
			expect(chain.scope).to.have.nested.property('components.logger');
			expect(chain.scope).to.have.property('channel');
			expect(chain.scope).to.have.property('applicationState');
		});

		it('should bootstrap storage', () => {
			return expect(stubs.initSteps.bootstrapStorage).to.have.been.calledWith(
				chain.scope,
				chainOptions.constants.ACTIVE_DELEGATES,
			);
		});

		it('should bootstrap cache', () => {
			return expect(stubs.initSteps.bootstrapCache).to.have.been.calledWith(
				chain.scope,
			);
		});

		describe('_initModules', () => {
			it('should initialize bft module', async () => {
				expect(chain.bft).to.be.instanceOf(BFT);
				expect(chain.scope.modules.bft).to.be.instanceOf(BFT);
			});
		});

		it('should invoke Processor.init', async () => {
			expect(chain.processor.init).to.have.been.calledOnce;
		});

		it('should subscribe to "app:state:updated" event', () => {
			return expect(chain.channel.subscribe).to.have.been.calledWith(
				'app:state:updated',
			);
		});

		it('should subscribe to "network:subscribe" event', () => {
			return expect(chain.channel.subscribe).to.have.been.calledWith(
				'network:event',
			);
		});

		describe('if any error thrown', () => {
			let processEmitStub;
			beforeEach(async () => {
				// Arrange
				chain = new Chain(stubs.channel, {
					...chainOptions,
					genesisBlock: null,
				});
				processEmitStub = sinonSandbox.stub(process, 'emit');

				// Act
				try {
					await chain.bootstrap();
				} catch (e) {
					// ignore
				}
			});

			afterEach(async () => {
				sinonSandbox.restore();
			});

			it('should log "Chain initialization"', async () => {
				expect(chain.logger.fatal).to.have.been.calledWith(
					'Chain initialization',
				);
			});
			it('should emit an event "cleanup" on the process', () => {
				return expect(processEmitStub).to.have.been.calledWith('cleanup');
			});
		});
	});

	describe('cleanup', () => {
		beforeEach(async () => {
			// Arrange
			await chain.bootstrap();
		});
		it('should be an async function', () => {
			// Assert
			return expect(chain.cleanup.constructor.name).to.be.equal(
				'AsyncFunction',
			);
		});

		it('should call cleanup on all components', async () => {
			// Act
			await chain.cleanup();

			// Assert
			expect(stubs.cache.cleanup).to.have.been.called;
			expect(stubs.storage.cleanup).to.have.been.called;
			return expect(stubs.logger.cleanup).to.have.been.called;
		});

		it('should call cleanup on all modules', async () => {
			// replace with stub
			chain.scope.modules = stubs.modules;
			// Act
			await chain.cleanup();

			// Assert
			expect(stubs.modules.module1.cleanup).to.have.been.called;
			return expect(stubs.modules.module2.cleanup).to.have.been.called;
		});
	});

	describe('#_syncTask', () => {
		beforeEach(async () => {
			await chain.bootstrap();
			sinonSandbox.stub(chain.loader, 'sync').resolves();
			sinonSandbox.stub(chain.loader, 'syncing').returns(false);
			sinonSandbox.stub(chain.scope.sequence, 'add').callsFake(async fn => {
				await fn();
			});
		});

		it('should info log every time this task is triggered', async () => {
			// Arrange
			chain.loader.syncing.returns(true); // To avoid triggering extra logic irrelevant for this scenario

			// Act
			await chain._syncTask();

			// Assert
			expect(stubs.logger.debug).to.be.calledWith(
				{
					syncing: chain.loader.syncing(),
					lastReceipt: chain.blocks.lastReceipt,
				},
				'Sync time triggered',
			);
		});

		it('should use the Sequence the node is not syncing', async () => {
			// Arrange
			chain.loader.syncing.returns(false);

			// Act
			await chain._syncTask();

			// Assert
			expect(chain.scope.sequence.add).to.be.called;
		});

		describe('in sequence', () => {
			beforeEach(async () => {
				chain.loader.syncing.returns(false);
			});

			it('should call loader.sync', async () => {
				await chain._syncTask();
				expect(chain.loader.sync).to.be.called;
			});

			it('should catch and log the error if the above fails', async () => {
				// Arrange
				const expectedError = new Error('an error');
				chain.loader.sync.rejects(expectedError);

				// Act
				await chain._syncTask();

				// Assert
				expect(stubs.logger.error).to.be.calledWith(
					expectedError,
					'Sync timer',
				);
			});
		});
	});

	describe('#_startLoader', () => {
		beforeEach(async () => {
			await chain.bootstrap();
			sinonSandbox.stub(chain.loader, 'loadUnconfirmedTransactions');
		});

		it('should return if syncing.active in config is set to false', async () => {
			// Arrange
			chain.options.syncing.active = false;

			// Act
			chain._startLoader();

			// Assert
			expect(stubs.jobsQueue.register).to.not.be.called;
		});

		it('should load transactions and signatures', async () => {
			chain._startLoader();
			expect(chain.loader.loadUnconfirmedTransactions).to.be.called;
		});

		it('should register a task in Jobs Queue named "nextSync" with a designated interval', async () => {
			// Arrange
			chain.options.syncing.active = true;

			// Act
			chain._startLoader();

			// Assert
			expect(stubs.jobsQueue.register).to.be.calledWith(
				'nextSync',
				sinonSandbox.match.func,
				Chain.__get__('syncInterval'),
			);
		});
	});

	describe('#_forgingTask', () => {
		beforeEach(async () => {
			await chain.bootstrap();
			sinonSandbox.stub(chain.forger, 'delegatesEnabled').returns(true);
			sinonSandbox.stub(chain.forger, 'forge');
			sinonSandbox.stub(chain.loader, 'syncing').returns(false);
			sinonSandbox.stub(chain.scope.sequence, 'add').callsFake(async fn => {
				await fn();
			});
		});

		it('should halt if no delegates are enabled', async () => {
			// Arrange
			chain.forger.delegatesEnabled.returns(false);

			// Act
			await chain._forgingTask();

			// Assert
			expect(stubs.logger.debug.getCall(2)).to.be.calledWith(
				'No delegates are enabled',
			);
			expect(chain.scope.sequence.add).to.be.called;
			expect(chain.forger.forge).to.not.be.called;
		});

		it('should halt if the client is not ready to forge (is syncing)', async () => {
			// Arrange
			chain.loader.syncing.returns(true);

			// Act
			await chain._forgingTask();

			// Assert
			expect(stubs.logger.debug.getCall(2)).to.be.calledWith(
				'Client not ready to forge',
			);
			expect(chain.scope.sequence.add).to.be.called;
			expect(chain.forger.forge).to.not.be.called;
		});

		it('should execute forger.forge otherwise', async () => {
			await chain._forgingTask();

			expect(chain.scope.sequence.add).to.be.called;
			expect(chain.forger.forge).to.be.called;
		});
	});

	describe('#_startForging', () => {
		beforeEach(async () => {
			await chain.bootstrap();
			sinonSandbox.stub(chain.forger, 'loadDelegates');
		});

		it('should load the delegates', async () => {
			await chain._startForging();
			expect(chain.forger.loadDelegates).to.be.called;
		});

		it('should register a task in Jobs Queue named "nextForge" with a designated interval', async () => {
			await chain._startForging();

			expect(stubs.jobsQueue.register).to.be.calledWith(
				'nextForge',
				sinonSandbox.match.func,
				Chain.__get__('forgeInterval'),
			);
		});
	});
});
