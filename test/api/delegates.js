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
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('when downvoting should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
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
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
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
			done();
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

describe('GET /api/delegates', function () {
	it('using no params should be ok', function (done) {
		node.get('/api/delegates', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0]).to.have.property('address');
			node.expect(res.body.delegates[0]).to.have.property('publicKey');
			node.expect(res.body.delegates[0]).to.have.property('vote');
			node.expect(res.body.delegates[0]).to.have.property('rate');
			node.expect(res.body.delegates[0]).to.have.property('productivity');
			done();
		});
	});

	it('using orderBy == "unknown:asc" should fail', function (done) {
		var orderBy = 'unknown:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Invalid sort field');
			done();
		});
	});

	it('using orderBy == "approval:asc" should be ok', function (done) {
		var orderBy = 'approval:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "productivity:asc" should be ok', function (done) {
		var orderBy = 'productivity:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "rate:asc" should be ok', function (done) {
		var orderBy = 'rate:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].rate).to.be.at.below(res.body.delegates[i + 1].rate);
				}
			}
			done();
		});
	});

	it('using orderBy == "rate:desc" should be ok', function (done) {
		var orderBy = 'rate:desc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].rate).to.be.at.above(res.body.delegates[i + 1].rate);
				}
			}
			done();
		});
	});

	it('using orderBy == "vote:asc" should be ok', function (done) {
		var orderBy = 'vote:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].vote).to.be.at.most(res.body.delegates[i + 1].vote);
				}
			}
			done();
		});
	});

	it('using orderBy == "vote:desc" should be ok', function (done) {
		var orderBy = 'vote:desc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			for (var i = 0; i < res.body.delegates.length; i++) {
				if (res.body.delegates[i + 1] != null) {
					node.expect(res.body.delegates[i].vote).to.be.at.least(res.body.delegates[i + 1].vote);
				}
			}
			done();
		});
	});

	it('using orderBy == "username:asc" should be ok', function (done) {
		var orderBy = 'username:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "address:asc" should be ok', function (done) {
		var orderBy = 'address:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using orderBy == "publicKey:asc" should be ok', function (done) {
		var orderBy = 'publicKey:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using string limit should fail', function (done) {
		var limit = 'one';
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using limit == -1 should fail', function (done) {
		var limit = -1;
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using limit == 0 should fail', function (done) {
		var limit = 0;
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 0 is less than minimum 1');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var limit = 1;
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(1);
			done();
		});
	});

	it('using limit == 101 should be ok', function (done) {
		var limit = 101;
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using limit > 101 should fail', function (done) {
		var limit = 102;
		var params = 'limit=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 102 is greater than maximum 101');
			done();
		});
	});

	it('using string offset should fail', function (done) {
		var limit = 'one';
		var params = 'offset=' + limit;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
			done();
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var offset = 1;
		var params = 'offset=' + offset;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.lengthOf(101);
			done();
		});
	});

	it('using offset == -1 should fail', function (done) {
		var offset = -1;
		var params = 'offset=' + offset;

		node.get('/api/delegates?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 0');
			done();
		});
	});
});

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

	it('using no criteria should fail', function (done) {
		node.get('/api/delegates/search', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using blank criteria should fail', function (done) {
		var q = '';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using criteria with length == 1 should be ok', function (done) {
		var q = 'g'; // 1 character

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using criteria with length == 20 should be ok', function (done) {
		var q = 'genesis_123456789012'; // 20 characters

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('using criteria with length > 20 should fail', function (done) {
		var q = 'genesis_1234567890123'; // 21 characters

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using critera == "genesis_1" should return 13 delegates', function (done) {
		var q = 'genesis_1';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(13);
			done();
		});
	});

	it('using critera == "genesis_10" should return 3 delegates', function (done) {
		var q = 'genesis_10';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(3);
			done();
		});
	});

	it('using critera == "genesis_101" should return 1 delegate', function (done) {
		var q = 'genesis_101';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('using critera == "genesis_101" should have all properties', function (done) {
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

	it('using no limit should be ok', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('using string limit should be ok', function (done) {
		var q = 'genesis_';
		var limit = 'one';

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == -100 should fail', function (done) {
		var q = 'genesis_';
		var limit = -100;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == -1 should fail', function (done) {
		var q = 'genesis_';
		var limit = -1;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == 0 should fail', function (done) {
		var q = 'genesis_';
		var limit = 0;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('using limit == 100 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 100;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('using limit > 100 should fail', function (done) {
		var q = 'genesis_';
		var limit = 101;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using orderBy == "unknown:asc" should fail', function (done) {
		var q = 'genesis_';

		node.get('/api/delegates/search?q=' + q + '&orderBy=unknown:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no orderBy should be ordered by ascending username', function (done) {
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

	it('using orderBy == "username:asc" should be ordered by ascending username', function (done) {
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

	it('using orderBy == "username:desc" should be ordered by descending username', function (done) {
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

describe('GET /api/delegates/forging/status', function () {
	it('using no params should fail', function (done) {
		node.get('/api/delegates/forging/status', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Missing required property: publicKey');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		node.get('/api/delegates/forging/status?publicKey=' + 'invalidPublicKey', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			done();
		});
	});

	it('using empty publicKey should be ok', function (done) {
		node.get('/api/delegates/forging/status?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.false;
			done();
		});
	});

	it('using disabled publicKey should be ok', function (done) {
		node.get('/api/delegates/forging/status?publicKey=' + 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.false;
			done();
		});
	});

	it('using enabled publicKey should be ok', function (done) {
		node.get('/api/delegates/forging/status?publicKey=' + '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.true;
			done();
		});
	});
});

describe('GET /api/delegates/getNextForgers', function () {

	it('using no params should be ok', function (done) {
		node.get('/api/delegates/getNextForgers', function (err, res) {
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
		node.get('/api/delegates/getNextForgers?' + 'limit=1', function (err, res) {
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
		node.get('/api/delegates/getNextForgers?' + 'limit=101', function (err, res) {
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
