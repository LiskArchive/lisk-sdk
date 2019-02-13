const util = require('util');
const path = require('path');
const fs = require('fs');
const WsTransport = require('./api/ws/transport');
const git = require('./helpers/git.js');
const Sequence = require('./helpers/sequence.js');
const ed = require('./helpers/ed.js');
// eslint-disable-next-line import/order
const swaggerHelper = require('./helpers/swagger');
const { createStorageComponent } = require('../../components/storage');
const { createCacheComponent } = require('../../components/cache');
const { createLoggerComponent } = require('../../components/logger');
const initSteps = require('./init_steps');
const defaults = require('./defaults');

// Begin reading from stdin
process.stdin.resume();

// Read build version from file
const versionBuild = fs
	.readFileSync(path.join(__dirname, '../../../../', '.build'), 'utf8')
	.toString()
	.trim();

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

const modulesList = {
	accounts: './modules/accounts.js',
	blocks: './modules/blocks.js',
	dapps: './modules/dapps.js',
	delegates: './modules/delegates.js',
	rounds: './modules/rounds.js',
	loader: './modules/loader.js',
	multisignatures: './modules/multisignatures.js',
	peers: './modules/peers.js',
	system: './modules/system.js',
	signatures: './modules/signatures.js',
	transactions: './modules/transactions.js',
	transport: './modules/transport.js',
};

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
		this.modules = null;
		this.components = null;
		this.webSocket = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);
		const storageConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'storage'
		);

		const cacheConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'cache'
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
		global.exceptions = Object.assign(
			{},
			defaults.exceptions,
			this.options.exceptions
		);

		try {
			// Cache
			this.logger.debug('Initiating cache...');
			const cache = createCacheComponent(cacheConfig, this.logger);

			// Storage
			this.logger.debug('Initiating storage...');
			const storage = createStorageComponent(storageConfig, dbLogger);

			const self = this;
			const appConfig = this.options.config;
			const genesisBlock = { block: appConfig.genesisBlock };
			const schema = swaggerHelper.getValidator();
			const sequence = new Sequence({
				onWarning(current) {
					self.logger.warn('Main queue', current);
				},
			});
			const balanceSequence = new Sequence({
				onWarning(current) {
					self.logger.warn('Balance queue', current);
				},
			});

			if (!appConfig.nethash) {
				throw Error('Failed to assign nethash from genesis block');
			}

			// Lookup for peers ips from dns
			appConfig.peers.list = await initSteps.lookupPeerIPs(
				appConfig.peers.list,
				appConfig.peers.enabled
			);

			await initSteps.bootstrapStorage(
				storage,
				self.logger,
				global.constants.ACTIVE_DELEGATES
			);
			await initSteps.bootstrapCache(cache, self.logger);
			const network = await initSteps.createHttpServer(appConfig, self.logger);
			const components = { logger: self.logger, cache, storage };
			const bus = await initSteps.createBus(modulesList);
			const webSocket = await initSteps.createSocketCluster(
				appConfig,
				self.logger,
				network
			);
			const logic = await initSteps.initLogicStructure({
				config: appConfig,
				storage,
				logger: self.logger,
				ed,
				schema,
				genesisBlock,
			});
			const modules = await initSteps.initModules({
				modulesList,
				config: appConfig,
				storage,
				logger: self.logger,
				schema,
				genesisBlock,
				network,
				webSocket,
				bus,
				sequence,
				balanceSequence,
				logic,
				lastCommit,
				build: versionBuild,
			});
			const swagger = await initSteps.attachSwagger({
				config: appConfig,
				logger: self.logger,
				network,
				scope: { modules, config: appConfig },
			});
			modules.swagger = swagger;

			// Ready to bind modules
			bus.message('bind', { modules });
			logic.peers.bindModules(modules);

			// Listen to websockets
			if (appConfig.peers.enabled) {
				new WsTransport(modules.transport);
			}
			// Listen to http, https servers
			await network.listen();
			self.logger.info('Modules ready and launched');

			self.modules = modules;
			self.components = components;
			self.webSocket = webSocket;
		} catch (error) {
			this.logger.fatal('Chain initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
	}

	async cleanup(code, error) {
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}
		this.logger.info('Cleaning chain...');
		if (this.webSocket) {
			this.webSocket.removeAllListeners('fail');
			this.webSocket.destroy();
		}

		if (this.components !== undefined) {
			this.components.map(component => component.cleanup());
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like snapshotting database tables.
		await Promise.all(
			this.modules.map(module => {
				if (typeof module.cleanup === 'function') {
					return util.promisify(module.cleanup)();
				}
				return true;
			})
		).catch(mdouleCleanupError => {
			this.logger.error(mdouleCleanupError);
		});

		this.logger.info('Cleaned up successfully');
	}
};
