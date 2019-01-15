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

const redis = require('redis');
const createCacheConnector = require('../../../helpers/cache_connector');

describe('CacheConnector', () => {
	let CacheConnector;
	let validConfig;
	let validLogger;
	let redisClientStub;
	let redisCreateClientStub;
	let _onRedisConnectionErrorStub;
	let _onRedisReadyStub;
	const validRedisClientError = new Error('Valid redis client error');
	let result;
	const ERROR = 0;
	const READY = 1;
	const CALLBACK = 1;

	before(done => {
		validLogger = {
			info: sinonSandbox.stub(),
		};
		validConfig = {};
		CacheConnector = createCacheConnector(validConfig, validLogger);
		_onRedisConnectionErrorStub = sinonSandbox.stub(
			CacheConnector,
			'_onRedisConnectionError'
		);
		_onRedisReadyStub = sinonSandbox.stub(CacheConnector, '_onRedisReady');
		done();
	});

	beforeEach(done => {
		redisClientStub = {
			on: sinonSandbox.stub(),
			once: sinonSandbox.stub(),
			removeListener: sinonSandbox.stub(),
			quit: sinonSandbox.stub(),
		};
		redisCreateClientStub = sinonSandbox
			.stub(redis, 'createClient')
			.returns(redisClientStub);
		CacheConnector.connect((connectError, connectResult) => {
			result = connectResult;
		});
		return done();
	});

	afterEach(done => {
		_onRedisConnectionErrorStub.reset();
		_onRedisReadyStub.reset();
		redisClientStub.on.reset();
		redisClientStub.once.reset();
		redisClientStub.removeListener.reset();
		redisCreateClientStub.restore();
		validLogger.info.reset();
		done();
	});

	describe('when cacheEnabled is enabled', () => {
		it('shold subscribe for client.once events emitter twice', done => {
			expect(redisClientStub.once).to.be.calledTwice;
			done();
		});

		it('shold subscribe for client.once "error" event', done => {
			expect(redisClientStub.once).to.be.calledWith('error');
			done();
		});

		it('shold subscribe for client.once "ready" event', done => {
			expect(redisClientStub.once).to.be.calledWith('ready');
			done();
		});

		describe('when redis.createClient emits either "error" or "ready" event', () => {
			before(done => {
				_onRedisReadyStub.restore();
				_onRedisConnectionErrorStub.restore();
				done();
			});

			after(done => {
				_onRedisConnectionErrorStub = sinonSandbox.stub(
					CacheConnector,
					'_onRedisConnectionError'
				);
				_onRedisReadyStub = sinonSandbox.stub(CacheConnector, '_onRedisReady');
				done();
			});

			describe('when connection attempt was unsuccessful', () => {
				beforeEach(done => {
					redisClientStub.once.args[ERROR][CALLBACK](validRedisClientError);
					done();
				});
				it('should call callback with result containing Redis client', done => {
					expect(result).to.eql(redisClientStub);
					done();
				});
			});

			describe('when connection attempt was successful', () => {
				beforeEach(done => {
					redisClientStub.once.args[READY][CALLBACK]();
					done();
				});
				it('should call callback with result containing Redis client', done => {
					expect(result).to.eql(redisClientStub);
					done();
				});
			});
		});

		describe('when redis.createClient emits "error" before "ready" event', () => {
			beforeEach(done => {
				redisClientStub.once.args[ERROR][CALLBACK](validRedisClientError);
				done();
			});

			it('should call _onRedisConnectionError event handler', done => {
				expect(_onRedisConnectionErrorStub).to.be.calledOnce;
				done();
			});

			it('should not call _onRedisReady event handler', done => {
				expect(_onRedisReadyStub).not.to.be.called;
				done();
			});
		});

		describe('when redis.createClient emits "ready" before "error" event', () => {
			beforeEach(done => {
				redisClientStub.once.args[READY][CALLBACK]();
				done();
			});

			it('should not call _onRedisConnectionError event handler', done => {
				expect(_onRedisConnectionErrorStub).not.to.be.called;
				done();
			});

			it('should call _onRedisReady event handler', done => {
				expect(_onRedisReadyStub).to.be.calledOnce;
				done();
			});
		});
	});
});
