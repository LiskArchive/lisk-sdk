'use strict';

var node = require('./../../node.js');

var chai = require('chai');
var expect = require('chai').expect;
var async = require('async');
var sinon = require('sinon');
var modulesLoader = require('../../common/initModule').modulesLoader;
var Cache = require('../../../modules/cache.js');

describe('cache module', function () {

	var cache;

	before(function (done) {
		node.config.cacheEnabled = true;
		done();
	});

	before(function (done) {
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			expect(err).to.not.exist;
			expect(__cache).to.be.an('object');
			cache = __cache;
			return done();
		});
	});

	after(function (done) {
		cache.quit();
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			expect(err).to.not.exist;
			expect(status).to.equal('OK');
			done(err, status);
		});
	});

	it('should set the key value correctly', function (done) {
		var key = 'test_key';
		var value = {testObject: 'testValue'};

		cache.setJsonForKey(key, value, function (err, status) {
			expect(err).to.not.exist;
			expect(status).to.equal('OK');
			cache.getJsonForKey(key, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(value);
				done(err, value);
			});
		});
	});

	it('should return null for non-existent key', function (done) {
		var key = 'test_key';

		cache.getJsonForKey(key, function (err, value) {
			expect(err).to.not.exist;
			expect(value).to.equal(null);
			done(err, value);
		});
	});

	it('should remove all keys from cache on flushDb', function (done) {
		var key1 = 'test_key1';
		var key2 = 'test_key2';
		var dummyValue = { a: 'dummyValue' };
		async.series([
			// save new entries in cache
			function (callback) {
				async.map([key1, key2], function (key, cb) {
					cache.setJsonForKey(key, dummyValue, cb);
				}, function (err, result) {
					expect(err).to.not.exist;
					expect(result).to.be.an('array');
					callback(err, result);
				});
			},
			// flush cache database
			function (callback) {
				cache.flushDb(function (err, status) {
					expect(err).to.not.exist;
					expect(status).to.equal('OK');
					callback(err, status);
				});
			},
			// check if entries exist
			function (callback) {
				async.map([key1, key2], function (key, cb) {
					cache.getJsonForKey(key, cb);
				}, function (err, result) {
					expect(err).to.not.exist;
					expect(result).to.be.an('array');
					expect(result).to.have.length(2);
					result.forEach(function (value) {
						expect(value).to.eql(null);
					});
					callback(err, result);
					done(err, result);
				});
			}]);
	});
});
