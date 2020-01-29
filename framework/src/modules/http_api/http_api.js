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

const { createLoggerComponent } = require('../../components/logger');
const {
	createCacheComponent,
	CACHE_KEYS_BLOCKS,
	CACHE_KEYS_DELEGATES,
	CACHE_KEYS_TRANSACTIONS,
	CACHE_KEYS_TRANSACTION_COUNT,
} = require('../../components/cache');
const { createStorageComponent } = require('../../components/storage');
const {
	bootstrapStorage,
	setupServers,
	startListening,
	subscribeToEvents,
	bootstrapSwagger,
	bootstrapCache,
} = require('./init_steps');

const TRANSACTION_TYPES_DELEGATE = [2, 10];

module.exports = class HttpApi {
	constructor(channel, options) {
		options.root = __dirname; // TODO: See wy root comes defined for the chain module.
		this.channel = channel;
		this.options = options;
		this.logger = null;
		this.scope = null;
	}

	async bootstrap() {
		global.constants = this.options.constants;

		// Logger
		const loggerConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'logger',
		);
		this.logger = createLoggerComponent({
			...loggerConfig,
			module: 'http_api',
		});

		// Cache
		this.logger.debug('Initiating cache...');
		const cacheConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'cache',
		);
		const cache = createCacheComponent(cacheConfig, this.logger);

		// Storage
		this.logger.debug('Initiating storage...');
		const storageConfig = await this.channel.invoke(
			'app:getComponentConfig',
			'storage',
		);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent({
						...loggerConfig,
						logFileName: storageConfig.logFileName,
						module: 'http_api:database',
				  });
		const storage = createStorageComponent(storageConfig, dbLogger);

		const applicationState = await this.channel.invoke(
			'app:getApplicationState',
		);

		// Setup scope
		this.scope = {
			components: {
				cache,
				logger: this.logger,
				storage,
			},
			channel: this.channel,
			config: this.options,
			lastCommitId: this.options.lastCommitId,
			buildVersion: this.options.buildVersion,
			applicationState,
		};

		this.channel.subscribe('app:state:updated', event => {
			Object.assign(this.scope.applicationState, event.data);
		});

		this.channel.subscribe('app:blocks:change', async event => {
			await this.cleanCache(
				[CACHE_KEYS_BLOCKS, CACHE_KEYS_TRANSACTIONS],
				`${event.module}:${event.name}`,
			);
		});

		this.channel.subscribe('app:rounds:change', async event => {
			await this.cleanCache(
				[CACHE_KEYS_DELEGATES],
				`${event.module}:${event.name}`,
			);
		});

		this.channel.subscribe('app:transactions:confirmed:change', async event => {
			const transactions = event.data;
			// Default keys to clear
			const keysToClear = [CACHE_KEYS_TRANSACTION_COUNT];
			// If there was a delegate registration clear delegates cache too
			const delegateTransaction = transactions.find(
				transaction =>
					!!transaction &&
					TRANSACTION_TYPES_DELEGATE.includes(transaction.type),
			);
			if (delegateTransaction) {
				keysToClear.push(CACHE_KEYS_DELEGATES);
			}
			// Only clear cache if the block actually includes transactions
			if (transactions.length) {
				await this.cleanCache(keysToClear, `${event.module}:${event.name}`);
			}
		});

		// Bootstrap Cache component
		await bootstrapCache(this.scope);
		// Bootstrap Storage component
		await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
		// Set up Express and HTTP(s) and WS(s) servers
		const { expressApp, httpServer, httpsServer, wsServer } = setupServers(
			this.scope,
		);
		// Bootstrap Swagger and attaches it to Express app
		await bootstrapSwagger(this.scope, expressApp);
		// Start listening for HTTP(s) requests
		await startListening(this.scope, { httpServer, httpsServer });
		// Subscribe to channel events
		subscribeToEvents(this.scope, { wsServer });
	}

	async cleanup() {
		const { components } = this.scope;

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

	async cleanCache(cacheKeysToClear, eventInfo) {
		if (
			this.scope.components &&
			this.scope.components.cache &&
			this.scope.components.cache.isReady()
		) {
			const tasks = cacheKeysToClear.map(key =>
				this.scope.components.cache.removeByPattern(key),
			);
			try {
				this.logger.trace(
					{ cacheKeysToClear, eventInfo },
					'Cache - clear cache keys',
				);
				await Promise.all(tasks);
			} catch (error) {
				this.logger.error(error, 'Cache - Error clearing keys on new Block');
			}
		}
	}
};
