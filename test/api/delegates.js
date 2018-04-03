'use strict';

var node = require('./../node.js');
var modulesLoader = require('./../common/initModule.js').modulesLoader;
var stripTransactionsResults = require('./../common/helpers.js').stripTransactionsResults;
var genesisDelegates = require('../genesisDelegates.json');

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

var account;
var validParams;

function enrichRandomAccount (cb) {
	account = node.randomAccount();
	validParams = {
		secret: account.password,
		username: account.username
	};
	sendLISK({
		secret: node.gAccount.password,
		amount: node.LISK,
		recipientId: account.address
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactionId');
		node.expect(res.body.transactionId).to.be.not.empty;
		node.onNewBlock(cb);
	});
}

describe('PUT /api/accounts/delegates without funds', function () {

	beforeEach(function () {
		account = node.randomAccount();
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

	beforeEach(function () {
		account = node.randomAccount();
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

	before(enrichRandomAccount);

	beforeEach(node.onNewBlock);

	it('when upvoting same delegate multiple times should fail', function (done) {
		var votedDelegate = Array.apply(null, Array(2)).map(function () { return '+' + node.eAccount.publicKey;});

		putAccountsDelegates({
			secret: account.password,
			delegates: votedDelegate
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.include('Failed to validate vote schema:');
			done();
		});
	});

	it('when downvoting same delegate multiple times should fail', function (done) {
		var votedDelegate = Array.apply(null, Array(2)).map(function () { return '-' + node.eAccount.publicKey;});

		putAccountsDelegates({
			secret: account.password,
			delegates: votedDelegate
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.include('Failed to validate vote schema:');
			done();
		});
	});

	it('when upvoting and downvoting within same request should fail', function (done) {
		var votedDelegate = ['-' + node.eAccount.publicKey, '+' + node.eAccount.publicKey];

		putAccountsDelegates({
			secret: account.password,
			delegates: votedDelegate
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body).to.have.property('error').to.equal('Multiple votes for same delegate are not allowed');
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
			node.expect(res.body).to.have.property('error').to.include('String is too short ');
			done();
		});
	});

	it('when downvoting using a blank pasphrase should fail', function (done) {
		putAccountsDelegates({
			secret: '',
			delegates: ['-' + node.eAccount.publicKey]
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.include('String is too short ');
			done();
		});
	});

	it('when upvoting without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['+']
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.include('Invalid vote format');
			done();
		});
	});

	it('when downvoting without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ['-']
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.include('Invalid vote format');
			done();
		});
	});

	it('without any delegates should fail', function (done) {
		putAccountsDelegates({
			secret: account.password,
			delegates: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Failed to validate vote schema: Expected type array but found type string');
			done();
		});
	});
});

describe('PUT /api/delegates with funds', function () {

	beforeEach(enrichRandomAccount);

	it('using valid params should be ok', function (done) {
		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
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

	it('using same account twice in two different blocks should fail', function (done) {
		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');

			node.onNewBlock(function () {
				putDelegates(validParams, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error').equal('Account is already a delegate');
					done();
				});
			});
		});
	});

	it('using existing username but different case should fail', function (done) {
		putDelegates(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');

			node.onNewBlock(function () {
				validParams.username = validParams.username.toUpperCase();
				putDelegates(validParams, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error').equal('Account is already a delegate');
					done();
				});
			});
		});
	});

	describe('multisigAccountPublicKey', function (done) {

		it('using null should be ok', function (done) {
			validParams.multisigAccountPublicKey = null;

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using undefined should be ok', function (done) {
			validParams.multisigAccountPublicKey = undefined;

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using integer should fail', function (done) {
			validParams.multisigAccountPublicKey = 1;

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty array should fail', function (done) {
			validParams.multisigAccountPublicKey = [];

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty object should fail', function (done) {
			validParams.multisigAccountPublicKey = {};

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using object should fail', function (done) {
			validParams.multisigAccountPublicKey = new Buffer.from('dummy');

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});

		it('using empty string should be ok', function (done) {
			validParams.multisigAccountPublicKey = '';

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').to.not.be.empty;
				done();
			});
		});

		it('using valid public key should fail', function (done) {
			validParams.multisigAccountPublicKey = node.randomAccount().publicKey;

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error').to.equal('Multisig request is not allowed');
				done();
			});
		});
	});
});

