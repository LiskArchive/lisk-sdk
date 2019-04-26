if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

const { promisify } = require('util');
const { convertErrorsToString } = require('./helpers/error_handlers');
const git = require('./helpers/git');
const Sequence = require('./helpers/sequence');
const ed = require('./helpers/ed');
// eslint-disable-next-line import/order
const { ZSchema } = require('../../controller/helpers/validator');
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

// Begin reading from stdin
process.stdin.resume();

// Read build version from file
// TODO: Remove from framework
const versionBuild = 'version-0.1.0';
// const versionBuild = fs
// 	.readFileSync(path.join(__dirname, '../../../../', '.build'), 'utf8')
// 	.toString()
// 	.trim();

/**
 * Hash of the last git commit.
 *
 * @memberof! app
 */
let lastCommit = '';

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
						Object.assign({}, loggerConfig, {
							logFileName: storageConfig.logFileName,
						})
				  );

		// Try to get the last git commit
		try {
			lastCommit = git.getLastCommit();
		} catch (err) {
			this.logger.debug('Cannot get last git commit', err.message);
		}

		global.constants = this.options.constants;
		global.exceptions = this.options.exceptions;

		const BlockReward = require('./logic/block_reward');
		this.blockReward = new BlockReward();
		// Needs to be loaded here as its using constants that need to be initialized first
		this.slots = require('./helpers/slots');

		if (this.options.loading.snapshotRound) {
			this.options.network.enabled = false;
			this.options.network.list = [];
			this.options.broadcasts.active = false;
			this.options.syncing.active = false;
		}

		try {
			// Cache
			this.logger.debug('Initiating cache...');
			const cache = createCacheComponent(cacheConfig, this.logger);

			// Storage
			this.logger.debug('Initiating storage...');
			const storage = createStorageComponent(storageConfig, dbLogger);

			if (!this.options.genesisBlock) {
				throw Error('Failed to assign nethash from genesis block');
			}

			// TODO: For socket cluster child process, should be removed with refactoring of network module
			this.options.loggerConfig = loggerConfig;

			const self = this;
			const scope = {
				lastCommit,
				ed,
				build: versionBuild,
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

			await bootstrapStorage(scope, global.constants.ACTIVE_DELEGATES);
			await bootstrapCache(scope);

			scope.bus = await createBus();
			scope.logic = await initLogicStructure(scope);
			scope.modules = await initModules(scope);

			scope.logic.block.bindModules(scope.modules);

			this.channel.subscribe('app:state:updated', event => {
				Object.assign(scope.applicationState, event.data);
			});

			// Fire onBind event in every module
			scope.bus.message('bind', scope);

			self.logger.info('Modules ready and launched');

			this.channel.once('network:ready', () => {
				this.channel.subscribe('network:chain:postTransactions', ({ data }) => {
					this.scope.modules.transport.shared.postTransactions(data);
				});

				this.channel.subscribe('network:chain:postSignatures', ({ data }) => {
					this.scope.modules.transport.shared.postSignatures(data);
				});

				this.channel.subscribe('network:chain:postBlock', ({ data }) => {
					this.scope.modules.transport.shared.postBlock(data);
				});
			});

			self.scope = scope;
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
				promisify(this.scope.modules.delegates.generateDelegateList)(
					action.params.round,
					action.params.source
				),
			updateForgingStatus: async action =>
				this.scope.modules.delegates.updateForgingStatus(
					action.params.publicKey,
					action.params.password,
					action.params.forging
				),
			getTransactions: async () =>
				promisify(this.scope.modules.transport.shared.getTransactions)(),
			getSignatures: async () =>
				promisify(this.scope.modules.transport.shared.getSignatures)(),
			postSignature: async action =>
				promisify(this.scope.modules.signatures.shared.postSignature)(
					action.params.signature
				),
			getForgingStatusForAllDelegates: async () =>
				this.scope.modules.delegates.getForgingStatusForAllDelegates(),
			getTransactionsFromPool: async action =>
				promisify(
					this.scope.modules.transactions.shared.getTransactionsFromPool
				)(action.params.type, action.params.filters),
			getLastCommit: async () => this.scope.lastCommit,
			getBuild: async () => this.scope.build,
			postTransaction: async action =>
				promisify(this.scope.modules.transactions.shared.postTransaction)(
					action.params.transaction
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
				loaded: this.scope.modules.loader.loaded(),
				syncing: this.scope.modules.loader.syncing(),
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
		const { webSocket, modules, components } = this.scope;
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}
		this.logger.info('Cleaning chain...');

		if (webSocket) {
			webSocket.removeAllListeners('fail');
			webSocket.destroy();
		}

		if (components !== undefined) {
			Object.keys(components).forEach(async key => {
				if (components[key].cleanup) {
					await components[key].cleanup();
				}
			});
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like snapshotting database tables.
		await Promise.all(
			Object.keys(modules).map(key => {
				if (typeof modules[key].cleanup === 'function') {
					return promisify(modules[key].cleanup);
				}
				return true;
			})
		).catch(moduleCleanupError => {
			this.logger.error(convertErrorsToString(moduleCleanupError));
		});

		this.logger.info('Cleaned up successfully');
	}
};
