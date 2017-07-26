'use strict';

var async = require('async');
var node = require('../../node.js');
var http = require('../../common/httpCommunication.js');
var ws = require('../../common/wsCommunication.js');

var account = node.randomAccount();

var delegate;
var delegates = [];
var votedDelegates = [];

function getDelegates (done) {
	http.get('/api/delegates', function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('delegates').that.is.an('array');
		return done(err, res);
	});
}

function getVotes (address, done) {
	http.get('/api/accounts/delegates/?address=' + address, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('delegates').that.is.an('array');
		return done(err, res);
	});
}

function postVotes (params, done) {
	var count = 0;
	var blocksToWait = Math.ceil(params.delegates.length / node.constants.maxTxsPerBlock);

	node.async.eachSeries(params.delegates, function (delegate, eachCb) {
		var transaction = node.lisk.vote.createVote(params.passphrase, [params.action + delegate]);

		postVote(transaction, function (err, res) {
			params.voteCb(err, res);
			return eachCb();
		});
	}, function (err) {
		node.waitForBlocks(blocksToWait, function (err) {
			return done(err);
		});
	});
}

function postVote (transaction, done) {
	ws.call('postTransactions', { transaction: transaction }, done, true);
}

function sendLISK (params, done) {
	http.put('/api/transactions', params, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			return done(err, res);
		});
	});
}

function registerDelegate (account, done) {
	account.username = node.randomDelegateName().toLowerCase();
	var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

	ws.call('postTransactions', { transaction: transaction }, function (err, res) {
		node.expect(res).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			return done(err, res);
		});
	}, true);
}

describe('postTransactions', function () {

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: 100000000000,
			recipientId: account.address
		}, done);
	});

	beforeEach(function (done) {
		getDelegates(function (err, res) {
			delegates = res.body.delegates.map(function (delegate) {
				return delegate.publicKey;
			}).slice(0, 101);

			delegate = res.body.delegates[0].publicKey;

			done();
		});
	});

	beforeEach(function (done) {
		getVotes(account.address, function (err, res) {
			votedDelegates = res.body.delegates.map(function (delegate) {
				return delegate.publicKey;
			});

			done();
		});
	});

	before(function (done) {
		postVotes({
			delegates: votedDelegates,
			passphrase: account.password,
			action: '-',
			voteCb: function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
			}
		}, done);
	});

	it('using undefined transaction', function (done) {
		postVote(undefined, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
			done();
		});
	});

	it('using undefined transaction.asset', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate]);

		delete transaction.asset;

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.contain('Invalid transaction body');
			done();
		});
	});

	it('using transaction.asset.votes containing invalid vote type', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, [0]);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote type');
			done();
		});
	});

	it('using transaction.asset.votes containing invalid vote format', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['@' + delegate]);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote format');
			done();
		});
	});

	it('using transaction.asset.votes containing invalid vote length', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate + 'z']);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote length');
			done();
		});
	});

	it('using transaction.asset.votes containing manipulated vote', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+8a6d629685b18e17e5f534065bad4984a8aa6b499c5783c3e65f61779e6da06czz']);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid vote at index 0 - Invalid vote length');
			done();
		});
	});

	it('voting twice for a delegate should fail', function (done) {
		node.async.series([
			function (seriesCb) {
				var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate]);
				postVote(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					return seriesCb();
				});
			},
			function (seriesCb) {
				setTimeout(seriesCb, 1000);
			},
			function (seriesCb) {
				var transaction2 = node.lisk.vote.createVote(account.password, ['+' + delegate]);
				postVote(transaction2, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					return seriesCb();
				});
			},
			function (seriesCb) {
				return node.onNewBlock(seriesCb);
			},
			function (seriesCb) {
				var transaction2 = node.lisk.vote.createVote(account.password, ['+' + delegate]);
				postVote(transaction2, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					return seriesCb();
				});
			},
			function (seriesCb) {
				getVotes(account.address, function (err, res) {
					node.expect(res.body).to.have.property('delegates').that.has.lengthOf(1);
					return seriesCb(err);
				});
			}
		], function (err) {
			return done(err);
		});
	});

	it('removing votes from a delegate should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['-' + delegate]);
		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('voting for 33 delegates at once should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 33).map(function (delegate) {
			return '+' + delegate;
		}));

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('removing votes from 33 delegates at once should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 33).map(function (delegate) {
			return '-' + delegate;
		}));

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('voting for 34 delegates at once should fail', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 34).map(function (delegate) {
			return '+' + delegate;
		}));

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Voting limit exceeded. Maximum is 33 votes per transaction');
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('voting for 101 delegates separately should be ok', function (done) {
		postVotes({
			delegates: delegates,
			passphrase: account.password,
			action: '+',
			voteCb: function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.a('string');
			}
		}, done);
	});

	it('removing votes from 34 delegates at once should fail', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 34).map(function (delegate) {
			return '-' + delegate;
		}));

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Voting limit exceeded. Maximum is 33 votes per transaction');
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('removing votes from 101 delegates separately should be ok', function (done) {
		postVotes({
			delegates: delegates,
			passphrase: account.password,
			action: '-',
			voteCb: function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.a('string');
			}
		}, done);
	});
});

describe('POST /peer/transactions after registering a new delegate', function () {

	before(function (done) {
		getDelegates(function (err, res) {
			delegates = res.body.delegates.map(function (delegate) {
				return delegate.publicKey;
			}).slice(0, 101);

			done();
		});
	});

	before(function (done) {
		sendLISK({
			secret: node.gAccount.password,
			amount: 100000000000,
			recipientId: account.address
		}, done);
	});

	before(function (done) {
		registerDelegate(account, done);
	});

	it('voting for self should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+' + account.publicKey]);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('exceeding maximum of 101 votes should fail', function (done) {
		async.series([
			function (seriesCb) {
				getVotes(account.address, function (err, res) {
					node.expect(res.body).to.have.property('delegates').that.has.lengthOf(1);
					seriesCb(err);
				});
			},
			function (seriesCb) {
				var slicedDelegates = delegates.slice(0, 76);
				node.expect(slicedDelegates).to.have.lengthOf(76);

				postVotes({
					delegates: slicedDelegates,
					passphrase: account.password,
					action: '+',
					voteCb: function (err, res) {
						node.expect(res).to.have.property('success').to.be.ok;
					}
				}, seriesCb);
			},
			function (seriesCb) {
				var slicedDelegates = delegates.slice(-25);
				node.expect(slicedDelegates).to.have.lengthOf(25);

				var transaction = node.lisk.vote.createVote(account.password, slicedDelegates.map(function (delegate) {
					return '+' + delegate;
				}));

				postVote(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Maximum number of 101 votes exceeded (1 too many)');
					seriesCb();
				});
			},
			function (seriesCb) {
				getVotes(account.address, function (err, res) {
					node.expect(res.body).to.have.property('delegates').that.has.lengthOf(77);
					seriesCb(err);
				});
			}
		], function (err) {
			return done(err);
		});
	});

	it('removing vote from self should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['-' + account.publicKey]);

		postVote(transaction, function (err, res) {
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});
});
