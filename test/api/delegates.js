'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

function openAccount (params, done) {
	node.post('/api/accounts/open', params, function (err, res) {
		done(err, res);
	});
}

function sendLISK (params, done) {
	node.put('/api/transactions/', params, function (err, res) {
		done(err, res);
	});
}

function putAccountsDelegates (params, done) {
	node.put('/api/accounts/delegates', params, function (err, res) {
		done(err, res);
	});
}

function putDelegates (params, done) {
	node.put('/api/delegates', params, function (err, res) {
		done(err, res);
	});
}

describe('PUT /api/accounts/delegates without funds', function () {
	var account;

	beforeEach(function (done) {
		account = node.randomAccount();
		done();
	});

	it('when upvoting should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['+' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
			done();
		});
	});

	it('when downvoting should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Failed to remove vote');
			done();
		});
	});
});

describe('PUT /api/delegates without funds', function () {
	var account;

	beforeEach(function (done) {
		account = node.randomAccount();
		done();
	});

	it('using valid parameters should fail', function (done) {
		putDelegates({
			secret: account.password,
			username: account.username
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
			done();
		});
	});
});

describe('PUT /api/accounts/delegates with funds', function () {
	var account = node.randomAccount();

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: node.LISK,
			recipientId: account.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			node.expect(res.body.transactionId).to.be.not.empty;
			node.onNewBlock(function (err) {
				done();
			});
		});
	});

	beforeEach(function (done) {
		node.onNewBlock(function (err) {
			done();
		});
	});

	it('when upvoting same delegate multiple times should fail', function (done) {
		var votedDelegate = '"+' + node.eAccount.publicKey + '","+' + node.eAccount.publicKey + '"';

		putAccountsDelegates({
			secret: account.password,
			delegates: [votedDelegate]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when downvoting same delegate multiple times should fail', function (done) {
		var votedDelegate = '"+' + node.eAccount.publicKey + '","+' + node.eAccount.publicKey + '"';

		putAccountsDelegates({
			secret: account.password,
			delegates: [votedDelegate]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when upvoting and downvoting within same request should fail', function (done) {
		var votedDelegate = '"+' + node.eAccount.publicKey + '","-' + node.eAccount.publicKey + '"';

		putAccountsDelegates({
			secret: account.password,
			delegates: [votedDelegate]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when upvoting should be ok', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['+' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction.type).to.equal(node.txTypes.VOTE);
			node.expect(res.body.transaction.amount).to.equal(0);
			node.expect(res.body.transaction.senderPublicKey).to.equal(account.publicKey);
			node.expect(res.body.transaction.fee).to.equal(node.fees.voteFee);
			done();
		});
	});

	it('when upvoting again from same account should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['+' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error.toLowerCase()).to.contain('already voted');
			done();
		});
	});

	it('when downvoting should be ok', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction.type).to.equal(node.txTypes.VOTE);
			node.expect(res.body.transaction.amount).to.equal(0);
			node.expect(res.body.transaction.senderPublicKey).to.equal(account.publicKey);
			node.expect(res.body.transaction.fee).to.equal(node.fees.voteFee);
			done();
		});
	});

	it('when downvoting again from same account should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error.toLowerCase()).to.contain('not voted');
			done();
		});
	});

	it('when upvoting using a blank pasphrase should fail', function (done) {
		putAccountsDelegates({
			secret: '',
			delegates: ['+' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when downvoting using a blank pasphrase should fail', function (done) {
		putAccountsDelegates({
			secret: '',
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when upvoting without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['+']
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when downvoting without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-']
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});

describe('PUT /api/delegates with funds', function () {
	var account, validParams;

	beforeEach(function (done) {
		account = node.randomAccount();
		validParams = {
			secret: account.password,
			username: account.username
		};
		done();
	});

	beforeEach(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: node.LISK,
			recipientId: account.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			node.expect(res.body.transactionId).to.be.not.empty;
			node.onNewBlock(function (err) {
				done();
			});
		});
	});

	it('using blank pasphrase should fail', function (done) {
		validParams.secret = '';

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid pasphrase should fail', function (done) {
		validParams.secret = [];

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid username should fail', function (done) {
		validParams.username = '~!@#$%^&*()_+.,?/';

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using username longer than 20 characters should fail', function (done) {
		validParams.username = 'ABCDEFGHIJKLMNOPQRSTU';

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using blank username should fail', function (done) {
		validParams.username = '';

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using uppercase username should be registered in lowercase', function (done) {
		validParams.username = account.username.toUpperCase();

		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction.fee).to.equal(node.fees.delegateRegistrationFee);
			node.expect(res.body.transaction).to.have.property('asset').that.is.an('object');
			node.expect(res.body.transaction.asset.delegate.username).to.equal(account.username.toLowerCase());
			node.expect(res.body.transaction.asset.delegate.publicKey).to.equal(account.publicKey);
			node.expect(res.body.transaction.type).to.equal(node.txTypes.DELEGATE);
			node.expect(res.body.transaction.amount).to.equal(0);
			done();
		});
	});

	it('using same account twice should fail', function (done) {
		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');

			node.onNewBlock(function (err) {
				putDelegates(validParams, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error');
					done();
				});
			});
		});
	});

	it('using existing username but different case should fail', function (done) {
		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');

			node.onNewBlock(function (err) {
				validParams.username = validParams.username.toUpperCase();
				putDelegates(validParams, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error');
					done();
				});
			});
		});
	});
});

