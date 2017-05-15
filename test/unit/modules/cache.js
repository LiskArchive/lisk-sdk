'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var sinon = require('sinon');

var modulesLoader = require('../../common/initModule').modulesLoader;
var Cache = require('../../../modules/cache.js');

describe('cache module', function () {

	var cache;

	before(function (done) {
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			expect(err).to.not.exist;
			expect(__cache).to.be.an('object');
			cache = __cache;
			return done();
		});
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
});
