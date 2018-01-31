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

		before(() => {
			validLogger = {
				info: function(info) {
					expect(info).to.eq('App connected with redis server');
				},
				error: function(message, errorObject) {
					expect(message).to.eq('Redis:');
					expect(errorObject).to.be.an('error');
				},
			};
			validConfig = {};
			validCacheEnabled = true;
		});

		beforeEach(() => {
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
		});

		afterEach(() => {
			redisCreateClientOnStub.reset();
			redisCreateClientStub.restore();
		});

		describe('when cacheEnabled = false', () => {
			before(() => {
				validCacheEnabled = false;
			});

			it('should call callback with error = null', () => {
				expect(err).to.be.null;
			});

			it('should call callback with result containing cacheEnabled = false', () => {
				expect(result)
					.to.have.property('cacheEnabled')
					.equal(false);
			});

			it('should call callback with result containing client = null', () => {
				expect(result).to.have.property('client').to.be.null;
			});
		});

		describe('when cacheEnabled = true', () => {
			before(() => {
				validCacheEnabled = true;
			});

			describe('when config.password = null', () => {
				before(() => {
					validConfig = { password: null };
				});

				it('should delete the password attribute from config', () => {
					expect(validConfig).to.not.have.property('password');
				});
			});

			describe('when redis.createClient has an error', () => {
				beforeEach(() => {
					redisCreateClientOnStub.args[ERROR][CALLBACK](validRedisClientError);
				});

				it('should call callback with result containing cacheEnabled = true', () => {
					expect(result.cacheEnabled).to.eq(true);
				});

				it('should call callback with result containing client object', () => {
					expect(result.client).to.equal(redisCreateClientResult);
				});
			});

			describe('when redis.createClient is ready', () => {
				beforeEach(() => {
					redisCreateClientOnStub.args[READY][CALLBACK]();
				});

				it('should call callback with result containing with cacheEnabled = true', () => {
					expect(result.cacheEnabled).to.eq(true);
				});

				it('should call callback with result containing an instance of redis client', () => {
					expect(result.client).to.eql(redisCreateClientResult);
				});
			});
		});
	});
});
