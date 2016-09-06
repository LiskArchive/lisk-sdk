'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var account = node.randomAccount();
while (account.username === account.username.toUpperCase()) {
	account = node.randomAccount();
}

var account2 = node.randomAccount();
account2.username = account.username.toUpperCase();

function openAccount (params, done) {
	node.post('/accounts/open', params, function (err, res) {
		done(err, res);
	});
}

function sendLISK (params, done) {
	node.put('/transactions', params, function (err, res) {
		done(err, res);
	});
}

function putAccountsDelegates (params, done) {
	node.put('/accounts/delegates', params, function (err, res) {
		done(err, res);
	});
}

function putDelegates (params, done) {
	node.put('/delegates', params, function (err, res) {
		done(err, res);
	});
}

before(function (done) {
	openAccount({
		secret: account.password
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('account').that.is.an('object');
		account.address = res.body.account.address;
		account.publicKey = res.body.account.publicKey;
		account.balance = res.body.account.balance;
		done();
	});
});

before(function (done) {
	openAccount({
		secret: account2.password
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('account').that.is.an('object');
		account2.address = res.body.account.address;
		account2.publicKey = res.body.account.publicKey;
		account2.balance = res.body.account.balance;
		done();
	});
});

describe('PUT /accounts/delegates without funds', function () {

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

describe('PUT /delegates without funds', function () {

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

describe('PUT /accounts/delegates with funds', function () {

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: node.LISK,
			recipientId: account.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			node.expect(res.body.transactionId).to.be.above(1);
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

describe('PUT /delegates with funds', function () {

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: node.LISK,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			node.expect(res.body.transactionId).to.be.above(1);
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

	it('using blank pasphrase should fail', function (done) {
		putDelegates({
			secret: '',
			username: account.username
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid pasphrase should fail', function (done) {
		putDelegates({
			secret: [],
			username: account.username
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid username should fail', function (done) {
		putDelegates({
			secret: account.password,
			username: '~!@#$%^&*()_+.,?/'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using username longer than 20 characters should fail', function (done) {
		putDelegates({
			secret: account.password,
			username: 'ABCDEFGHIJKLMNOPQRSTU'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using blank username should fail', function (done) {
		putDelegates({
			secret: account.password,
			username: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using uppercase username: ' + account.username + 'should be registered in lowercase', function (done) {
		putDelegates({
			secret: account.password,
			username: account.username
		}, function (err, res) {
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

	it('using same account should fail', function (done) {
		putDelegates({
			secret: account.password,
			username: account.username
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using existing username but different case: ' + account2.username + ' should fail', function (done) {
		putDelegates({
			secret: account2.password,
			username: account2.username
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});

describe('GET /delegates', function () {

	it('using no parameters should be ok', function (done) {
		var limit = 10;
		var offset = 0;

		node.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=vote:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body).to.have.property('totalCount').that.is.at.least(0);
			node.expect(res.body.delegates).to.have.length.of.at.most(limit);
			var num_of_delegates = res.body.delegates.length;
			if (num_of_delegates >= 1) {
				for (var i = 0; i < num_of_delegates; i++) {
					if (res.body.delegates[i + 1] != null) {
						node.expect(res.body.delegates[i].vote).to.be.at.most(res.body.delegates[i + 1].vote);
						node.expect(res.body.delegates[i]).to.have.property('username');
						node.expect(res.body.delegates[i]).to.have.property('address');
						node.expect(res.body.delegates[i]).to.have.property('publicKey');
						node.expect(res.body.delegates[i]).to.have.property('vote');
						node.expect(res.body.delegates[i]).to.have.property('rate');
						node.expect(res.body.delegates[i]).to.have.property('productivity');
					}
				}
			} else {
				node.expect(false).to.equal(true);
			}
			done();
		});
	});

	it('using valid parameters should be ok', function (done) {
		var limit = 20;
		var offset = 10;

		node.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=rate:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body).to.have.property('totalCount').that.is.at.least(0);
			node.expect(res.body.delegates).to.have.length.of.at.most(limit);
			var num_of_delegates = res.body.delegates.length;
			if (num_of_delegates >= 1) {
				for (var i = 0; i < num_of_delegates; i++) {
					if (res.body.delegates[i + 1] != null) {
						node.expect(res.body.delegates[i].rate).to.be.at.least(res.body.delegates[i + 1].rate);
					}
				}
			} else {
				node.expect(false).to.equal(true);
			}
			done();
		});
	});

	it('using invalid parameters should be ok', function (done) {
		var limit = 'invalid';
		var offset = 'invalid';

		node.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=invalid', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});

describe('GET /accounts/delegates?address=', function () {

	it('using valid address should be ok', function (done) {
		node.get('/accounts/delegates?address=' + node.gAccount.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length.of.at.least(1);
			node.expect(res.body.delegates[0]).to.have.property('username');
			node.expect(res.body.delegates[0]).to.have.property('address');
			node.expect(res.body.delegates[0]).to.have.property('publicKey');
			node.expect(res.body.delegates[0]).to.have.property('vote');
			node.expect(res.body.delegates[0]).to.have.property('rate');
			node.expect(res.body.delegates[0]).to.have.property('productivity');
			done();
		});
	});

	it('using invalid address should fail', function (done) {
		node.get('/accounts/delegates?address=NOTaLiskAddress', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});

describe('GET /delegates/count', function () {

	it('should be ok', function (done) {
		node.get('/delegates/count', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('count').to.be.at.least(101);
			done();
		});
	});
});

describe('GET /delegates/voters', function () {

	before(function (done) {
		node.onNewBlock(function (err) {
			node.put('/accounts/delegates', {
				secret: account.password,
				delegates: ['+' + node.eAccount.publicKey]
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	it('using no publicKey should fail', function (done) {
		node.get('/delegates/voters?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success');
			if (!res.body.success) {
				node.expect(res.body).to.have.property('error');
			} else {
				node.expect(res.body).to.have.property('accounts').that.is.an('array');
				node.expect(res.body.accounts.length).to.equal(0);
			}
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		node.get('/delegates/voters?publicKey=NotAPublicKey', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid publicKey should be ok', function (done) {
		node.onNewBlock(function (err) {
			node.get('/delegates/voters?publicKey=' + node.eAccount.publicKey, function (err, res) {
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

describe('GET /delegates/search', function () {

	it('when criteria is missing should fail', function (done) {
		var q = '';

		node.get('/delegates/search', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when criteria is an empty string should fail', function (done) {
		var q = '';

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when criteria length is 1 character should be ok', function (done) {
		var q = 'g'; // 1 character

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('when criteria length is 20 characters should be ok', function (done) {
		var q = 'genesis_123456789012'; // 20 characters

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			done();
		});
	});

	it('when criteria length is greater than 20 characters should fail', function (done) {
		var q = 'genesis_1234567890123'; // 21 characters

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when critera == "genesis_1" should return 13 delegates', function (done) {
		var q = 'genesis_1';

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(13);
			done();
		});
	});

	it('when critera == "genesis_10" should return 3 delegates', function (done) {
		var q = 'genesis_10';

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(3);
			done();
		});
	});

	it('when critera == "genesis_101" should return 1 delegate', function (done) {
		var q = 'genesis_101';

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('when critera == "genesis_101" should have all properties', function (done) {
		var q = 'genesis_101';

		node.get('/delegates/search?q=' + q, function (err, res) {
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

		node.get('/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('when limit is a string should be ok', function (done) {
		var q = 'genesis_';
		var limit = 'one';

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == -100 should fail', function (done) {
		var q = 'genesis_';
		var limit = -100;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == -1 should fail', function (done) {
		var q = 'genesis_';
		var limit = -1;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == 0 should fail', function (done) {
		var q = 'genesis_';
		var limit = 0;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when limit == 1 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(1);
			done();
		});
	});

	it('when limit == 100 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 100;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(100);
			done();
		});
	});

	it('when limit > 100 should fail', function (done) {
		var q = 'genesis_';
		var limit = 101;

		node.get('/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when orderBy is invalid should fail', function (done) {
		var q = 'genesis_';

		node.get('/delegates/search?q=' + q + '&orderBy=unknown:abc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('when orderBy is missing should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		node.get('/delegates/search?q=' + q, function (err, res) {
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

		node.get('/delegates/search?q=' + q + '&orderBy=username:asc', function (err, res) {
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

		node.get('/delegates/search?q=' + q + '&orderBy=username:desc', function (err, res) {
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
