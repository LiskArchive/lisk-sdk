if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('./helpers/newrelic_lisk');
}

const { createLoggerComponent } = require('../../components/logger');
const { createCacheComponent } = require('../../components/cache');
const { createStorageComponent } = require('../../components/storage');
const {
	bootstrapStorage,
	setupServers,
	startListening,
	subscribeToEvents,
	bootstrapSwagger,
	bootstrapCache,
} = require('./init_steps');

module.exports = class HttpApi {
	constructor(channel, options) {
		options.config.root = __dirname; // TODO: See wy root comes defined for the chain module.
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
	}

	async bootstrap() {
		global.constants = this.options.constants;

		// Logger
		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);
		this.logger = createLoggerComponent(loggerConfig);

		// Cache
		this.logger.debug('Initiating cache...');
		const cacheConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'cache'
		);
		const cache = createCacheComponent(cacheConfig, this.logger);

		// Storage
		this.logger.debug('Initiating storage...');
		const storageConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'storage'
		);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent(
						Object.assign({}, loggerConfig, {
							logFileName: storageConfig.logFileName,
						})
					);
		const storage = createStorageComponent(storageConfig, dbLogger);

		const applicationState = await this.channel.invoke(
			'lisk:getApplicationState'
		);

		// Setup scope
		this.scope = {
			components: {
				cache,
				logger: this.logger,
				storage,
			},
			channel: this.channel,
			config: this.options.config,
			applicationState,
		};

		this.channel.subscribe('lisk:state:updated', event => {
			Object.assign(this.scope.applicationState, event.data);
		});

		// Bootstrap Cache component
		await bootstrapCache(this.scope);
		// Bootstrap Storage component
		await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
		// Set up Express and HTTP(s) and WS(s) servers
		const {
			expressApp,
			httpServer,
			httpsServer,
			wsServer,
			wssServer,
		} = await setupServers(this.scope);
		// Bootstrap Swagger and attaches it to Express app
		await bootstrapSwagger(this.scope, expressApp);
		// Start listening for HTTP(s) requests
		await startListening(this.scope, { httpServer, httpsServer });
		// Subsribe to channel events
		subscribeToEvents(this.scope, { wsServer, wssServer });
	}

	async cleanup(code, error) {
		const { components } = this.scope;
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}
		this.logger.info('Cleaning HTTP API...');

		try {
			if (components !== undefined) {
				Object.keys(components).forEach(async key => {
					if (components[key].cleanup) {
						await components[key].cleanup();
					}
				});
			}
		} catch (componentCleanupError) {
			this.logger.error(componentCleanupError);
		}
		this.logger.info('Cleaned up successfully');
	}
};
