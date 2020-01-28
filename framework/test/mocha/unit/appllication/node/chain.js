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
const { BFT } = require('@liskhq/lisk-bft');

const Chain = rewire('../../../../../src/application/node/chain');
const {
	Synchronizer,
} = require('../../../../../src/application/node/synchronizer/synchronizer');
const { Processor } = require('../../../../../src/application/node/processor');
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
		sinonSandbox.stub(Synchronizer.prototype, 'init').resolves();

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
		stubs.createStorageComponent = sinonSandbox.stub().returns(stubs.storage);

		stubs.initSteps = {
			bootstrapStorage: sinonSandbox.stub(),
		};

		/* Arranging Stubs end */

		Chain.__set__('createLoggerComponent', stubs.createLoggerComponent);
		Chain.__set__('createStorageComponent', stubs.createStorageComponent);
		Chain.__set__('bootstrapStorage', stubs.initSteps.bootstrapStorage);
		Chain.__set__('jobQueue', stubs.jobsQueue);

		const Blocks = Chain.__get__('Blocks');
		Object.defineProperty(Blocks.prototype, 'lastBlock', {
			get: () => {
				return {
					height: 1,
					id: 2,
					version: 3,
					maxHeightPrevoted: 4,
				};
			},
		});
		Chain.__set__('Blocks', Blocks);

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
		it('should initialize class properties as null', async () => {
			expect(chain.logger).to.be.null;
			expect(chain.components).to.be.null;
			expect(chain.components).to.be.null;
			expect(chain.sequence).to.be.null;
			expect(chain.registeredTransactions).to.be.null;
			expect(chain.genesisBlock).to.be.null;
		});
	});

	describe('actions', () => {
		beforeEach(async () => {
			chain.modules = {
				blocks: {
					getHighestCommonBlock: sinonSandbox.stub(),
				},
			};
			chain.logger = {
				debug: sinonSandbox.stub(),
			};
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
			expect(chain.logger.fatal).to.have.been.calledWithMatch(
				{},
				'Failed to initialization chain module',
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
			// Ignoring the error object as its non-deterministic
			expect(chain.logger.fatal).to.be.calledWithMatch(
				{},
				'Failed to initialization chain module',
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
			expect(chain.logger.fatal).to.have.been.calledWithMatch(
				{},
				'Failed to initialization chain module',
			);
		});

		it('should create storage component', () => {
			return expect(chain.components.storage).to.be.equal(stubs.storage);
		});

		it('should set options.loggerConfig with received loggerConfig', () => {
			return expect(chain.options.loggerConfig).to.be.equal(loggerConfig);
		});

		it('should initialize scope object with valid structure', async () => {
			// @todo write a snapshot tests after migrated this test to jest.
			expect(chain).to.have.property('config');
			expect(chain).to.have.nested.property('genesisBlock.block');
			expect(chain).to.have.property('sequence');
			expect(chain).to.have.nested.property('components.storage');
			expect(chain).to.have.nested.property('components.logger');
			expect(chain).to.have.property('channel');
			expect(chain).to.have.property('applicationState');
		});

		it('should bootstrap storage', () => {
			return expect(stubs.initSteps.bootstrapStorage).to.have.been.calledWith(
				{ components: chain.components },
				chainOptions.constants.ACTIVE_DELEGATES,
			);
		});

		describe('_initModules', () => {
			it('should initialize bft module', async () => {
				expect(chain.bft).to.be.instanceOf(BFT);
				expect(chain.modules.bft).to.be.instanceOf(BFT);
			});
		});

		it('should invoke Processor.init', async () => {
			expect(chain.processor.init).to.have.been.calledOnce;
		});

		it('should invoke "app:updateApplicationState" with correct params', () => {
			// Assert
			return expect(chain.channel.invoke).to.have.been.calledWith(
				'app:updateApplicationState',
				{
					height: 1,
					lastBlockId: 2,
					blockVersion: 3,
					maxHeightPrevoted: 4,
				},
			);
		});

		it('should subscribe to "app:state:updated" event', () => {
			return expect(chain.channel.subscribe).to.have.been.calledWith(
				'app:state:updated',
			);
		});

		it('should subscribe to "network:subscribe" event', () => {
			return expect(chain.channel.subscribe).to.have.been.calledWith(
				'app:networkEvent',
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

			it('should log "Failed to initialization chain module"', async () => {
				expect(chain.logger.fatal).to.be.calledWithMatch(
					{},
					'Failed to initialization chain module',
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
			expect(stubs.storage.cleanup).to.have.been.called;
			return expect(stubs.logger.cleanup).to.have.been.called;
		});

		it('should call cleanup on all modules', async () => {
			// replace with stub
			chain.modules = stubs.modules;
			// Act
			await chain.cleanup();

			// Assert
			expect(stubs.modules.module1.cleanup).to.have.been.called;
			return expect(stubs.modules.module2.cleanup).to.have.been.called;
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
			await chain._startLoader();

			// Assert
			expect(stubs.jobsQueue.register).to.not.be.called;
		});

		it('should load transactions and signatures', async () => {
			await chain._startLoader();
			expect(chain.loader.loadUnconfirmedTransactions).to.be.called;
		});
	});

	describe('#_forgingTask', () => {
		beforeEach(async () => {
			await chain.bootstrap();
			sinonSandbox.stub(chain.forger, 'delegatesEnabled').returns(true);
			sinonSandbox.stub(chain.forger, 'forge');
			sinonSandbox.stub(chain.forger, 'beforeForge');
			sinonSandbox.stub(chain.sequence, 'add').callsFake(async fn => {
				await fn();
			});
			sinonSandbox.stub(chain.synchronizer, 'isActive').get(() => false);
		});

		it('should halt if no delegates are enabled', async () => {
			// Arrange
			chain.forger.delegatesEnabled.returns(false);

			// Act
			await chain._forgingTask();

			// Assert
			expect(stubs.logger.debug.getCall(1)).to.be.calledWith(
				'No delegates are enabled',
			);
			expect(chain.sequence.add).to.be.called;
			expect(chain.forger.beforeForge).to.not.be.called;
			expect(chain.forger.forge).to.not.be.called;
		});

		it('should halt if the client is not ready to forge (is syncing)', async () => {
			// Arrange
			sinonSandbox.stub(chain.synchronizer, 'isActive').get(() => true);

			// Act
			await chain._forgingTask();

			// Assert
			expect(stubs.logger.debug.getCall(1)).to.be.calledWith(
				'Client not ready to forge',
			);
			expect(chain.sequence.add).to.be.called;
			expect(chain.forger.beforeForge).to.not.be.called;
			expect(chain.forger.forge).to.not.be.called;
		});

		it('should execute forger.forge otherwise', async () => {
			await chain._forgingTask();

			expect(chain.sequence.add).to.be.called;
			expect(chain.forger.beforeForge).to.be.called;
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
