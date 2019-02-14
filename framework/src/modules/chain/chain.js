const util = require('util');
const path = require('path');
const fs = require('fs');
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

			if (!this.options.config) {
				throw Error('Failed to assign nethash from genesis block');
			}

			const self = this;
			const scope = {
				lastCommit,
				ed,
				build: versionBuild,
				config: this.options.config,
				genesisBlock: { block: this.options.config.genesisBlock },
				schema: swaggerHelper.getValidator(),
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
					logger: this.logger,
				},
			};

			// Lookup for peers ips from dns
			scope.config.peers.list = await initSteps.lookupPeerIPs(
				scope.config.peers.list,
				scope.config.peers.enabled
			);

			await initSteps.bootstrapStorage(
				scope,
				global.constants.ACTIVE_DELEGATES
			);
			await initSteps.bootstrapCache(scope);

			scope.network = await initSteps.createHttpServer(scope);
			scope.bus = await initSteps.createBus();
			scope.webSocket = await initSteps.createSocketCluster(scope);
			scope.logic = await initSteps.initLogicStructure(scope);
			scope.modules = await initSteps.initModules(scope);
			scope.swagger = await initSteps.attachSwagger(scope);

			// TODO: Identify why its used
			scope.modules.swagger = scope.swagger;
			// Ready to bind modules
			scope.logic.peers.bindModules(scope.modules);

			// Fire onBind event in every module
			scope.bus.message('bind', scope);

			// Listen to websockets
			await scope.webSocket.listen();
			// Listen to http, https servers
			await scope.network.listen();
			self.logger.info('Modules ready and launched');

			self.scope = scope;
		} catch (error) {
			this.logger.fatal('Chain initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
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
			components.map(component => component.cleanup());
		}

		// Run cleanup operation on each module before shutting down the node;
		// this includes operations like snapshotting database tables.
		await Promise.all(
			modules.map(module => {
				if (typeof module.cleanup === 'function') {
					return util.promisify(module.cleanup)();
				}
				return true;
			})
		).catch(moduleCleanupError => {
			this.logger.error(moduleCleanupError);
		});

		this.logger.info('Cleaned up successfully');
	}
};
