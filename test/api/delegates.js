'use strict';

var node = require('../node.js');
var http = require('../common/httpCommunication.js');
var sendLISK = require('../common/complexTransactions.js').sendLISK;
var sendTransaction = require('../common/complexTransactions.js').sendTransaction;
var modulesLoader = require('./../common/initModule.js').modulesLoader;
var genesisDelegates = require('../genesisDelegates.json');

var testDelegate = genesisDelegates.delegates[0];

function getForgingStatus (publicKey, cb) {
	http.get('/api/delegates/forging/status?publicKey=' + publicKey, function (err, res) {
		cb(err, res.body);
	});
}

//insert one extra delegate
before(function (done) {
	var delegate = node.randomAccount();
	sendLISK({
		secret: node.gAccount.password,
		amount: node.randomLISK(),
		address: delegate.address
	}, function (err, res) {
		node.expect(err).to.be.null;
		node.onNewBlock(function () {
			var insertDelegateTrs = node.lisk.delegate.createDelegate(delegate.password, delegate.username);
			sendTransaction(insertDelegateTrs, function (err, res) {
				node.expect(err).to.be.null;
				node.onNewBlock(done);
			});
		});
	});
});


describe('GET /api/delegates (cache)', function () {
	var cache;

	before(function (done) {
		node.config.cacheEnabled = true;
		done();
	});

	before(function (done) {
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			node.expect(err).to.not.exist;
			node.expect(__cache).to.be.an('object');
			return done(err, __cache);
		});
	});

	after(function (done) {
		cache.quit(done);
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			node.expect(err).to.not.exist;
			node.expect(status).to.equal('OK');
			done(err, status);
		});
	});

	it('cache delegates when response is a success', function (done) {
		var url;
		url = '/api/delegates';

		http.get(url, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			var response = res.body;
			cache.getJsonForKey(url, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(response);
				done(err, res);
			});
		});
	});

	it('should not cache if response is not a success', function (done) {
		var url, orderBy, params;
		url = '/api/delegates?';
		orderBy = 'unknown:asc';
		params = 'orderBy=' + orderBy;

		http.get(url+ params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Invalid sort field');
			cache.getJsonForKey(url + params, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(null);
				done(err, res);
			});
		});
	});

	it('should flush cache on the next round', function (done) {
		var url;
		url = '/api/delegates';

		http.get(url, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			var response = res.body;
			cache.getJsonForKey(url, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(response);
				node.onNewRound(function (err) {
					node.expect(err).to.not.exist;
					cache.getJsonForKey(url, function (err, res) {
						node.expect(err).to.not.exist;
						node.expect(res).to.eql(null);
						done(err, res);
					});
				});
			});
		});
	});
});

