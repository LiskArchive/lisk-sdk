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

var redis = require('redis');
var cache = require('../../../helpers/cache');

describe('cache', () => {
	describe('connect', () => {
		var redisCreateClientStub;
		var redisCreateClientOnStub;
		var redisCreateClientResult;
		var validCacheEnabled;
		var validConfig;
		var validLogger;
		var validRedisClientError = new Error('Valid redis client error');
		var err;
		var result;
		const READY = 0;
		const ERROR = 1;
		const CALLBACK = 1;

		before(done => {
			validLogger = {
				info(info) {
					expect(info).to.eq('App connected with redis server');
				},
				error(message, errorObject) {
					expect(message).to.eq('Redis:');
					expect(errorObject).to.be.an('error');
				},
			};
			validConfig = {};
			validCacheEnabled = true;
			done();
		});

		beforeEach(done => {
			redisCreateClientOnStub = sinonSandbox.stub();
			redisCreateClientResult = { on: redisCreateClientOnStub };
			redisCreateClientStub = sinonSandbox
				.stub(redis, 'createClient')
				.returns(redisCreateClientResult);
			cache.connect(
				validCacheEnabled,
				validConfig,
				validLogger,
				(connectError, connectResult) => {
					err = connectError;
					result = connectResult;
				}
			);
			done();
		});

		afterEach(done => {
			redisCreateClientOnStub.reset();
			redisCreateClientStub.restore();
			done();
		});

		describe('when cacheEnabled = false', () => {
			before(done => {
				validCacheEnabled = false;
				done();
			});

			it('should call callback with error = null', done => {
				expect(err).to.be.null;
				done();
			});

			it('should call callback with result containing cacheEnabled = false', done => {
				expect(result)
					.to.have.property('cacheEnabled')
					.equal(false);
				done();
			});

			it('should call callback with result containing client = null', done => {
				expect(result).to.have.property('client').to.be.null;
				done();
			});
		});

		describe('when cacheEnabled = true', () => {
			before(done => {
				validCacheEnabled = true;
				done();
			});

			describe('when config.password = null', () => {
				before(done => {
					validConfig = { password: null };
					done();
				});

				it('should delete the password attribute from config', done => {
					expect(validConfig).to.not.have.property('password');
					done();
				});
			});

			describe('when redis.createClient has an error', () => {
				beforeEach(done => {
					redisCreateClientOnStub.args[ERROR][CALLBACK](validRedisClientError);
					done();
				});

				it('should call callback with result containing cacheEnabled = true', done => {
					expect(result.cacheEnabled).to.eq(true);
					done();
				});

				it('should call callback with result containing client object', done => {
					expect(result.client).to.equal(redisCreateClientResult);
					done();
				});
			});

			describe('when redis.createClient is ready', () => {
				beforeEach(done => {
					redisCreateClientOnStub.args[READY][CALLBACK]();
					done();
				});

				it('should call callback with result containing with cacheEnabled = true', done => {
					expect(result.cacheEnabled).to.eq(true);
					done();
				});

				it('should call callback with result containing an instance of redis client', done => {
					expect(result.client).to.eql(redisCreateClientResult);
					done();
				});
			});
		});
	});
});
