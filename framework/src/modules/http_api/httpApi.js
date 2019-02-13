const express = require('express');
const fs = require('fs');
const { promisify } = require('util');
const { createLoggerComponent } = require('../../components/logger');
const { createCacheComponent } = require('../../components/cache');
const { createStorageComponent } = require('../../components/storage');

const httpApi = require('./helpers/http_api.js');

module.exports = class HttpApi {
	constructor(channel, options) {
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
		this.httpServer = null;
		this.httpsServer = null;
		this.wsServer = null;
		this.wssServer = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);

		global.constants = this.options.constants;

		// Logger
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

		this.scope = {
			components: {
				cache,
				logger: this.logger,
				storage,
			},
			config: this.options.config,
		};

		try {
			this._bootstrapApi();
			this._startListening();
		} catch (error) {
			this.cleanup(1, error);
		}
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

		// TODO: Convert to async function
		await promisify(httpApi.bootstrapSwagger)(
			expressApp,
			this.options.config,
			this.logger,
			this.scope
		);
	}

	async _startListening() {
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

		await promisify(this.httpServer.listen)(
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

			await promisify(this.httpsServer.listen)(
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

	async cleanup(code, error) {
		if (error) {
			this.logger.fatal(error.toString());
			if (code === undefined) {
				code = 1;
			}
		} else if (code === undefined || code === null) {
			code = 0;
		}

		// TODO: Define how to handle cleanup if needed
	}
};
