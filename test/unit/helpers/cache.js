'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var redis = require('redis');

var cache = require('../../../helpers/cache');

describe('cache', function () {

	var ERROR = new Error('Cache Test Callback Error');

	var mockedLogger = {
		'info': function (info) {expect(info).to.eq('App connected with redis server');},
		'error': function (message, err) {
			expect(message).to.eq('Redis:');
			expect(err).to.eql(ERROR);
		}
	};

	var mockRedisClientReady = {
		'on': function (type, cb) {
			if ( 'ready' === type ) {
				cb();
			}
		}
	};

	var mockedRedis;

	beforeEach(function () {
		mockedRedis = sinon.mock(redis);
	});

	afterEach(function () {
		mockedRedis.verify();
	});

	describe('when cacheEnabled = false', function () {

		it('should call callback with error = null');

		it('should call callback with result = { cacheEnabled: cacheEnabled, client: null }', function () {
			mockedRedis.expects('createClient').never();
			cache.connect(false, {}, {}, function (err, result) {
				expect(result.cacheEnabled).to.eq( false );
				expect(result.client).to.be.null;
			});
		});
	});

	describe('when password = null',function () {

		it('should delete the password', function () {
			var config = {password: null};
			expect(config).to.have.property('password');
			mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockRedisClientReady);
			cache.connect(true, config, mockedLogger, function (err, result) {
				expect(result.cacheEnabled).to.eq( true );
				expect(result.client).to.eql(mockRedisClientReady);
				expect(config).to.not.have.property('password');
			});
		});
	});

	it('should call redis.createClient with config');

	describe('when redis.createClient succeeds', function () {

		it('should call logger.info with "App connected with redis server"');

		it('should call callback with error = null');

		it('should call callback with result = { cacheEnabled: cacheEnabled, client: client }');

		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockRedisClientReady);
		cache.connect(true, {}, mockedLogger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.eql(mockRedisClientReady);
		});
	});

	describe('when redis.createClient fails', function () {

		it('should call logger.info with "App connected with redis server"');

		it('should call callback with error = null');

		it('should call callback with result = { cacheEnabled: cacheEnabled, client: null }');

		// note that this cannot be integrated with the declared scope mock client.
		// This is because both ready and error are called by the client under Test
		// so test results will not pass.
		var mockRedisClientError = {
			'on': function (type, cb) {
				if ( 'error' === type ) {
					cb(ERROR);
				}
			}
		};
		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockRedisClientError);
		cache.connect(true, {}, mockedLogger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.be.null;
		});
	});
});
