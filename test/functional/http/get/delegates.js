'use strict';

var node = require('../../../node.js');
var modulesLoader = require('../../../common/modulesLoader');
var genesisDelegates = require('../../../genesisDelegates.json');

var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var registerDelegatePromise = require('../../../common/apiHelpers').registerDelegatePromise;
var getDelegatesPromise = require('../../../common/apiHelpers').getDelegatesPromise;
var getCountPromise = require('../../../common/apiHelpers').getCountPromise;
var getDelegatesPromise = require('../../../common/apiHelpers').getDelegatesPromise;
var getForgingStatusPromise = require('../../../common/apiHelpers').getForgingStatusPromise;
var searchDelegatesPromise = require('../../../common/apiHelpers').searchDelegatesPromise;
var putForgingDelegatePromise = require('../../../common/apiHelpers').putForgingDelegatePromise;
var getForgedByAccountPromise = require('../../../common/apiHelpers').getForgedByAccountPromise;
var getNextForgersPromise = require('../../../common/apiHelpers').getNextForgersPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);
var onNewRoundPromise = node.Promise.promisify(node.onNewRound);

describe('GET /api/delegates', function () {

	var validDelegate = genesisDelegates.delegates[0];
	
	describe('from (cache)', function () {
		var cache;
		var getJsonForKeyPromise;

		before(function (done) {
			node.config.cacheEnabled = true;
			modulesLoader.initCache(function (err, __cache) {
				cache = __cache;
				getJsonForKeyPromise = node.Promise.promisify(cache.getJsonForKey);
				node.expect(err).to.not.exist;
				node.expect(__cache).to.be.an('object');
				return done(err);
			});
		});

		afterEach(function (done) {
			cache.flushDb(function (err, status) {
				node.expect(err).to.not.exist;
				node.expect(status).to.equal('OK');
				done(err);
			});
		});

		after(function (done) {
			cache.quit(done);
		});

		it('cache delegates when response is a success', function () {
			var url;
			url = '/api/delegates';
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(res);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var url, params;
			url = '/api/delegates?';
			params = [
				'orderBy=' + 'unknown:asc'
			];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Invalid sort field');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(null);
				});
			});
		});

		it('should flush cache on the next round @slow', function () {
			var url;
			url = '/api/delegates';
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				return getJsonForKeyPromise(url).then(function (response) {
					node.expect(response).to.eql(res);
					return onNewRoundPromise().then(function (res) {
						return getJsonForKeyPromise(url).then(function (result) {
							node.expect(result).to.eql(null);
						});
					});
				});
			});
		});
	});

	describe('/', function () {

		function expectValidDelegateResponse (res) {
			node.expect(res).to.have.nested.property('delegates.0.address').that.is.a('string');
			node.expect(res).to.have.nested.property('delegates.0.balance').that.is.a('string');
		}

		it('using no params should return all genesis delegates', function () {
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
				node.expect(res.delegates[0]).to.have.property('username');
				node.expect(res.delegates[0]).to.have.property('address');
				node.expect(res.delegates[0]).to.have.property('publicKey');
				node.expect(res.delegates[0]).to.have.property('vote');
				node.expect(res.delegates[0]).to.have.property('rank');
				node.expect(res.delegates[0]).to.have.property('productivity');
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should return message = "No data returned"', function () {
				var params = [
					'publicKey='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('No data returned');
				});
			});

			it('using invalid publicKey should fail', function () {
				var params = [
					'publicKey=' + 'invalidPublicKey'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format publicKey: invalidPublicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return the result', function () {
				var params = [
					'publicKey=' + validDelegate.publicKey
				];
				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.nested.property('body.delegates').to.be.an('array');
				});
			});

			it('using valid existing publicKey of genesis account should return the never voted result', function () {
				var params = [
					'publicKey=' + validDelegate.publicKey
				];
				return getDelegatesPromise(params).then(expectValidDelegateResponse);
			});

			it('using valid not existing publicKey should return message = "No data returned"', function () {

				var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';
				var params = [
					'publicKey=' + validNotExistingPublicKey
				];
				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').that.is.empty;
				});
			});
		});
		describe('orderBy', function () {

			it('using orderBy="unknown:asc" should fail', function () {
				var params = [
					'orderBy=' + 'unknown:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Invalid sort field');
				});
			});

			it('using orderBy="approval:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'approval:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using orderBy="productivity:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'productivity:asc'
				];
				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using orderBy="rank:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'rank:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
					for (var i = 0; i < res.delegates.length; i++) {
						if (res.delegates[i + 1] != null) {
							node.expect(res.delegates[i].rank).to.be.at.below(res.delegates[i + 1].rank);
						}
					}
				});
			});

			it('using orderBy="rank:desc" should be ok', function () {
				var params = [
					'orderBy=' + 'rank:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
					for (var i = 0; i < res.delegates.length; i++) {
						if (res.delegates[i + 1] != null) {
							node.expect(res.delegates[i].rank).to.be.at.above(res.delegates[i + 1].rank);
						}
					}
				});
			});

			it('using orderBy="vote:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'vote:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
					for (var i = 0; i < res.delegates.length; i++) {
						if (res.delegates[i + 1] != null) {
							node.expect(parseInt(res.delegates[i].vote)).to.be.at.most(parseInt(res.delegates[i + 1].vote));
						}
					}
				});
			});

			it('using orderBy="vote:desc" should be ok', function () {
				var params = [
					'orderBy=' + 'vote:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
					for (var i = 0; i < res.delegates.length; i++) {
						if (res.delegates[i + 1] != null) {
							node.expect(parseInt(res.delegates[i].vote)).to.be.at.least(parseInt(res.delegates[i + 1].vote));
						}
					}
				});
			});

			it('using orderBy="username:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'username:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using orderBy="address:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'address:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using orderBy="publicKey:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'publicKey:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});
		});

		describe('limit', function () {

			it('using string limit should fail', function () {
				var params = [
					'limit=' + 'one'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Expected type number but found type string');
				});
			});

			it('using limit=-1 should fail', function () {
				var params = [
					'limit=' + -1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Value -1 is less than minimum 1');
				});
			});

			it('using limit=0 should fail', function () {
				var params = [
					'limit=' + 0
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Value 0 is less than minimum 1');
				});
			});

			it('using limit=1 should be ok', function () {
				var params = [
					'limit=' + 1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(1);
				});
			});

			it('using limit=101 should be ok', function () {
				var params = [
					'limit=' + 101
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using limit > 101 should fail', function () {
				var params = [
					'limit=' + 102
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Value 102 is greater than maximum 101');
				});
			});
		});

		describe('offset', function () {

			it('using string offset should fail', function () {
				var params = [
					'offset=' + 'one'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Expected type number but found type string');
				});
			});

			it('using offset=1 should be ok', function () {
				var params = [
					'offset=' + 1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf.at.least(100);
				});
			});

			it('using offset=-1 should fail', function () {
				var params = [
					'offset=' + -1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').to.equal('Value -1 is less than minimum 0');
				});
			});

			it('using orderBy with any of sort fields should not place NULLs first', function () {
				var delegatesSortFields = ['approval', 'productivity', 'rank', 'vote'];
				delegatesSortFields.forEach(function (sortField) {
					var params = [
						'orderBy=' + sortField
					];
					return getDelegatesPromise(params).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('delegates').that.is.an('array');

						var dividedIndices = res.delegates.reduce(function (memo, peer, index) {
							memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
							return memo;
						}, { notNullIndices: [], nullIndices: [] });

						if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
							var ascOrder = function (a, b) { return a - b; };
							dividedIndices.notNullIndices.sort(ascOrder);
							dividedIndices.nullIndices.sort(ascOrder);

							node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
								.to.be.at.most(dividedIndices.nullIndices[0]);
						}
					});
				});
			});
		});
	});

	describe.skip('/search', function () {

		it('using no criteria should fail', function () {
			var params = [];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using blank criteria should fail', function () {
			var params = [
				'q='
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using wildcard criteria should be ok', function () {
			var params = [
				'q=' + '%' // 1 character
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length=1 should be ok', function () {
			var params = [
				'q=' + 'g' // 1 character
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length=20 should be ok', function () {
			var params = [
				'q=' + 'genesis_123456789012' // 20 characters
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length > 20 should fail', function () {
			var params = [
				'q=' + 'genesis_1234567890123' // 21 characters
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using critera="genesis_1" should return 13 delegates', function () {
			var params = [
				'q=' + 'genesis_1'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(13);
			});
		});

		it('using critera="genesis_10" should return 3 delegates', function () {
			var params = [
				'q=' + 'genesis_10'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(3);
			});
		});

		it('using critera="genesis_101" should return 1 delegate', function () {
			var params = [
				'q=' + 'genesis_101'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(1);
			});
		});

		it('using critera="genesis_101" should have all properties', function () {
			var params = [
				'q=' + 'genesis_101'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(1);
				node.expect(res.delegates[0]).to.have.property('rank').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('username').that.is.an('string');
				node.expect(res.delegates[0]).to.have.property('address').that.is.an('string');
				node.expect(res.delegates[0]).to.have.property('publicKey').that.is.an('string');
				node.expect(res.delegates[0]).to.have.property('vote').that.is.an('string');
				node.expect(res.delegates[0]).to.have.property('producedblocks').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('missedblocks').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('approval').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('productivity').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('voters_cnt').that.is.an('number');
				node.expect(res.delegates[0]).to.have.property('register_timestamp').that.is.an('number');
			});
		});

		it('using no limit should be ok', function () {
			var params = [
				'q=' + 'genesis_'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(101);
			});
		});

		it('using string limit should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 'one'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=-100 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + -100
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=-1 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + -1
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=0 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 0
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=1 should be ok', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 1
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(1);
			});
		});

		it('using limit=1000 should be ok', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 1000
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(101);
			});
		});

		it('using limit > 1000 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 1001
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using orderBy="unknown:asc" should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'orderBy=' + 'unknown:asc'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using no orderBy should be ordered by ascending username', function () {
			var params = [
				'q=' + 'genesis_'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(101);
				node.expect(res.delegates[0]).to.have.property('username');
				node.expect(res.delegates[0].username).to.equal('genesis_1');
				node.expect(res.delegates[24]).to.have.property('username');
				node.expect(res.delegates[24].username).to.equal('genesis_3');
			});
		});

		it('using orderBy="username:asc" should be ordered by ascending username', function () {
			var params = [
				'q=' + 'genesis_',
				'orderBy=' + 'username:asc'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(101);
				node.expect(res.delegates[0]).to.have.property('username');
				node.expect(res.delegates[0].username).to.equal('genesis_1');
				node.expect(res.delegates[24]).to.have.property('username');
				node.expect(res.delegates[24].username).to.equal('genesis_3');
			});
		});

		it('using orderBy="username:desc" should be ordered by descending username', function () {
			var params = [
				'q=' + 'genesis_',
				'orderBy=' + 'username:desc'
			];

			return searchDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(101);
				node.expect(res.delegates[0]).to.have.property('username');
				node.expect(res.delegates[0].username).to.equal('genesis_99');
				node.expect(res.delegates[24]).to.have.property('username');
				node.expect(res.delegates[24].username).to.equal('genesis_77');
			});
		});
	});

	describe('/forging/status', function () {

		it('using no params should be ok', function () {
			var params = [];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').to.be.true;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using invalid publicKey should fail', function () {
			var params = [
				'publicKey=' + 'invalidPublicKey'
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using empty publicKey should be ok', function () {
			var params = [
				'publicKey='
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').to.be.true;
				node.expect(res).to.have.property('delegates').that.is.an('array');

			});
		});

		it('using existing publicKey should be ok', function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').that.is.a('boolean');

			});
		});

		it('using enabled publicKey should be ok', function () {
			var params = [
				'publicKey=' + '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f'
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').to.be.true;

			});
		});
	});

	describe('/forging', function () {

		before(function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').to.be.a('boolean');
				if (!res.enabled) {
					var params = {
						publicKey: validDelegate.publicKey,
						key: validDelegate.key
					};
					return putForgingDelegatePromise(params).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
						node.expect(res).to.have.property('forging').equal(true);
					});
				}
			});
		});

		it('using no params should fail', function () {
			var params = {};
			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain('Missing required property: ');
			});
		});

		it('using invalid publicKey should fail', function () {
			var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
			var params = {
				publicKey: invalidPublicKey,
				key: validDelegate.key
			};
			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain(['Delegate with publicKey:', invalidPublicKey, 'not found'].join(' '));
			});
		});

		it('using invalid key should fail', function () {
			var params = {
				publicKey: validDelegate.publicKey,
				key: 'invalid key'
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain('Invalid key and public key combination');
			});
		});

		it('using valid params should be ok', function () {
			var params = {
				publicKey: validDelegate.publicKey,
				key: validDelegate.key
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
				node.expect(res).to.have.property('forging').to.be.a('boolean');
			});
		});

		it('using valid params should toggle forging status', function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				var currentStatus = res.enabled;
				var params = {
					publicKey: validDelegate.publicKey,
					key: validDelegate.key
				};

				return putForgingDelegatePromise(params).then(function (res) {
					node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
					node.expect(res).to.have.property('forging').to.not.equal(currentStatus);
				});
			});
		});
	});

	describe('/forging/getForgedByAccount', function () {

		it('using no params should fail', function () {
			var params = [];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Missing required property: generatorPublicKey');
			});
		});

		it('using valid params should be ok', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string');
				node.expect(res).to.have.property('rewards').that.is.a('string');
				node.expect(res).to.have.property('forged').that.is.a('string');
			});
		});

		it('using valid params with borders should be ok', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey,
				'start=' + 0,
				'end=' + 0
			];
			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('rewards').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('forged').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('count').that.is.a('string').and.eql('0');
			});
		});

		it('using unknown generatorPublicKey should fail', function () {
			var params = [
				'generatorPublicKey=' + node.randomAccount().publicKey
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found');
			});
		});

		it('using unknown generatorPublicKey with borders should fail', function () {
			var params = [
				'generatorPublicKey=' + node.randomAccount().publicKey,
				'start=' + 0,
				'end=' + 0
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found or is not a delegate');
			});
		});

		it('using invalid generatorPublicKey should fail', function () {
			var params = [
				'generatorPublicKey=' + 'invalidPublicKey',
				'start=' + 0,
				'end=' + 0
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using no start should be ok', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey,
				'end=' + 0
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('rewards').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('forged').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('count').that.is.a('string').and.eql('0');
			});
		});

		it('using no end should be ok', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey,
				'start=' + 0
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string');
				node.expect(res).to.have.property('rewards').that.is.a('string');
				node.expect(res).to.have.property('forged').that.is.a('string');
				node.expect(res).to.have.property('count').that.is.a('string');
			});
		});

		it('using string start should fail', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey,
				'start=' + 'one',
				'end=' + 0
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Expected type integer but found type string');
			});
		});

		it('using string end should fail', function () {
			var params = [
				'generatorPublicKey=' + testDelegate.publicKey,
				'start=' + 0,
				'end=' + 'two'
			];

			return getForgedByAccountPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Expected type integer but found type string');
			});
		});
	});

	describe('/getNextForgers', function () {

		it('using no params should be ok', function () {
			var params = [];

			return getNextForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(10);
			});
		});

		it('using limit=1 should be ok', function () {
			var params = [
				'limit=1'
			];

			return getNextForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(1);
			});
		});

		it('using limit=101 should be ok', function () {
			var params = [
				'limit=101'
			];

			return getNextForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});
	});
});
