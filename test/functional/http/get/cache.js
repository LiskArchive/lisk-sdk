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
var expect = require('chai').expect;
var swaggerEndpoint = require('../../../common/swaggerSpec');
var Promise = require('bluebird');

var test = require('../../functional.js');
var randomUtil = require('../../../common/utils/random');
var accountFixtures = require('../../../fixtures/accounts');
var modulesLoader = require('../../../common/modulesLoader');
var apiHelpers = require('../../../common/helpers/api');
var waitFor = require('../../../common/utils/waitFor');
var waitForBlocksPromise = Promise.promisify(waitFor.blocks);
var onNewRoundPromise = Promise.promisify(waitFor.newRound);
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('cached endpoints', function () {

	var cache;
	var getJsonForKeyPromise;

	before(function (done) {
		test.config.cacheEnabled = true;
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			getJsonForKeyPromise = Promise.promisify(cache.getJsonForKey);
			expect(err).to.not.exist;
			expect(__cache).to.be.an('object');
			return done(err);
		});
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			expect(err).to.not.exist;
			expect(status).to.equal('OK');
			done(err);
		});
	});

	after(function (done) {
		cache.quit(done);
	});

	describe('GET /transactions', function () {

		var transactionsEndpoint = new swaggerEndpoint('GET /transactions');
		var account = randomUtil.account();

		it('cache transactions by the url and parameters when response is a success', function () {
			var params = {
				'senderId': accountFixtures.genesis.address,
			};

			return transactionsEndpoint.makeRequest(params, 200).then(function (res) {
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(res.req.path);
					});
				})).then(function (responses) {
					expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var params = {
				'whateversenderId': accountFixtures.genesis.address
			};

			return transactionsEndpoint.makeRequest(params, 400).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message');

				return getJsonForKeyPromise(res.req.path).then(function (response) {
					expect(response).to.eql(null);
				});
			});
		});
	});

	describe('GET /blocks', function () {

		var blocksEndpoint = new swaggerEndpoint('GET /blocks');
		var initialResponse;

		it('cache blocks by the url and parameters when response is a success', function () {
			var params = {
				'height': '1'
			};
			var initialResponse = null;

			return blocksEndpoint.makeRequest(params, 200).then(function (res) {
				initialResponse = res;
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(res.req.path);
					});
				}));
			}).then(function (responses) {
				responses.should.deep.include(initialResponse.body);
			});
		});

		it('should not cache if response is not a success', function () {
			var params = [
				'height=' + -100
			];

			var urlPath;

			return blocksEndpoint.makeRequest({height: -100}, 400).then(function (res) {
				expectSwaggerParamError(res, 'height');
				return getJsonForKeyPromise(res.req.path);
			}).then(function (response) {
				expect(response).to.eql(null);
			});
		});

		it('should remove entry from cache on new block', function () {
			var params = {
				'height': 1
			};

			var initialResponse = null;

			return blocksEndpoint.makeRequest(params, 200).then(function (res) {
				initialResponse = res;
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(res.req.path);
					});
				}));
			}).then(function (responses) {
				responses.should.deep.include(initialResponse.body);
			}).then(function () {
				return waitForBlocksPromise(1);
			}).then(function () {
				return getJsonForKeyPromise(initialResponse.req.path);
			}).then(function (result) {
				expect(result).to.eql(null);
			});
		});
	});

	describe('GET /delegates', function () {

		var delegatesEndpoint = new swaggerEndpoint('GET /delegates');
		var params = {
			username: 'genesis_89'
		};

		it('should cache delegates when response is successful', function () {
			return delegatesEndpoint.makeRequest({}, 200).then(function (res) {
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(res.req.path);
					});
				})).then(function (responses) {
					responses.should.deep.include(res.body);
				});
			});
		});

		it('should not cache delegates when response is unsuccessful', function () {
			var params = {
				sort: 'invalidValue'
			};

			return delegatesEndpoint.makeRequest(params, 400).then(function (res) {
				return getJsonForKeyPromise(res.req.path).then(function (response) {
					expect(response).to.not.exist;
				});
			});
		});

		it('should flush cache on the next round @slow', function () {
			var params = {
				username: 'genesis_90'
			};
			var urlPath;

			return delegatesEndpoint.makeRequest(params, 200).then(function (res) {
				urlPath = res.req.path;
				// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
				return Promise.all([0, 10, 100].map(function (delay) {
					return Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(res.req.path);
					});
				})).then(function (responses) {
					responses.should.deep.include(res.body);
					return onNewRoundPromise().then(function () {
						return getJsonForKeyPromise(urlPath).then(function (result) {
							expect(result).to.not.exist;
						});
					});
				});
			});
		});
	});
});
