'use strict';

var node = require('../../../node.js');
var modulesLoader = require('../../../common/modulesLoader');
var genesisDelegates = require('../../../genesisDelegates.json');

var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var registerDelegatePromise = require('../../../common/apiHelpers').registerDelegatePromise;
var getDelegatesPromise = require('../../../common/apiHelpers').getDelegatesPromise;
var getCountPromise = require('../../../common/apiHelpers').getCountPromise;
var getVotersPromise = require('../../../common/apiHelpers').getVotersPromise;
var getForgingStatusPromise = require('../../../common/apiHelpers').getForgingStatusPromise;
var searchDelegatesPromise = require('../../../common/apiHelpers').searchDelegatesPromise;
var putForgingDelegatePromise = require('../../../common/apiHelpers').putForgingDelegatePromise;
var getForgedByAccountPromise = require('../../../common/apiHelpers').getForgedByAccountPromise;
var getNextForgersPromise = require('../../../common/apiHelpers').getNextForgersPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);
var onNewRoundPromise = node.Promise.promisify(node.onNewRound);

describe('GET /api/delegates', function () {

	var testDelegate = genesisDelegates.delegates[0];
	var delegate = node.randomAccount();

	// Crediting account and registering as delegate
	before(function () {
		var promises = [];
		promises.push(creditAccountPromise(delegate.address, 100000000000));

		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
			});
			return onNewBlockPromise();
		}).then(function (res) {
			return registerDelegatePromise(delegate).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
				return onNewBlockPromise();
			});
		});
	});

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

			return getDelegatesPromise(null).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				return getJsonForKeyPromise(url).then(function (response) {
					node.expect(response).to.eql(res);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var url, orderBy, params;
			url = '/api/delegates?';
			params = [
				'orderBy=' + 'unknown:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
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

			return getDelegatesPromise(null).then(function (res) {
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

		it('using no params should be ok', function () {
			return getDelegatesPromise(null).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
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

		it('using orderBy="unknown:asc" should fail', function () {
			var params = [
				'orderBy=' + 'unknown:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Invalid sort field');
			});
		});

		it('using orderBy="approval:asc" should be ok', function () {
			var params = [
				'orderBy=' + 'approval:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using orderBy="productivity:asc" should be ok', function () {
			var params = [
				'orderBy=' + 'productivity:asc'
			];
			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using orderBy="rank:asc" should be ok', function () {
			var params = [
				'orderBy=' + 'rank:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
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

			return getDelegatesPromise(params.join('&')).then(function (res) {
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

			return getDelegatesPromise(params.join('&')).then(function (res) {
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

			return getDelegatesPromise(params.join('&')).then(function (res) {
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

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using orderBy="address:asc" should be ok', function () {
			var params = [
				'orderBy=' + 'address:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using orderBy="publicKey:asc" should be ok', function () {
			var params = [
				'orderBy=' + 'publicKey:asc'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using string limit should fail', function () {
			var params = [
				'limit=' + 'one'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Expected type integer but found type string');
			});
		});

		it('using limit=-1 should fail', function () {
			var params = [
				'limit=' + -1
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			});
		});

		it('using limit=0 should fail', function () {
			var params = [
				'limit=' + 0
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Value 0 is less than minimum 1');
			});
		});

		it('using limit=1 should be ok', function () {
			var params = [
				'limit=' + 1
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(1);
			});
		});

		it('using limit=101 should be ok', function () {
			var params = [
				'limit=' + 101
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using limit > 101 should fail', function () {
			var params = [
				'limit=' + 102
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Value 102 is greater than maximum 101');
			});
		});

		it('using string offset should fail', function () {
			var params = [
				'offset=' + 'one'
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Expected type integer but found type string');
			});
		});

		it('using offset=1 should be ok', function () {
			var params = [
				'offset=' + 1
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});

		it('using offset=-1 should fail', function () {
			var params = [
				'offset=' + -1
			];

			return getDelegatesPromise(params.join('&')).then(function (res) {
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
				return getDelegatesPromise(params.join('&')).then(function (res) {
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

	describe('/count', function () {

		it('should be ok', function () {
			return getCountPromise('delegates').then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('count').to.be.at.least(101);

			});
		});
	});

	describe('/voters', function () {

		var account = node.randomAccount();

		// Crediting account and vote delegate
		before(function () {
			var promises = [];
			promises.push(creditAccountPromise(account.address, 100000000000));

			return node.Promise.all(promises).then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').that.is.not.empty;
				});
				return onNewBlockPromise();
			}).then(function (res) {
				var transaction = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], null);
				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').that.is.not.empty;
					return onNewBlockPromise();
				});
			});
		});

		it('using no publicKey should be ok', function () {
			var params = [
				'publicKey='
			];

			return getVotersPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('accounts').that.is.an('array').that.is.empty;
			});
		});

		it('using invalid publicKey should fail', function () {
			var params = [
				'publicKey=' + 'notAPublicKey'
			];

			return getVotersPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using valid publicKey should be ok', function () {
			var params = [
				'publicKey=' + node.eAccount.publicKey
			];

			return onNewBlockPromise().then(function (res) {
				return getVotersPromise(params.join('&')).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('accounts').that.is.an('array');
					var flag = 0;
					for (var i = 0; i < res.accounts.length; i++) {
						if (res.accounts[i].address === account.address) {
							flag = 1;
						}
					}
					node.expect(flag).to.equal(1);
				});
			});
		});
	});

	describe('/search', function () {

		it('using no criteria should fail', function () {
			return searchDelegatesPromise(null).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using blank criteria should fail', function () {
			return searchDelegatesPromise('q=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using wildcard criteria should be ok', function () {
			var q = '%'; // 1 character

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length=1 should be ok', function () {
			var q = 'g'; // 1 character

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length=20 should be ok', function () {
			var q = 'genesis_123456789012'; // 20 characters

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using criteria with length > 20 should fail', function () {
			var q = 'genesis_1234567890123'; // 21 characters

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using critera="genesis_1" should return 13 delegates', function () {
			var q = 'genesis_1';

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(13);
			});
		});

		it('using critera="genesis_10" should return 3 delegates', function () {
			var q = 'genesis_10';

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(3);
			});
		});

		it('using critera="genesis_101" should return 1 delegate', function () {
			var q = 'genesis_101';

			return searchDelegatesPromise('q=' + q).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.length(1);
			});
		});

		it('using critera="genesis_101" should have all properties', function () {
			var q = 'genesis_101';

			return searchDelegatesPromise('q=' + q).then(function (res) {
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
			var q = 'genesis_';

			return searchDelegatesPromise('q=' + q).then(function (res) {
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

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=-100 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + -100
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=-1 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + -1
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=0 should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 0
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit=1 should be ok', function () {
			var params = [
				'q=' + 'genesis_',
				'limit=' + 1
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
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

			return searchDelegatesPromise(params.join('&')).then(function (res) {
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

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using orderBy="unknown:asc" should fail', function () {
			var params = [
				'q=' + 'genesis_',
				'orderBy=' + 'unknown:asc'
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using no orderBy should be ordered by ascending username', function () {
			var params = [
				'q=' + 'genesis_'
			];

			return searchDelegatesPromise(params.join('&')).then(function (res) {
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

			return searchDelegatesPromise(params.join('&')).then(function (res) {
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

			return searchDelegatesPromise(params.join('&')).then(function (res) {
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
			return getForgingStatusPromise(null).then(function (res) {
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
				'publicKey=' + testDelegate.publicKey
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
				'publicKey=' + testDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('enabled').to.be.a('boolean');
				if (!res.enabled) {
					var params = {
						publicKey: testDelegate.publicKey,
						key: testDelegate.key
					};
					return putForgingDelegatePromise(params).then(function (res) {
						node.expect(res).to.have.property('success').to.be.ok;
						node.expect(res).to.have.property('publicKey').equal(testDelegate.publicKey);
						node.expect(res).to.have.property('forging').equal(true);
					});
				}
			});
		});

		it('using no params should fail', function () {
			return putForgingDelegatePromise({}).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain('Missing required property: ');
			});
		});

		it('using invalid publicKey should fail', function () {
			var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
			var params = {
				publicKey: invalidPublicKey,
				key: testDelegate.key
			};
			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain(['Delegate with publicKey:', invalidPublicKey, 'not found'].join(' '));
			});
		});

		it('using invalid key should fail', function () {
			var params = {
				publicKey: testDelegate.publicKey,
				key: 'invalid key'
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('error').to.be.a('string').and.to.contain('Invalid key and public key combination');
			});
		});

		it('using valid params should be ok', function () {
			var params = {
				publicKey: testDelegate.publicKey,
				key: testDelegate.key
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('publicKey').equal(testDelegate.publicKey);
				node.expect(res).to.have.property('forging').to.be.a('boolean');
			});
		});

		it('using valid params should toggle forging status', function () {
			var params = [
				'publicKey=' + testDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				var currentStatus = res.enabled;
				var params = {
					publicKey: testDelegate.publicKey,
					key: testDelegate.key
				};

				return putForgingDelegatePromise(params).then(function (res) {
					node.expect(res).to.have.property('publicKey').equal(testDelegate.publicKey);
					node.expect(res).to.have.property('forging').to.not.equal(currentStatus);
				});
			});
		});
	});

	describe('/forging/getForgedByAccount', function () {

		var validParams;

		beforeEach(function () {
			validParams = {
				generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				start: 0,
				end: 0
			};
		});

		function buildParams () {
			return [
				'generatorPublicKey=' + validParams.generatorPublicKey,
				validParams.start !== undefined ? 'start=' + validParams.start : '',
				validParams.end !== undefined ? 'end=' + validParams.end : '',
			].filter(Boolean).join('&');
		}

		it('using no params should fail', function () {
			return getForgedByAccountPromise(null).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Missing required property: generatorPublicKey');
			});
		});

		it('using valid params should be ok', function () {
			delete validParams.start;
			delete validParams.end;

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string');
				node.expect(res).to.have.property('rewards').that.is.a('string');
				node.expect(res).to.have.property('forged').that.is.a('string');
			});
		});

		it('using valid params with borders should be ok', function () {
			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('rewards').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('forged').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('count').that.is.a('string').and.eql('0');
			});
		});

		it('using unknown generatorPublicKey should fail', function () {
			validParams.generatorPublicKey = node.randomAccount().publicKey;
			delete validParams.start;
			delete validParams.end;

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found');
			});
		});

		it('using unknown generatorPublicKey with borders should fail', function () {
			validParams.generatorPublicKey = node.randomAccount().publicKey;

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found or is not a delegate');
			});
		});

		it('using invalid generatorPublicKey should fail', function () {
			validParams.generatorPublicKey = 'invalidPublicKey';

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using no start should be ok', function () {
			delete validParams.start;

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('rewards').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('forged').that.is.a('string').and.eql('0');
				node.expect(res).to.have.property('count').that.is.a('string').and.eql('0');
			});
		});

		it('using no end should be ok', function () {
			delete validParams.end;

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('fees').that.is.a('string');
				node.expect(res).to.have.property('rewards').that.is.a('string');
				node.expect(res).to.have.property('forged').that.is.a('string');
				node.expect(res).to.have.property('count').that.is.a('string');
			});
		});

		it('using string start should fail', function () {
			validParams.start = 'one';

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Expected type integer but found type string');
			});
		});

		it('using string end should fail', function () {
			validParams.end = 'two';

			return getForgedByAccountPromise(buildParams()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Expected type integer but found type string');
			});
		});
	});

	describe('/getNextForgers', function () {

		it('using no params should be ok', function () {
			return getNextForgersPromise(null).then(function (res) {
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

			return getNextForgersPromise(params.join('&')).then(function (res) {
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

			return getNextForgersPromise(params.join('&')).then(function (res) {
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