describe('GET /api/delegates', function () {

	it('using no params should be ok', function (done) {
		http.get('/api/delegates', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0]).to.have.property('address');
			node.expect(res.body.delegates[0]).to.have.property('publicKey');
			node.expect(res.body.delegates[0]).to.have.property('vote');
			node.expect(res.body.delegates[0]).to.have.property('rank');
			node.expect(res.body.delegates[0]).to.have.property('productivity');
			done();
		});
	});

	it('using orderBy == "unknown:asc" should fail', function (done) {
		var orderBy = 'unknown:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Invalid sort field');
			done();
		});
	});

	it('using orderBy == "approval:asc" should be ok', function (done) {
		var orderBy = 'approval:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "productivity:asc" should be ok', function (done) {
		var orderBy = 'productivity:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "rank:asc" should be ok', function (done) {
		var orderBy = 'rank:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].rank).to.be.at.below(res.body.delegates[i + 1].rank);
				}
			}
			done();
		});
	});

	it('using orderBy == "rank:desc" should be ok', function (done) {
		var orderBy = 'rank:desc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].rank).to.be.at.above(res.body.delegates[i + 1].rank);
				}
			}
			done();
		});
	});

	it('using orderBy == "vote:asc" should be ok', function (done) {
		var orderBy = 'vote:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(parseInt(res.body.delegates[i].vote)).to.be.at.most(parseInt(res.body.delegates[i + 1].vote));
				}
			}
			done();
		});
	});

	it('using orderBy == "vote:desc" should be ok', function (done) {
		var orderBy = 'vote:desc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(parseInt(res.body.delegates[i].vote)).to.be.at.least(parseInt(res.body.delegates[i + 1].vote));
				}
			}
			done();
		});
	});

	it('using orderBy == "username:asc" should be ok', function (done) {
		var orderBy = 'username:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "address:asc" should be ok', function (done) {
		var orderBy = 'address:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "publicKey:asc" should be ok', function (done) {
		var orderBy = 'publicKey:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using string limit should fail', function (done) {
		var limit = 'one';
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using limit == -1 should fail', function (done) {
		var limit = -1;
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using limit == 0 should fail', function (done) {
		var limit = 0;
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 0 is less than minimum 1');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var limit = 1;
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(1);
			done();
		});
	});

	it('using limit == 101 should be ok', function (done) {
		var limit = 101;
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using limit > 101 should fail', function (done) {
		var limit = 102;
		var params = 'limit=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 102 is greater than maximum 101');
			done();
		});
	});

	it('using string offset should fail', function (done) {
		var limit = 'one';
		var params = 'offset=' + limit;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var offset = 1;
		var params = 'offset=' + offset;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using offset == -1 should fail', function (done) {
		var offset = -1;
		var params = 'offset=' + offset;

		http.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 0');
			done();
		});
	});

	it('using orderBy with any of sort fields should not place NULLs first', function (done) {
		var delegatesSortFields = ['approval', 'productivity', 'rank', 'vote'];
		node.async.each(delegatesSortFields, function (sortField, cb) {
			http.get('/api/delegates?orderBy=' + sortField, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');

				var dividedIndices = res.body.delegates.reduce(function (memo, peer, index) {
					memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
					return memo;
				}, {notNullIndices: [], nullIndices: []});

				if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
					var ascOrder = function (a, b) { return a - b; };
					dividedIndices.notNullIndices.sort(ascOrder);
					dividedIndices.nullIndices.sort(ascOrder);

					node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
						.to.be.at.most(dividedIndices.nullIndices[0]);
				}
				cb();
			});
		}, function () {
			done();
		});
	});
});

describe('GET /api/delegates/count', function () {

	it('should be ok', function (done) {
		http.get('/api/delegates/count', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('count').to.be.at.least(101);
			done();
		});
	});
});

describe('GET /api/delegates/voters', function () {
	var account = node.randomAccount();

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: node.LISK,
			address: account.address
		}, function (err, res) {
			if (err) {
				return done(err);
			}
			node.onNewBlock(done);
		});
	});

	before(function (done) {

		//vote
		var voteTrs = node.lisk.vote.createVote(account.password, ['+' + node.eAccount.publicKey], null);
		sendTransaction(voteTrs, function (err, res) {
			if (err) {
				return done(err);
			}
			node.onNewBlock(done);
		});

	});

	it('using no publicKey should be ok', function (done) {
		var params = 'publicKey=';

		http.get('/api/delegates/voters?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('accounts').that.is.an('array').that.is.empty;
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		var params = 'publicKey=' + 'notAPublicKey';

		http.get('/api/delegates/voters?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid publicKey should be ok', function (done) {
		var params = 'publicKey=' + node.eAccount.publicKey;

		node.onNewBlock(function (err) {
			http.get('/api/delegates/voters?' + params, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('accounts').that.is.an('array');
				var flag = 0;
				for (var i = 0; i < res.body.accounts.length; i++) {
					if (res.body.accounts[i].address === account.address) {
						flag = 1;
					}
				}
				node.expect(flag).to.equal(1);
				done();
			});
		});
	});
});

