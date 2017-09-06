'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var redis = require('redis');

var cache = require('../../../helpers/cache');

describe('cache', function () {

	it('is not enabled', function () {
		cache.connect(false, {}, {}, function (err, result) {
			expect(result.cacheEnabled).to.eq( false );
			expect(result.client).to.be.null;
		});
	});

	it('is enabled redis client callback ready', function () {

		var logger = {
			'info': function (info) {expect(info).to.eq('App connected with redis server');}
		};

		var mockredisclient = {
			'on': function (type, cb) {
				if ( 'ready' === type ) {
					cb();
				}
			}
		};

		var mockedRedis = sinon.mock(redis);
		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockredisclient);
		cache.connect(true, {}, logger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.be.not.null;

			mockedRedis.restore();
			mockedRedis.verify();
		});
	});

	it('is enabled redis client callback error', function () {

		var logger = {
			'error': function (message, err) {
				expect(message).to.eq('Redis:');
				expect(err + '').to.eq('Error: Cache Test Callback Error');

			}
		};

		var mockredisclient = {
			'on': function (type, cb) {
				if ( 'error' === type ) {
					cb(new Error('Cache Test Callback Error'));
				}
			}
		};

		var mockedRedis = sinon.mock(redis);
		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockredisclient);
		cache.connect(true, {}, logger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.be.null;

			mockedRedis.restore();
			mockedRedis.verify();
		});
	});

	it('deletes the password if it is null', function () {

		var logger = {
			'info': function (info) {expect(info).to.eq('App connected with redis server');}
		};

		var mockredisclient = {
			'on': function (type, cb) {
				if ( 'ready' === type ) {
					cb();
				}
			}
		};

		var config = {password: null};
		expect(config).to.have.property('password');
		var mockedRedis = sinon.mock(redis);
		mockedRedis.expects('createClient').once().withArgs(sinon.match.any).returns(mockredisclient);
		cache.connect(true, config, logger, function (err, result) {
			expect(result.cacheEnabled).to.eq( true );
			expect(result.client).to.be.not.null;
			expect(config).to.not.have.property('password');

			mockedRedis.restore();
			mockedRedis.verify();
		});
	});
});
