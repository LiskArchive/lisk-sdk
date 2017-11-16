'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
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
					expect(info).to.eq('App connected with redis server');
				},
				error: function (message, errorObject) {
					expect(message).to.eq('Redis:');
					expect(errorObject).to.be.an('error');
				}
			};
			validConfig = {};
			validCacheEnabled = true;
		});

		beforeEach(function () {
			redisCreateClientOnStub = sinon.stub();
			redisCreateClientResult = {on: redisCreateClientOnStub};
			redisCreateClientStub = sinon.stub(redis, 'createClient').returns(redisCreateClientResult);
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
				expect(err).to.be.null;
			});

			it('should call callback with result containing cacheEnabled = false', function () {
				expect(result).to.have.property('cacheEnabled').equal(false);
			});

			it('should call callback with result containing client = null', function () {
				expect(result).to.have.property('client').to.be.null;
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
					expect(validConfig).to.not.have.property('password');
				});
			});

			describe('when redis.createClient has an error', function () {

				beforeEach(function () {
					redisCreateClientOnStub.args[ERROR][CALLBACK](validRedisClientError);
				});

				it('should call callback with result containing cacheEnabled = true', function () {
					expect(result.cacheEnabled).to.eq(true);
				});

				it('should call callback with result containing client = null', function () {
					expect(result.client).to.be.null;
				});
			});

			describe('when redis.createClient is ready', function () {

				beforeEach(function () {
					redisCreateClientOnStub.args[READY][CALLBACK]();
				});

				it('should call callback with result containing with cacheEnabled = true', function () {
					expect(result.cacheEnabled).to.eq( true );
				});

				it('should call callback with result containing an instance of redis client', function () {
					expect(result.client).to.eql(redisCreateClientResult);
				});
			});
		});
	});
});