describe('GET /api/delegates/search', function () {

	it('using no criteria should fail', function (done) {
		http.get('/api/delegates/search', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using blank criteria should fail', function (done) {
		var q = '';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using wildcard criteria should be ok', function (done) {
		var q = '%'; // 1 character

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using criteria with length == 1 should be ok', function (done) {
		var q = 'g'; // 1 character

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using criteria with length == 20 should be ok', function (done) {
		var q = 'genesis_123456789012'; // 20 characters

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using criteria with length > 20 should fail', function (done) {
		var q = 'genesis_1234567890123'; // 21 characters

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using critera == "genesis_1" should return 13 delegates', function (done) {
		var q = 'genesis_1';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(13);
			done();
		});
	});

	it('using critera == "genesis_10" should return 3 delegates', function (done) {
		var q = 'genesis_10';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(3);
			done();
		});
	});

	it('using critera == "genesis_101" should return 1 delegate', function (done) {
		var q = 'genesis_101';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('using critera == "genesis_101" should have all properties', function (done) {
		var q = 'genesis_101';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			node.expect(res.body.delegates[0]).to.have.property('rank').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('username').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('address').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('publicKey').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('vote').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('producedblocks').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('missedblocks').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('approval').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('productivity').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('voters_cnt').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('register_timestamp').that.is.an('number');
			done();
		});
	});

	it('using no limit should be ok', function (done) {
		var q = 'genesis_';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			done();
		});
	});

	it('using string limit should fail', function (done) {
		var q = 'genesis_';
		var limit = 'one';

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == -100 should fail', function (done) {
		var q = 'genesis_';
		var limit = -100;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == -1 should fail', function (done) {
		var q = 'genesis_';
		var limit = -1;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == 0 should fail', function (done) {
		var q = 'genesis_';
		var limit = 0;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('using limit == 1000 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1000;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			done();
		});
	});

	it('using limit > 1000 should fail', function (done) {
		var q = 'genesis_';
		var limit = 1001;

		http.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using orderBy == "unknown:asc" should fail', function (done) {
		var q = 'genesis_';

		http.get('/api/delegates/search?q=' + q + '&orderBy=unknown:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no orderBy should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		http.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_1');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_3');
			done();
		});
	});

	it('using orderBy == "username:asc" should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		http.get('/api/delegates/search?q=' + q + '&orderBy=username:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_1');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_3');
			done();
		});
	});

	it('using orderBy == "username:desc" should be ordered by descending username', function (done) {
		var q = 'genesis_';

		http.get('/api/delegates/search?q=' + q + '&orderBy=username:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_99');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_77');
			done();
		});
	});
});

describe('GET /api/delegates/forging/status', function () {
	it('using no params should be ok', function (done) {
		http.get('/api/delegates/forging/status', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.true;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		http.get('/api/delegates/forging/status?publicKey=' + 'invalidPublicKey', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			done();
		});
	});

	it('using empty publicKey should be ok', function (done) {
		http.get('/api/delegates/forging/status?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.true;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using publicKey should be ok', function (done) {
		http.get('/api/delegates/forging/status?publicKey=' + testDelegate.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').that.is.a('boolean');
			done();
		});
	});

	it('using enabled publicKey should be ok', function (done) {
		http.get('/api/delegates/forging/status?publicKey=' + '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.true;
			done();
		});
	});
});

describe('PUT /api/delegates/forging', function () {

	before(function (done) {
		http.get('/api/delegates/forging/status?publicKey=' + testDelegate.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.a('boolean');
			if (!res.body.enabled) {
				http.put('/api/delegates/forging', {
					publicKey: testDelegate.publicKey,
					key: testDelegate.key
				}, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('publicKey').equal(testDelegate.publicKey);
					node.expect(res.body).to.have.property('forging').equal(true);
					done();
				});
			} else {
				done();
			}
		});
	});

	it('using no params should fail', function (done) {
		http.put('/api/delegates/forging', {}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Missing required property: ');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		var invalidPublicKey= '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';

		http.put('/api/delegates/forging', {
			publicKey: invalidPublicKey,
			key: testDelegate.key
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain(['Delegate with publicKey:', invalidPublicKey, 'not found'].join(' '));
			done();
		});
	});

	it('using invalid key should fail', function (done) {
		http.put('/api/delegates/forging', {
			publicKey: testDelegate.publicKey,
			key: 'invalid key'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Invalid key and public key combination');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		http.put('/api/delegates/forging', {
			key: testDelegate.key,
			publicKey: testDelegate.publicKey,
		}, function (err, res) {
			node.expect(res.body).to.have.property('publicKey').equal(testDelegate.publicKey);
			node.expect(res.body).to.have.property('forging').to.be.a('boolean');
			done();
		});
	});

	it('using valid params should toggle forging status', function (done) {
		getForgingStatus(testDelegate.publicKey, function (err, res) {
			var currentStatus = res.enabled;

			http.put('/api/delegates/forging', {
				publicKey: testDelegate.publicKey,
				key: testDelegate.key
			}, function (err, res) {
				node.expect(res.body).to.have.property('publicKey').equal(testDelegate.publicKey);
				node.expect(res.body).to.have.property('forging').to.not.equal(currentStatus);
				done();
			});
		});
	});
});

