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

describe('cache', function () {

	describe('connect', function () {

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

		before(function () {
			validLogger = {
				info: function (info) {
					info.should.eq('App connected with redis server');
				},
				error: function (message, errorObject) {
					message.should.eq('Redis:');
					errorObject.should.be.an('error');
				}
			};
			validConfig = {};
			validCacheEnabled = true;
		});

		beforeEach(function () {
			redisCreateClientOnStub = sinonSandbox.stub();
			redisCreateClientResult = {on: redisCreateClientOnStub};
			redisCreateClientStub = sinonSandbox.stub(redis, 'createClient').returns(redisCreateClientResult);
			cache.connect(validCacheEnabled, validConfig, validLogger, function (connectError, connectResult) {
				err = connectError;
				result = connectResult;
			});
		});

		afterEach( function () {
			redisCreateClientOnStub.reset();
			redisCreateClientStub.restore();
		});

		describe('when cacheEnabled = false', function () {

			before(function () {
				validCacheEnabled = false;
			});

			it('should call callback with error = null', function () {
				should.not.exist(err);
			});

			it('should call callback with result containing cacheEnabled = false', function () {
				result.should.have.property('cacheEnabled').equal(false);
			});

			it('should call callback with result containing client = null', function () {
				result.should.have.property('client').to.be.null;
			});
		});

		describe('when cacheEnabled = true', function () {

			before(function () {
				validCacheEnabled = true;
			});

			describe('when config.password = null', function () {

				before(function () {
					validConfig = {password: null};
				});

				it('should delete the password attribute from config', function () {
					validConfig.should.not.have.property('password');
				});
			});

			describe('when redis.createClient has an error', function () {

				beforeEach(function () {
					redisCreateClientOnStub.args[ERROR][CALLBACK](validRedisClientError);
				});

				it('should call callback with result containing cacheEnabled = true', function () {
					result.cacheEnabled.should.eq(true);
				});

				it('should call callback with result containing client object', function () {
					result.client.should.equal(redisCreateClientResult);
				});
			});

			describe('when redis.createClient is ready', function () {

				beforeEach(function () {
					redisCreateClientOnStub.args[READY][CALLBACK]();
				});

				it('should call callback with result containing with cacheEnabled = true', function () {
					result.cacheEnabled.should.eq( true );
				});

				it('should call callback with result containing an instance of redis client', function () {
					result.client.should.eql(redisCreateClientResult);
				});
			});
		});
	});
});