describe('PUT /api/delegates double registration', function () {

	var strippedResults;
	var firstTransactionId;
	var secondTransactionId;

	var sendTwice = function (sendSecond, cb) {
		node.async.series({
			first: function (cb) {
				return putDelegates(validParams, cb);
			},
			second: sendSecond
		}, function (err, res) {
			node.expect(res).to.have.deep.property('first.body.success').to.be.true;
			node.expect(res).to.have.deep.property('second.body.success').to.be.true;
			firstTransactionId = res.first.body.transaction.id;
			secondTransactionId = res.second.body.transaction.id;
			cb();
		});
	};

	var getConfirmations = function (cb) {
		return function () {
			node.onNewBlock(function () {
				node.async.series([
					function (cb) {
						return node.get('/api/transactions/get?id=' + firstTransactionId, cb);
					},
					function (cb) {
						return node.get('/api/transactions/get?id=' + secondTransactionId, cb);
					}
				], function (err, results) {
					strippedResults = stripTransactionsResults(results);
					cb();
				});
			});
		};
	};

	describe('using same account', function () {

		describe('using same username', function () {

			describe('with the same id', function () {

				var firstResponse;
				var secondResponse;

				before(enrichRandomAccount);

				before(function (done) {
					node.async.series({
						first: function (cb) {
							return putDelegates(validParams, cb);
						},
						second: function (cb) {
							return putDelegates(validParams, cb);
						}
					}, function (err, res) {
						if (err) {
							return done(err);
						}
						firstResponse = res.first.body;
						secondResponse = res.second.body;
						done();
					});
				});

				it('first transaction should be ok', function () {
					node.expect(firstResponse).to.have.property('transaction');
				});

				it('second transaction should fail', function () {
					node.expect(secondResponse).to.have.property('error').equal('Transaction is already processed: ' + firstResponse.transaction.id);
				});
			});

			describe('with different timestamp', function () {

				before(enrichRandomAccount);

				before(function (done) {
					sendTwice(function (cb) {
						setTimeout(function () {
							return putDelegates(validParams, cb);
						}, 1001);
					}, getConfirmations(done));
				});

				it('should not confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(false);
					node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
				});

				it('should confirm one transaction', function () {
					node.expect(strippedResults.successFields).to.contain(true);
					node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
					node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
				});
			});
		});

		describe('with different usernames', function () {

			var differentUsernameParams;

			before(enrichRandomAccount);

			before(function (done) {
				differentUsernameParams = {
					secret: account.password,
					username: node.randomUsername()
				};
				sendTwice(function (cb) {
					return putDelegates(differentUsernameParams, cb);
				}, getConfirmations(done));
			});

			it('should not confirm one transaction', function () {
				node.expect(strippedResults.successFields).to.contain(false);
				node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
			});

			it('should confirm one transaction', function () {
				node.expect(strippedResults.successFields).to.contain(true);
				node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});
	});

	describe('using two different accounts', function () {

		var secondAccount;
		var secondAccountValidParams;

		var enrichSecondRandomAccount = function (cb) {
			secondAccount = node.randomAccount();
			secondAccountValidParams = {
				secret: secondAccount.password,
				username: secondAccount.username
			};
			sendLISK({
				secret: node.gAccount.password,
				amount: node.LISK,
				recipientId: secondAccount.address
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactionId');
				node.expect(res.body.transactionId).to.be.not.empty;
				cb();
			});
		};

		before(function (done) {
			enrichSecondRandomAccount(function () {
				enrichRandomAccount(done);
			});
		});

		describe('using same username', function () {

			before(function (done) {
				secondAccountValidParams.username = validParams.username;
				sendTwice(function (cb) {
					return putDelegates(secondAccountValidParams, cb);
				}, getConfirmations(done));
			});

			it('should not confirm one transaction', function () {
				node.expect(strippedResults.successFields).to.contain(false);
				node.expect(strippedResults.errorFields).to.have.lengthOf(1).and.to.contain('Transaction not found');
			});

			it('should confirm one transaction', function () {
				node.expect(strippedResults.successFields).to.contain(true);
				node.expect(strippedResults.transactionsIds).to.have.lengthOf(1);
				node.expect([firstTransactionId, secondTransactionId]).and.to.contain(strippedResults.transactionsIds[0]);
			});
		});

		describe('using different usernames', function () {

			var firstConfirmedTransaction;
			var secondConfirmedTransaction;

			before(function (done) {
				enrichSecondRandomAccount(function () {
					enrichRandomAccount(done);
				});
			});

			before(function (done) {
				sendTwice(function (cb) {
					return putDelegates(secondAccountValidParams, cb);
				}, function () {
					node.onNewBlock(function () {
						node.async.series({
							firstConfirmedTransaction: function (cb) {
								return node.get('/api/transactions/get?id=' + firstTransactionId, cb);
							},
							secondConfirmedTransaction: function (cb) {
								return node.get('/api/transactions/get?id=' + secondTransactionId, cb);
							}
						}, function (err, res) {
							firstConfirmedTransaction = res.firstConfirmedTransaction.body;
							secondConfirmedTransaction = res.secondConfirmedTransaction.body;
							done();
						});
					});
				});
			});

			it('should successfully confirm both transactions', function () {
				node.expect(firstConfirmedTransaction).to.have.deep.property('success').to.be.true;
				node.expect(firstConfirmedTransaction).to.have.deep.property('transaction.id').to.be.equal(firstTransactionId);
				node.expect(secondConfirmedTransaction).to.have.deep.property('success').to.be.true;
				node.expect(secondConfirmedTransaction).to.have.deep.property('transaction.id').to.be.equal(secondTransactionId);
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

		node.get(url, function (err, res) {
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

		node.get(url+ params, function (err, res) {
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

		node.get(url, function (err, res) {
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
		node.get('/api/delegates', function (err, res) {
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

	it('using orderBy == "rank:asc" should be ok', function (done) {
		var orderBy = 'rank:asc';
		var params = 'orderBy=' + orderBy;

		node.get('/api/delegates?' + params, function (err, res) {
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

		node.get('/api/delegates?' + params, function (err, res) {
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

	it('using orderBy with any of sort fields should not place NULLs first', function (done) {
		var delegatesSortFields = ['approval', 'productivity', 'rank', 'vote'];
		node.async.each(delegatesSortFields, function (sortField, cb) {
			node.get('/api/delegates?orderBy=' + sortField, function (err, res) {
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

	it('using wildcard criteria should be ok', function (done) {
		var q = '%'; // 1 character

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
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

		node.get('/api/delegates/search?q=' + q, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			done();
		});
	});

	it('using string limit should fail', function (done) {
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

	it('using limit == 1000 should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1000;

		node.get('/api/delegates/search?q=' + q + '&limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			node.expect(res.body.delegates).to.have.length(101);
			done();
		});
	});

	it('using limit > 1000 should fail', function (done) {
		var q = 'genesis_';
		var limit = 1001;

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

		node.get('/api/delegates/search?q=' + q + '&orderBy=username:asc', function (err, res) {
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

		node.get('/api/delegates/search?q=' + q + '&orderBy=username:desc', function (err, res) {
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
		node.get('/api/delegates/forging/status', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.true;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
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
			node.expect(res.body).to.have.property('enabled').to.be.true;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
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

describe('POST /api/delegates/forging/disable', function () {
	var testDelegate = genesisDelegates.delegates[0];

	before(function (done) {
		node.get('/api/delegates/forging/status?publicKey=' + testDelegate.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.a('boolean');
			if (!res.body.enabled) {
				node.post('/api/delegates/forging/enable', {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				}, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('address').equal(testDelegate.address);
					done();
				});
			}
			done();
		});
	});

	it('using no params should fail', function (done) {
		node.post('/api/delegates/forging/disable', {}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Missing required property: secret');
			done();
		});
	});

	it('using invalid secret should fail', function (done) {
		node.post('/api/delegates/forging/disable', {
			publicKey: testDelegate.publicKey,
			secret: 'invalid secret'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Invalid passphrase');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		node.post('/api/delegates/forging/disable', {
			publicKey: testDelegate.publicKey,
			secret: testDelegate.secret
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('address').equal(testDelegate.address);
			done();
		});
	});
});

describe('POST /api/delegates/forging/enable', function () {
	var testDelegate = genesisDelegates.delegates[0];

	before(function (done) {
		node.get('/api/delegates/forging/status?publicKey=' + testDelegate.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('enabled').to.be.a('boolean');
			if (res.body.enabled) {
				node.post('/api/delegates/forging/disable', {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				}, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('address').equal(testDelegate.address);
					done();
				});
			}
			done();
		});
	});

	it('using no params should fail', function (done) {
		node.post('/api/delegates/forging/enable', {}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Missing required property: secret');
			done();
		});
	});

	it('using invalid secret should fail', function (done) {
		node.post('/api/delegates/forging/enable', {
			publicKey: testDelegate.publicKey,
			secret: 'invalid secret'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').not.to.be.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string').and.to.contain('Invalid passphrase');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		node.post('/api/delegates/forging/enable', {
			publicKey: testDelegate.publicKey,
			secret: testDelegate.secret
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('address').equal(testDelegate.address);
			done();
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
		node.get('/api/delegates/forging/getForgedByAccount', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Missing required property: generatorPublicKey');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		delete validParams.start;
		delete validParams.end;

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees').that.is.a('string');
			node.expect(res.body).to.have.property('rewards').that.is.a('string');
			node.expect(res.body).to.have.property('forged').that.is.a('string');
			done();
		});
	});

	it('using valid params with borders should be ok', function (done) {
		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
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

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found');
			done();
		});
	});

	it('using unknown generatorPublicKey with borders should fail', function (done) {
		validParams.generatorPublicKey = node.randomAccount().publicKey;

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found or is not a delegate');
			done();
		});
	});

	it('using invalid generatorPublicKey should fail', function (done) {
		validParams.generatorPublicKey = 'invalidPublicKey';

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			done();
		});
	});

	it('using no start should be ok', function (done) {
		delete validParams.start;

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
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

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
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

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Expected type integer but found type string');
			done();
		});
	});

	it('using string end should fail', function (done) {
		validParams.end = 'two';

		node.get('/api/delegates/forging/getForgedByAccount?' + buildParams(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Expected type integer but found type string');
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