describe('GET /api/delegates/forging/getForgedByAccount', function () {

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

	it('using no params should fail', function (done) {
		http.get('/api/delegates/forging/getForgedByAccount', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Missing required property: generatorPublicKey');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		delete validParams.start;
		delete validParams.end;

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees').that.is.a('string');
			node.expect(res.body).to.have.property('rewards').that.is.a('string');
			node.expect(res.body).to.have.property('forged').that.is.a('string');
			done();
		});
	});

	it('using valid params with borders should be ok', function (done) {
		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('rewards').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('forged').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('count').that.is.a('string').and.eql('0');
			done();
		});
	});

	it('using unknown generatorPublicKey should fail', function (done) {
		validParams.generatorPublicKey = node.randomAccount().publicKey;
		delete validParams.start;
		delete validParams.end;

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found');
			done();
		});
	});

	it('using unknown generatorPublicKey with borders should fail', function (done) {
		validParams.generatorPublicKey = node.randomAccount().publicKey;

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found or is not a delegate');
			done();
		});
	});

	it('using invalid generatorPublicKey should fail', function (done) {
		validParams.generatorPublicKey = 'invalidPublicKey';

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			done();
		});
	});

	it('using no start should be ok', function (done) {
		delete validParams.start;

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('rewards').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('forged').that.is.a('string').and.eql('0');
			node.expect(res.body).to.have.property('count').that.is.a('string').and.eql('0');
			done();
		});
	});

	it('using no end should be ok', function (done) {
		delete validParams.end;

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees').that.is.a('string');
			node.expect(res.body).to.have.property('rewards').that.is.a('string');
			node.expect(res.body).to.have.property('forged').that.is.a('string');
			node.expect(res.body).to.have.property('count').that.is.a('string');
			done();
		});
	});

	it('using string start should fail', function (done) {
		validParams.start = 'one';

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Expected type integer but found type string');
			done();
		});
	});

	it('using string end should fail', function (done) {
		validParams.end = 'two';

		http.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Expected type integer but found type string');
			done();
		});
	});
});

describe('GET /api/delegates/getNextForgers', function () {

	it('using no params should be ok', function (done) {
		http.get('/api/delegates/getNextForgers', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('currentBlock').that.is.a('number');
			node.expect(res.body).to.have.property('currentBlockSlot').that.is.a('number');
			node.expect(res.body).to.have.property('currentSlot').that.is.a('number');
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(10);
			done();
		});
	});

	it('using limit === 1 should be ok', function (done) {
		http.get('/api/delegates/getNextForgers?' + 'limit=1', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('currentBlock').that.is.a('number');
			node.expect(res.body).to.have.property('currentBlockSlot').that.is.a('number');
			node.expect(res.body).to.have.property('currentSlot').that.is.a('number');
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(1);
			done();
		});
	});

	it('using limit === 101 should be ok', function (done) {
		http.get('/api/delegates/getNextForgers?' + 'limit=101', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('currentBlock').that.is.a('number');
			node.expect(res.body).to.have.property('currentBlockSlot').that.is.a('number');
			node.expect(res.body).to.have.property('currentSlot').that.is.a('number');
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});
});
