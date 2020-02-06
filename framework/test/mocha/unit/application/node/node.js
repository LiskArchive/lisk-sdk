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

const Node = rewire('../../../../../src/application/node/node');
const {
	Synchronizer,
} = require('../../../../../src/application/node/synchronizer/synchronizer');
const { Processor } = require('../../../../../src/application/node/processor');
const { cacheConfig, nodeOptions } = require('./node.fixtures');

describe('Node', () => {
	let node;
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

		stubs.applicationState = {};

		stubs.jobsQueue = {
			register: sinonSandbox.stub(),
		};

		stubs.channel.invoke
			.withArgs('app:getComponentConfig', 'cache')
			.resolves(cacheConfig);

		/* Arranging Stubs end */
		Node.__set__('jobQueue', stubs.jobsQueue);

		const Blocks = Node.__get__('Blocks');
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
		Node.__set__('Blocks', Blocks);

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

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should accept channel as first parameter and assign to object instance', () => {
			// Assert
			return expect(node.channel).to.be.equal(stubs.channel);
		});
		it('should accept options as second parameter and assign to object instance', () => {
			// Assert
			return expect(node.options).to.be.equal(nodeOptions);
		});
		it('should initialize class properties', async () => {
			expect(node.logger).to.be.eql(stubs.logger);
			expect(node.storage).to.be.eql(stubs.storage);
			expect(node.channel).to.be.eql(stubs.channel);
			expect(node.components).to.be.null;
			expect(node.sequence).to.be.null;
			expect(node.registeredTransactions).to.be.null;
			expect(node.genesisBlock).to.be.null;
		});
	});

	describe('actions', () => {
		beforeEach(async () => {
			node.modules = {
				blocks: {
					getHighestCommonBlock: sinonSandbox.stub(),
				},
			};
			node.logger = {
				debug: sinonSandbox.stub(),
			};
		});
	});

	describe('bootstrap', () => {
		beforeEach(async () => {
			// Act
			await node.bootstrap();
		});

		it('should be an async function', () => {
			return expect(node.bootstrap.constructor.name).to.be.equal(
				'AsyncFunction',
			);
		});

		describe('when options.loading.rebuildUpToRound is truthy', () => {
			beforeEach(async () => {
				// Arrange
				node = new Node({
					channel: stubs.channel,
					options: {
						...nodeOptions,
						loading: {
							rebuildUpToRound: true,
						},
						broadcasts: {},
						syncing: {},
					},
					logger: stubs.logger,
					storage: stubs.storage,
				});

				// Act
				await node.bootstrap();
			});

			it('should set options.broadcasts.active=false', () => {
				return expect(node.options.broadcasts.active).to.be.equal(false);
			});

			it('should set options.syncing.active=false', () => {
				return expect(node.options.syncing.active).to.be.equal(false);
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
			expect(node.logger.fatal).to.be.calledOnce;
			expect(node.logger.fatal).to.have.been.calledWithMatch(
				{ message: 'Missing genesis block' },
				'Failed to initialization node',
			);
		});

		it('should throw error when waitThreshold is greater than BLOCK_TIME', async () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					BLOCK_TIME: 4,
				},
			};

			node = new Node({
				channel: stubs.channel,
				options: invalidChainOptions,
				logger: stubs.logger,
			});

			await node.bootstrap();

			expect(node.logger.fatal).to.be.calledOnce;
			// Ignoring the error object as its non-deterministic
			expect(node.logger.fatal).to.be.calledWithMatch(
				{},
				'Failed to initialization node',
			);
		});

		it('should throw error when waitThreshold is same as BLOCK_TIME', async () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				constants: {
					BLOCK_TIME: 5,
				},
			};

			node = new Node({
				channel: stubs.channel,
				options: invalidChainOptions,
				logger: stubs.logger,
			});

			await node.bootstrap();

			expect(node.logger.fatal).to.be.calledOnce;
			expect(node.logger.fatal).to.have.been.calledWithMatch(
				{},
				'Failed to initialization node',
			);
		});

		it('should create storage component', () => {
			return expect(node.components.storage).to.be.equal(stubs.storage);
		});

		it('should initialize scope object with valid structure', async () => {
			// @todo write a snapshot tests after migrated this test to jest.
			expect(node).to.have.property('config');
			expect(node).to.have.nested.property('genesisBlock.block');
			expect(node).to.have.property('sequence');
			expect(node).to.have.nested.property('components.storage');
			expect(node).to.have.nested.property('components.logger');
			expect(node).to.have.property('channel');
			expect(node).to.have.property('applicationState');
		});

		describe('_initModules', () => {
			it('should initialize bft module', async () => {
				expect(node.bft).to.be.instanceOf(BFT);
				expect(node.modules.bft).to.be.instanceOf(BFT);
			});
		});

		it('should invoke Processor.init', async () => {
			expect(node.processor.init).to.have.been.calledOnce;
		});

		it('should invoke "app:updateApplicationState" with correct params', () => {
			// Assert
			return expect(node.channel.invoke).to.have.been.calledWith(
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
			return expect(node.channel.subscribe).to.have.been.calledWith(
				'app:state:updated',
			);
		});

		it('should subscribe to "network:subscribe" event', () => {
			return expect(node.channel.subscribe).to.have.been.calledWith(
				'app:networkEvent',
			);
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
				processEmitStub = sinonSandbox.stub(process, 'emit');

				// Act
				try {
					await node.bootstrap();
				} catch (e) {
					// ignore
				}
			});

			afterEach(async () => {
				sinonSandbox.restore();
			});

			it('should log "Failed to initialization node module"', async () => {
				expect(node.logger.fatal).to.be.calledWithMatch(
					{},
					'Failed to initialization node',
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
			await node.bootstrap();
		});
		it('should be an async function', () => {
			// Assert
			return expect(node.cleanup.constructor.name).to.be.equal('AsyncFunction');
		});

		it('should call cleanup on all modules', async () => {
			// replace with stub
			node.modules = stubs.modules;
			// Act
			await node.cleanup();

			// Assert
			expect(stubs.modules.module1.cleanup).to.have.been.called;
			return expect(stubs.modules.module2.cleanup).to.have.been.called;
		});
	});

	describe('#_startLoadTransactionsFromNetwork', () => {
		beforeEach(async () => {
			await node.bootstrap();
			sinonSandbox.stub(node.synchronizer, 'loadUnconfirmedTransactions');
		});

		it('should return if syncing.active in config is set to false', async () => {
			// Arrange
			node.options.syncing.active = false;

			// Act
			await node._startLoadTransactionsFromNetwork();

			// Assert
			expect(stubs.jobsQueue.register).to.not.be.called;
		});

		it('should load transactions and signatures', async () => {
			await node._startLoadTransactionsFromNetwork();
			expect(node.synchronizer.loadUnconfirmedTransactions).to.be.called;
		});
	});

	describe('#_forgingTask', () => {
		beforeEach(async () => {
			await node.bootstrap();
			sinonSandbox.stub(node.forger, 'delegatesEnabled').returns(true);
			sinonSandbox.stub(node.forger, 'forge');
			sinonSandbox.stub(node.forger, 'beforeForge');
			sinonSandbox.stub(node.sequence, 'add').callsFake(async fn => {
				await fn();
			});
			sinonSandbox.stub(node.synchronizer, 'isActive').get(() => false);
		});

		it('should halt if no delegates are enabled', async () => {
			// Arrange
			node.forger.delegatesEnabled.returns(false);

			// Act
			await node._forgingTask();

			// Assert
			expect(stubs.logger.debug.firstCall).to.be.calledWith(
				'No delegates are enabled',
			);
			expect(node.sequence.add).to.be.called;
			expect(node.forger.beforeForge).to.not.be.called;
			expect(node.forger.forge).to.not.be.called;
		});

		it('should halt if the client is not ready to forge (is syncing)', async () => {
			// Arrange
			sinonSandbox.stub(node.synchronizer, 'isActive').get(() => true);

			// Act
			await node._forgingTask();

			// Assert
			expect(stubs.logger.debug.firstCall).to.be.calledWith(
				'Client not ready to forge',
			);
			expect(node.sequence.add).to.be.called;
			expect(node.forger.beforeForge).to.not.be.called;
			expect(node.forger.forge).to.not.be.called;
		});

		it('should execute forger.forge otherwise', async () => {
			await node._forgingTask();

			expect(node.sequence.add).to.be.called;
			expect(node.forger.beforeForge).to.be.called;
			expect(node.forger.forge).to.be.called;
		});
	});

	describe('#_startForging', () => {
		beforeEach(async () => {
			await node.bootstrap();
			sinonSandbox.stub(node.forger, 'loadDelegates');
		});

		it('should load the delegates', async () => {
			await node._startForging();
			expect(node.forger.loadDelegates).to.be.called;
		});

		it('should register a task in Jobs Queue named "nextForge" with a designated interval', async () => {
			await node._startForging();

			expect(stubs.jobsQueue.register).to.be.calledWith(
				'nextForge',
				sinonSandbox.match.func,
				Node.__get__('forgeInterval'),
			);
		});
	});
});
