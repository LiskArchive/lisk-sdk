/*
 * Copyright © 2018 Lisk Foundation
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

if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

const { promisify } = require('util');
const { convertErrorsToString } = require('./helpers/error_handlers');
const Sequence = require('./helpers/sequence');
const ed = require('./helpers/ed');
const { ZSchema } = require('../../controller/validator');
const { createStorageComponent } = require('../../components/storage');
const { createCacheComponent } = require('../../components/cache');
const { createLoggerComponent } = require('../../components/logger');
const {
	createBus,
	bootstrapStorage,
	bootstrapCache,
	initLogicStructure,
	initModules,
} = require('./init_steps');

const syncInterval = 10000;
const forgeInterval = 1000;

// Begin reading from stdin
process.stdin.resume();

if (typeof gc !== 'undefined') {
	setInterval(() => {
		gc(); // eslint-disable-line no-undef
	}, 60000);
}

/**
 * Chain Module
 *
 * @namespace Framework.modules.chain
 * @type {module.Chain}
 */
module.exports = class Chain {
	constructor(channel, options) {
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
		this.blockReward = null;
		this.slots = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'logger'
		);
		const storageConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'storage'
		);

		const cacheConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'cache'
		);

		this.applicationState = await this.channel.invoke(
			'app:getApplicationState'
		);

		this.logger = createLoggerComponent(loggerConfig);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent(
						Object.assign({
							...loggerConfig,
							logFileName: storageConfig.logFileName,
						})
				  );

		global.constants = this.options.constants;
		global.exceptions = this.options.exceptions;

		const BlockReward = require('./logic/block_reward');
		this.blockReward = new BlockReward();
		// Needs to be loaded here as its using constants that need to be initialized first
		this.slots = require('./helpers/slots');

		// Deactivate broadcast and syncing during snapshotting process
		if (this.options.loading.rebuildUpToRound) {
			this.options.broadcasts.active = false;
			this.options.syncing.active = false;
		}

		try {
			if (!this.options.genesisBlock) {
				throw Error('Failed to assign nethash from genesis block');
			}

			if (
				this.options.forging.waitThreshold >= this.options.constants.BLOCK_TIME
			) {
				throw Error(
					`modules.chain.forging.waitThreshold=${
						this.options.forging.waitThreshold
					} is greater or equal to app.genesisConfig.BLOCK_TIME=${
						this.options.constants.BLOCK_TIME
					}. It impacts the forging and propagation of blocks. Please use a smaller value for modules.chain.forging.waitThreshold`
				);
			}

			// Cache
			this.logger.debug('Initiating cache...');
			const cache = createCacheComponent(cacheConfig, this.logger);

			// Storage
			this.logger.debug('Initiating storage...');
			const storage = createStorageComponent(storageConfig, dbLogger);

			// TODO: For socket cluster child process, should be removed with refactoring of network module
			this.options.loggerConfig = loggerConfig;

			const self = this;
			this.scope = {
				ed,
				config: self.options,
				genesisBlock: { block: self.options.genesisBlock },
				registeredTransactions: self.options.registeredTransactions,
				schema: new ZSchema(),
				sequence: new Sequence({
					onWarning(current) {
						self.logger.warn('Main queue', current);
					},
				}),
				balancesSequence: new Sequence({
					onWarning(current) {
						self.logger.warn('Balance queue', current);
					},
				}),
				components: {
					storage,
					cache,
					logger: self.logger,
				},
				channel: this.channel,
				applicationState: this.applicationState,
			};

			await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
			await bootstrapCache(this.scope);

			this.scope.bus = await createBus();
			this.scope.logic = await initLogicStructure(this.scope);
			this.scope.modules = await initModules(this.scope);
			// TODO: Global variable forbits to require on top
			const Loader = require('./loader');
			const { Forger } = require('./forger');
			const Transport = require('./transport');
			const { Rounds } = require('./rounds');
			this.loader = new Loader(this.scope);
			this.forger = new Forger(this.scope);
			this.transport = new Transport(this.scope);
			this.rounds = new Rounds(this.scope);
			this.scope.modules.loader = this.loader;
			this.scope.modules.forger = this.forger;
			this.scope.modules.transport = this.transport;
			this.scope.modules.rounds = this.rounds;

			this.scope.logic.block.bindModules(this.scope.modules);
			this.scope.logic.account.bindModules(this.scope.modules);

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(this.scope.applicationState, event.data);
			});

			// Fire onBind event in every module
			this.scope.bus.message('bind', this.scope);

			this.logger.info('Modules ready and launched');
			// After binding, it should immediately load blockchain
			await this.loader.loadBlockChain();

			this.channel.subscribe('network:bootstrap', async () => {
				this._startLoader();
				await this._startForging();
			});

			// Avoid receiving blocks/transactions from the network during snapshotting process
			if (!this.options.loading.rebuildUpToRound) {
				this.channel.subscribe('network:event', ({ data: { event, data } }) => {
					if (event === 'postTransactions') {
						this.scope.modules.transport.shared.postTransactions(data);
						return;
					}
					if (event === 'postSignatures') {
						this.scope.modules.transport.shared.postSignatures(data);
						return;
					}
					if (event === 'postBlock') {
						this.scope.modules.transport.shared.postBlock(data);
						// eslint-disable-next-line no-useless-return
						return;
					}
				});
			}
		} catch (error) {
			this.logger.fatal('Chain initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
	}

	get actions() {
		return {
			calculateSupply: action =>
				this.blockReward.calcSupply(action.params.height),
			calculateMilestone: action =>
				this.blockReward.calcMilestone(action.params.height),
			calculateReward: action =>
				this.blockReward.calcReward(action.params.height),
			generateDelegateList: async action =>
				this.scope.modules.rounds.generateDelegateList(
					action.params.round,
					action.params.source
				),
			updateForgingStatus: async action =>
				this.scope.modules.forger.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging
				),
			getTransactions: async () =>
				promisify(this.scope.modules.transport.shared.getTransactions)(),
			getSignatures: async () =>
				promisify(this.scope.modules.transport.shared.getSignatures)(),
			postSignature: async action =>
				promisify(this.scope.modules.transport.shared.postSignature)(
					action.params
				),
			getForgingStatusForAllDelegates: async () =>
				this.scope.modules.forger.getForgingStatusForAllDelegates(),
			getTransactionsFromPool: async action =>
				promisify(
					this.scope.modules.transactions.shared.getTransactionsFromPool
				)(action.params.type, action.params.filters),
			postTransaction: async action =>
				promisify(this.scope.modules.transport.shared.postTransaction)(
					action.params
				),
			getDelegateBlocksRewards: async action =>
				this.scope.components.storage.entities.Account.delegateBlocksRewards(
					action.params.filters,
					action.params.tx
				),
			getSlotNumber: async action =>
				action.params
					? this.slots.getSlotNumber(action.params.epochTime)
					: this.slots.getSlotNumber(),
			calcSlotRound: async action => this.slots.calcRound(action.params.height),
			getNodeStatus: async () => ({
				consensus: this.scope.modules.peers.getLastConsensus(),
				loaded: true,
				syncing: this.loader.syncing(),
				transactions: await promisify(
					this.scope.modules.transactions.shared.getTransactionsCount
				)(),
				secondsSinceEpoch: this.slots.getTime(),
				lastBlock: this.scope.modules.blocks.lastBlock.get(),
			}),
			blocks: async action =>
				promisify(this.scope.modules.transport.shared.blocks)(
					action.params || {}
				),
			blocksCommon: async action =>
				promisify(this.scope.modules.transport.shared.blocksCommon)(
					action.params || {}
				),
		};
	}

	async cleanup(code, error) {
		const { modules, components } = this.scope;
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}
		this.logger.info('Cleaning chain...');

		if (components !== undefined) {
			Object.keys(components).forEach(async key => {
				if (components[key].cleanup) {
					await components[key].cleanup();
				}
			});
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like the rebuild verification process.
		await Promise.all(
			Object.keys(modules).map(key => {
				if (typeof modules[key].cleanup === 'function') {
					return modules[key].cleanup();
				}
				return true;
			})
		).catch(moduleCleanupError => {
			this.logger.error(convertErrorsToString(moduleCleanupError));
		});

		this.logger.info('Cleaned up successfully');
	}

	_startLoader() {
		this.loader.loadTransactionsAndSignatures();
		if (!this.options.syncing.active) {
			return;
		}
		// sync timer
		setInterval(() => {
			this.logger.info(
				{
					syncing: this.loader.isActive(),
					lastReceipt: this.scope.modules.blocks.lastReceipt.get(),
				},
				'Sync time triggered'
			);
			if (
				!this.loader.isActive() &&
				this.scope.modules.blocks.lastReceipt.isStale()
			) {
				this.scope.sequence.add(
					sequenceCB => {
						this.loader.sync(sequenceCB);
					},
					syncError => {
						if (syncError) {
							this.logger.error('Sync timer', syncError);
						}
					}
				);
			}
		}, syncInterval);
	}

	async _startForging() {
		try {
			await new Promise((resolve, reject) => {
				this.forger.loadDelegates(err => {
					if (err) {
						return reject(err);
					}
					return resolve();
				});
			});
		} catch (err) {
			this.logger.error(err, 'Failed to load delegates');
		}
		setInterval(async () => {
			// TODO: Possibly need to add this whole section into sequence
			await this.forger.beforeForge();
			if (!this.forger.delegatesEnabled()) {
				this.logger.debug('No delegates are enabled');
				return;
			}
			if (this.loader.syncing() || this.scope.modules.rounds.ticking()) {
				this.logger.debug('Client not ready to forge');
				return;
			}
			this.forger.forge(() => {});
		}, forgeInterval);
	}
};
