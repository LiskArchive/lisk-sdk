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

const HttpApi = rewire('../../../../../src/modules/http_api/http_api');

describe('HttpApi', () => {
	let httpApi;
	const stubs = {};
	const loggerConfig = {
		logFileName: 'logs.log',
	};
	const cacheConfig = 'aCacheConfig';
	const storageConfig = {
		logFileName: 'logs.log',
	};

	beforeEach(async () => {
		stubs.channel = {
			invoke: sinonSandbox.stub(),
			subscribe: sinonSandbox.stub(),
		};
		stubs.options = {
			constants: {
				activeDelegates: 101,
			},
		};
		stubs.logger = {
			debug: sinonSandbox.stub(),
		};
		stubs.storage = sinonSandbox.stub();
		stubs.cache = sinonSandbox.stub();
		stubs.servers = {
			expressApp: sinonSandbox.stub(),
			httpServer: sinonSandbox.stub(),
			httpsServer: sinonSandbox.stub(),
			wsServer: sinonSandbox.stub(),
			wssServer: sinonSandbox.stub(),
		};

		stubs.createLoggerComponent = sinonSandbox.stub().returns(stubs.logger);
		stubs.createCacheComponent = sinonSandbox.stub().returns(stubs.cache);
		stubs.createStorageComponent = sinonSandbox.stub().returns(stubs.storage);
		stubs.bootstrapCache = sinonSandbox.stub();
		stubs.bootstrapStorage = sinonSandbox.stub();
		stubs.setupServers = sinonSandbox.stub().returns(stubs.servers);
		stubs.bootstrapSwagger = sinonSandbox.stub();
		stubs.startListening = sinonSandbox.stub();
		stubs.subscribeToEvents = sinonSandbox.stub();
		stubs.channel.subscribe = sinonSandbox.stub();

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

		HttpApi.__set__('createLoggerComponent', stubs.createLoggerComponent);
		HttpApi.__set__('createCacheComponent', stubs.createCacheComponent);
		HttpApi.__set__('createStorageComponent', stubs.createStorageComponent);
		HttpApi.__set__('bootstrapCache', stubs.bootstrapCache);
		HttpApi.__set__('bootstrapStorage', stubs.bootstrapStorage);
		HttpApi.__set__('setupServers', stubs.setupServers);
		HttpApi.__set__('bootstrapSwagger', stubs.bootstrapSwagger);
		HttpApi.__set__('startListening', stubs.startListening);
		HttpApi.__set__('subscribeToEvents', stubs.subscribeToEvents);

		httpApi = new HttpApi(stubs.channel, stubs.options);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should export HttpApi class', async () => {
		expect(HttpApi.prototype.constructor.name).to.be.equal('HttpApi');
	});

	describe('constructor', () => {
		it('should accept channel as first parameter and assign to object instance', async () => {
			expect(httpApi.channel).to.equal(stubs.channel);
		});
		it('should accept options as second parameter and assign to object instance', async () => {
			expect(httpApi.options).to.equal(stubs.options);
		});
		it('should assign null to logger', async () => {
			expect(httpApi.logger).to.be.null;
		});
		it('should assign null to scope', async () => {
			expect(httpApi.scope).to.be.null;
		});
	});

	describe('bootstrap', () => {
		beforeEach(async () => {
			await httpApi.bootstrap();
		});

		it('should be an async function', async () => {
			expect(httpApi.bootstrap.constructor.name).to.be.equal('AsyncFunction');
		});
		it('should invoke app:getComponentConfig to get "logger" configuration', async () => {
			expect(stubs.channel.invoke).to.be.calledWithExactly(
				'app:getComponentConfig',
				'logger',
			);
		});
		it('should invoke app:getComponentConfig to get "storage" configuration', async () => {
			expect(stubs.channel.invoke).to.be.calledWithExactly(
				'app:getComponentConfig',
				'storage',
			);
		});
		it('should invoke app:getComponentConfig to get "cache" configuration', async () => {
			expect(stubs.channel.invoke).to.be.calledWithExactly(
				'app:getComponentConfig',
				'cache',
			);
		});
		it('should create logger component with loggerConfig and assign to object instance', async () => {
			expect(stubs.createLoggerComponent).to.be.calledWithExactly({
				...loggerConfig,
				module: 'http_api',
			});
			expect(httpApi.logger).to.be.equal(stubs.logger);
		});

		describe('dbLogger', () => {
			it('should set to logger if main log file is same as storage log file', async () => {
				storageConfig.logFileName = loggerConfig.logFileName;
				await httpApi.bootstrap();
				expect(stubs.createStorageComponent).to.be.calledWithExactly(
					storageConfig,
					stubs.logger,
				);
			});
			it('should create new logger component if main log file is not same as storage log file', async () => {
				storageConfig.logFileName = 'logs.log';
				loggerConfig.logFileName = 'aDifferentFile.log';
				const dbLogger = {
					debug: sinonSandbox.stub(),
				};

				stubs.createLoggerComponent.returns(dbLogger);
				await httpApi.bootstrap();

				expect(stubs.createLoggerComponent).to.be.calledWithExactly({
					...loggerConfig,
					module: 'http_api',
				});

				expect(stubs.createStorageComponent).to.be.calledWithExactly(
					storageConfig,
					dbLogger,
				);
			});
		});
		it('should log "Initiating cache..."', async () => {
			expect(stubs.logger.debug).to.be.calledWith('Initiating cache...');
		});
		it('should create cache component', async () => {
			expect(stubs.createCacheComponent).to.be.calledWithExactly(
				cacheConfig,
				stubs.logger,
			);
		});
		it('should log "Initiating storage..."', async () => {
			expect(stubs.logger.debug).to.be.calledWith('Initiating storage...');
		});
		it('should initialize scope object with valid structure and assign it to object instance', async () => {
			expect(httpApi.scope).to.have.property('buildVersion');
			expect(httpApi.scope).to.have.property('lastCommitId');
			expect(httpApi.scope.channel).to.be.equal(stubs.channel);
			expect(httpApi.scope.config).to.be.equal(stubs.options);
			expect(httpApi.scope.applicationState).to.be.deep.equal({});
			expect(httpApi.scope.components).to.be.deep.equal({
				cache: stubs.cache,
				logger: stubs.logger,
				storage: stubs.storage,
			});
		});

		it('should call bootstrapStorage() with proper arguments', async () => {
			expect(stubs.bootstrapStorage).to.be.calledWithExactly(
				httpApi.scope,
				global.constants.activeDelegates,
			);
		});
		it('should call bootstrapCache() with proper arguments', async () => {
			expect(stubs.bootstrapCache).to.be.calledWithExactly(httpApi.scope);
		});
		it('should call setupServers() with proper arguments', async () => {
			expect(stubs.setupServers).to.be.calledWithExactly(httpApi.scope);
		});
		it('should call startListening() with proper arguments', async () => {
			const { httpServer, httpsServer } = stubs.servers;
			expect(stubs.startListening).to.be.calledWithExactly(httpApi.scope, {
				httpServer,
				httpsServer,
			});
		});
		it('should call subscribeToEvents() with proper arguments', async () => {
			const { wsServer } = stubs.servers;
			expect(stubs.subscribeToEvents).to.be.calledWithExactly(httpApi.scope, {
				wsServer,
			});
		});

		it('should call channel.subscribe() with proper arguments', async () => {
			const channelSubscribeStub = stubs.channel.subscribe;
			expect(channelSubscribeStub.callCount).to.be.equal(4);
			expect(channelSubscribeStub.firstCall.args[0]).to.be.eql(
				'app:state:updated',
			);
			expect(channelSubscribeStub.secondCall.args[0]).to.be.eql(
				'app:round:change',
			);
			expect(channelSubscribeStub.thirdCall.args[0]).to.be.eql('app:block:new');
			expect(channelSubscribeStub.lastCall.args[0]).to.be.eql(
				'app:block:delete',
			);
		});
	});
});