describe('GET /api/delegates');

describe('GET /api/delegates/count', function () {

	it('should be ok', function (done) {
		node.get('/api/delegates/count', function (err, res) {
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
			recipientId: account.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			node.expect(res.body.transactionId).to.be.not.empty;
			node.onNewBlock(function (err) {
				done();
			});
		});
	});

	before(function (done) {
		node.put('/api/accounts/delegates', {
			secret: account.password,
			delegates: ['+' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				done();
			});
		});
	});

	it('using no publicKey should be ok', function (done) {
		var params = 'publicKey=';

		node.get('/api/delegates/voters?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('accounts').that.is.an('array').that.is.empty;
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		var params = 'publicKey=' + 'notAPublicKey';

		node.get('/api/delegates/voters?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid publicKey should be ok', function (done) {
		var params = 'publicKey=' + node.eAccount.publicKey;

		node.onNewBlock(function (err) {
			node.get('/api/delegates/voters?' + params, function (err, res) {
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

	it('when criteria is missing should fail', function (done) {
		var q = '';

		node.get('/api/delegates/search', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when criteria is an empty string should fail', function (done) {
		var q = '';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when criteria length is 1 character should be ok', function (done) {
		var q = 'g'; // 1 character

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('when criteria length is 20 characters should be ok', function (done) {
		var q = 'genesis_123456789012'; // 20 characters

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('when criteria length is greater than 20 characters should fail', function (done) {
		var q = 'genesis_1234567890123'; // 21 characters

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when critera == "genesis_1" should return 13 delegates', function (done) {
		var q = 'genesis_1';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(13);
			done();
		});
	});

	it('when critera == "genesis_10" should return 3 delegates', function (done) {
		var q = 'genesis_10';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(3);
			done();
		});
	});

	it('when critera == "genesis_101" should return 1 delegate', function (done) {
		var q = 'genesis_101';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('when critera == "genesis_101" should have all properties', function (done) {
		var q = 'genesis_101';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			node.expect(res.body.delegates[0]).to.have.property('username').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('address').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('publicKey').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('vote').that.is.an('string');
			node.expect(res.body.delegates[0]).to.have.property('producedblocks').that.is.an('number');
			node.expect(res.body.delegates[0]).to.have.property('missedblocks').that.is.an('number');
			done();
		});
	});

	it('when limit is missing should be ok', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('when limit is a string should be ok', function (done) {
		var q = 'genesis_';
		var limit = 'one';

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == -100 should fail', function (done) {
		var q = 'genesis_';
		var limit = -100;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == -1 should fail', function (done) {
		var q = 'genesis_';
		var limit = -1;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == 0 should fail', function (done) {
		var q = 'genesis_';
		var limit = 0;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == 1 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('when limit == 100 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 100;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('when limit > 100 should fail', function (done) {
		var q = 'genesis_';
		var limit = 101;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when orderBy == "unknown:asc" should fail', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q + '&orderBy=unknown:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when orderBy is missing should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_1');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_3');
			done();
		});
	});

	it('when orderBy == "username:asc" should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q + '&orderBy=username:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_1');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_3');
			done();
		});
	});

	it('when orderBy == "username:desc" should be ordered by descending username', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q + '&orderBy=username:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0].username).to.equal('genesis_99');
			node.expect(res.body.delegates[24]).to.have.property('username');
			node.expect(res.body.delegates[24].username).to.equal('genesis_77');
			done();
		});
	});
});
