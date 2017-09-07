'use strict';

var chai = require('chai');
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

	beforeEach( function () {
		mockedRedis = sinon.mock(redis);
	});

	afterEach( function () {
		mockedRedis.verify();
	});

	it('is not enabled', function () {
		mockedRedis.expects('createClient').never();
		cache.connect(false, {}, {}, function (err, result) {
			expect(result.cacheEnabled).to.eq( false );
			expect(result.client).to.be.null;
		});
	});

	it('is enabled redis client callback ready', function () {
		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockRedisClientReady);
		cache.connect(true, {}, mockedLogger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.eql(mockRedisClientReady);
		});
	});

	it('is enabled redis client callback error', function () {
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

	it('deletes the password if it is null', function () {
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
