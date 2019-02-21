const express = require('express');
const fs = require('fs');
const { promisify } = require('util');
const { createLoggerComponent } = require('../../components/logger');
const { createCacheComponent } = require('../../components/cache');
const { createStorageComponent } = require('../../components/storage');
const { createSystemComponent } = require('../../components/system');
const bootstrapStorage = require('./init_steps/bootstrap_storage');

const httpApi = require('./helpers/http_api.js');

module.exports = class HttpApi {
	constructor(channel, options) {
		options.config.root = __dirname; // TODO: See wy root comes defined for the chain module.
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
		this.httpServer = null;
		this.httpsServer = null;
		this.wsServer = null;
		this.wssServer = null; // TODO: We were not using wss before. Decide what to do with it.
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

		// System
		this.logger.debug('Initiating system...');
		const systemConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'system'
		);
		const system = createSystemComponent(systemConfig, this.logger, storage);
		// Setup scope
		this.scope = {
			components: {
				cache,
				logger: this.logger,
				storage,
				system,
			},
			channel: this.channel,
			config: this.options.config,
		};

		await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
		await this._bootstrapApi();
		await this._startListening();
		this._subscribeToEvents();
	}

	async _bootstrapApi() {
		const expressApp = express();

		if (this.options.config.coverage) {
			// eslint-disable-next-line import/no-extraneous-dependencies
			const im = require('istanbul-middleware');
			this.logger.debug(
				'Hook loader for coverage - Do not use in production environment!'
			);
			im.hookLoader(__dirname);
			expressApp.use('/coverage', im.createHandler());
		}

		if (this.options.config.trustProxy) {
			expressApp.enable('trust proxy');
		}

		this.httpServer = require('http').createServer(expressApp);
		this.wsServer = require('socket.io')(this.httpServer);

		let privateKey;
		let certificate;

		if (this.options.config.api.ssl && this.options.config.api.ssl.enabled) {
			privateKey = fs.readFileSync(this.options.config.api.ssl.options.key);
			certificate = fs.readFileSync(this.options.config.api.ssl.options.cert);

			this.httpsServer = require('https').createServer(
				{
					key: privateKey,
					cert: certificate,
					ciphers:
						'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
				},
				expressApp
			);

			this.wssServer = require('socket.io')(this.httpsServer);
		}

		await promisify(httpApi.bootstrapSwagger)(
			expressApp,
			this.options.config,
			this.logger,
			this.scope
		);
	}

	async _startListening() {
		// There is an issue with promisify server.listen so used constructor
		const startServer = async (server, port, host) =>
			new Promise((resolve, reject) => {
				server.listen({ host, port }, err => (err ? reject(err) : resolve()));
			});

		this.httpServer.headersTimeout = this.options.config.api.options.limits.headersTimeout;
		// Disconnect idle clients
		this.httpServer.setTimeout(
			this.options.config.api.options.limits.serverSetTimeout
		);

		this.httpServer.on('timeout', socket => {
			this.logger.info(
				`Disconnecting idle socket: ${socket.remoteAddress}:${
					socket.remotePort
				}`
			);
			socket.destroy();
		});

		await startServer(
			this.httpServer,
			this.options.config.httpPort,
			this.options.config.address
		);

		this.logger.info(
			`Lisk started: ${this.options.config.address}:${
				this.options.config.httpPort
			}`
		);

		if (this.options.config.api.ssl.enabled) {
			// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
			this.httpsServer.headersTimeout = this.options.config.api.options.limits.headersTimeout;
			this.httpsServer.setTimeout(
				this.options.config.api.options.limits.serverTimeout
			);
			this.httpsServer.on('timeout', socket => {
				this.logger.info(
					`Disconnecting idle socket: ${socket.remoteAddress}:${
						socket.remotePort
					}`
				);
				socket.destroy();
			});

			await startServer(
				this.httpsServer,
				this.options.config.api.ssl.options.port,
				this.options.config.api.ssl.options.address
			);

			this.logger.info(
				`Lisk https started: ${this.options.config.api.ssl.options.address}:${
					this.options.config.api.ssl.options.port
				}`
			);
		}
	}

	_subscribeToEvents() {
		this.channel.subscribe('blocks:change', event => {
			this.wsServer.emit('blocks/change', event.data);
		});
		this.channel.subscribe('signature:change', event => {
			this.wsServer.emit('signature/change', event.data);
		});
		this.channel.subscribe('transactions:change', event => {
			this.wsServer.emit('transactions/change', event.data);
		});
		this.channel.subscribe('rounds:change', event => {
			this.wsServer.emit('rounds/change', event.data);
		});
		this.channel.subscribe('multisignatures:signature:change', event => {
			this.wsServer.emit('multisignatures/signature/change', event.data);
		});
		this.channel.subscribe('delegates:fork', event => {
			this.wsServer.emit('delegates/fork', event.data);
		});
		this.channel.subscribe('loader:sync', event => {
			this.wsServer.emit('loader/sync', event.data);
		});
	}
};
