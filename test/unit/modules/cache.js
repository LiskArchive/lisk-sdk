'use strict';

var node = require('./../../node.js'); 
var chai = require('chai');
var expect = require('chai').expect;
var async = require('async');
var sinon = require('sinon');
var modulesLoader = require('../../common/initModule').modulesLoader;
var Cache = require('../../../modules/cache.js');

describe('cache', function () {

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
		cache.quit(done);
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			expect(err).to.not.exist;
			expect(status).to.equal('OK');
			done(err, status);
		});
	});

	describe('setJsonForKey', function () {

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

	});

	describe('getJsonForKey', function () {

		it('should return null for non-existent key', function (done) {
			var key = 'test_key';

			cache.getJsonForKey(key, function (err, value) {
				expect(err).to.not.exist;
				expect(value).to.equal(null);
				done(err, value);
			});
		});

		it('should get the correct value for the key', function (done) {
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
						expect(err).to.not.exist;
						expect(result).to.be.an('array');
						return callback(err, result);
					});
				},
				// flush cache database
				function (callback) {
					cache.flushDb(function (err, status) {
						expect(err).to.not.exist;
						expect(status).to.equal('OK');
						return callback(err, status);
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
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.removeByPattern(pattern, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.equal(null);
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
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.removeByPattern(pattern, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
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
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.onNewBlock(null, null, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should remove all keys matching pattern /api/blocks', function (done) {
			var key = '/api/blocks';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onNewBlock(null, null, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/blocks or /api/transactions', function (done) {
			var key = '/api/delegates';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onNewBlock(null, null, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/transactions';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onSyncStarted();
				cache.onNewBlock(null, null, function (err) {
					expect(err).to.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
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
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				cache.onFinishRound(null, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys that dont match pattern /api/delegates', function (done) {
			var key = '/api/blocks';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onFinishRound(null, function (err) {
					expect(err).to.not.exist;
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/delegates';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');

				cache.onSyncStarted();
				cache.onFinishRound(null, function (err) {
					expect(err).to.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

	});

	describe('onTransactionsSaved', function (done) {

		it('shouldnt remove keys with pattern /api/delegate if there is no type 2 trs', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				var transaction = node.lisk.transaction.createTransaction('1L', 1, node.gAccount.password, node.gAccount.secondPassword);

				cache.onTransactionsSaved([transaction], function (err) {
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});

		it('should remove keys that match pattern /api/delegate on type 2 trs', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName());

				cache.onTransactionsSaved([transaction], function (err) {
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.equal(null);
						done();
					});
				});
			});
		});

		it('should not remove keys when cacheReady = false', function (done) {
			var key = '/api/delegates?123';
			var value = {testObject: 'testValue'};

			cache.setJsonForKey(key, value, function (err, status) {
				expect(err).to.not.exist;
				expect(status).to.equal('OK');
				var transaction = node.lisk.delegate.createDelegate(node.randomPassword(), node.randomDelegateName());

				cache.onSyncStarted();
				cache.onTransactionsSaved([transaction], function (err) {
					expect(err).to.equal('Cache Unavailable');
					cache.onSyncFinished();
					cache.getJsonForKey(key, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql(value);
						done();
					});
				});
			});
		});
	});
});
