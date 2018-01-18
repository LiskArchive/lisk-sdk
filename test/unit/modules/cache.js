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

var async = require('async');
var lisk = require('lisk-js');

var accountFixtures = require('../../fixtures/accounts');

var modulesLoader = require('../../common/modulesLoader');
var randomUtil = require('../../common/utils/random');

var Cache = require('../../../modules/cache');

describe('cache', function () {

	var cache;

	before(function (done) {
		__testContext.config.cacheEnabled = true;
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			should.not.exist(err);
			__cache.should.be.an('object');
			cache = __cache;
			return done();
		});
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			should.not.exist(err);
			status.should.equal('OK');
			done(err, status);
		});
	});

	after(function (done) {
		cache.quit(done);
	});

	describe('setJsonForKey', function () {

		it('should set the key value correctly', function (done) {
			var key = 'test_key';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.getJsonForKey(key, function (err, res) {
					should.not.exist(err);
					res.should.eql(value);
					done(err, value);
				});
			});
		});

	});

	describe('getJsonForKey', function () {

		it('should return null for non-existent key', function (done) {
			var key = 'test_key';

			cache.getJsonForKey(key, function (err, value) {
				should.not.exist(err);
				should.not.exist(value);
				done(err, value);
			});
		});

		it('should get the correct value for the key', function (done) {
			var key = 'test_key';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.getJsonForKey(key, function (err, res) {
					should.not.exist(err);
					res.should.eql(value);
					done(err, value);
				});
			});
		});
	});

	describe('flushDb', function () {

		it('should remove all keys from cache', function (done) {
			var key1 = 'test_key1';
			var key2 = 'test_key2';
			var dummyValue = { a: 'dummyValue' };
			async.series([
				// save new entries in cache
				function (callback) {
					async.map([key1, key2], function (key, cb) {
						cache.setJsonForKey(key, dummyValue, cb);
					}, function (err, result) {
						should.not.exist(err);
						result.should.be.an('array');
						return callback(err, result);
					});
				},
				// flush cache database
				function (callback) {
					cache.flushDb(function (err, status) {
						should.not.exist(err);
						status.should.equal('OK');
						return callback(err, status);
					});
				},
				// check if entries exist
				function (callback) {
					async.map([key1, key2], function (key, cb) {
						cache.getJsonForKey(key, cb);
					}, function (err, result) {
						should.not.exist(err);
						result.should.be.an('array');
						result.should.have.length(2);
						result.forEach(function (value) {
							should.not.exist(value);
						});
						return callback(err, result);
					});
				}],
			function (err) {
				done(err);
			}
			);
		});
	});

	describe('removeByPattern', function () {

		it('should remove keys matching the pattern', function (done) {
			var key = '/api/transactions?123';
			var value = {testObject: 'testValue'};
			var pattern = '/api/transactions*';

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.removeByPattern(pattern, function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						should.not.exist(res);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern', function (done) {
			var key = '/api/transactions?123';
			var value = {testObject: 'testValue'};
			var pattern = '/api/delegate*';

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.removeByPattern(pattern, function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});

	});

	describe('onNewBlock', function () {

		it('should remove all keys matching pattern /api/transactions', function (done) {
			var key = '/api/transactions?123';
			var value = {testObject: 'testValue'};
			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.onNewBlock(function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						should.not.exist(res);
						done();
					});
				});
			});
		});

		it('should remove all keys matching pattern /api/blocks', function (done) {
			var key = '/api/blocks';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');

				cache.onNewBlock(function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						should.not.exist(res);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/blocks or /api/transactions', function (done) {
			var key = '/api/delegates';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');

				cache.onNewBlock(function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/transactions';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');

				cache.onSyncStarted();
				cache.onNewBlock(function (err) {
					err.should.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('onFinishRound', function (done) {

		it('should remove all keys matching pattern /api/delegates', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				cache.onFinishRound(null, function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						should.not.exist(res);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/delegates', function (done) {
			var key = '/api/blocks';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');

				cache.onFinishRound(null, function (err) {
					should.not.exist(err);
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/delegates';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');

				cache.onSyncStarted();
				cache.onFinishRound(null, function (err) {
					err.should.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});
	});

	describe('onTransactionsSaved', function (done) {

		it('shouldnt remove keys with pattern /api/delegate if there is no type 2 transaction', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				var transaction = lisk.transaction.createTransaction('1L', 1, accountFixtures.genesis.password, accountFixtures.genesis.secondPassword);

				cache.onTransactionsSaved([transaction], function (err) {
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});

		it('should remove keys that match pattern /api/delegate on type 2 transaction', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				var transaction = lisk.delegate.createDelegate(randomUtil.password(), randomUtil.delegateName().toLowerCase());

				cache.onTransactionsSaved([transaction], function (err) {
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						should.not.exist(res);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				should.not.exist(err);
				status.should.equal('OK');
				var transaction = lisk.delegate.createDelegate(randomUtil.password(), randomUtil.delegateName().toLowerCase());

				cache.onSyncStarted();
				cache.onTransactionsSaved([transaction], function (err) {
					err.should.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						should.not.exist(err);
						res.should.eql(value);
						done();
					});
				});
			});
		});
	});
});
