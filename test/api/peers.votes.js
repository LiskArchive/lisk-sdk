'use strict'; /*jslint mocha:true, expr:true */

var async = require('async');
var node = require('./../node.js');

var account = node.randomAccount();

var delegate;
var delegates = [];
var votedDelegates = [];

node.chai.config.includeStack = true;

function getDelegates (done) {
	node.api.get('/api/delegates')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			return done(err, res);
		});
}

function getVotes (address, done) {
	node.api.get('/api/accounts/delegates/?address=' + address)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('delegates').that.is.an('array');
			return done(err, res);
		});
}

function postVotes (params, done) {
	var count = 0;
	var limit = Math.ceil(params.delegates.length / 25);

	async.whilst(
		function () {
			return count <= limit;
		}, function (untilCb) {
			node.onNewBlock(function (err) {
				count++;
				return untilCb();
			});
		}, function (err) {
			async.eachSeries(params.delegates, function (delegate, eachCb) {
				var transaction = node.lisk.vote.createVote(params.passphrase, [params.action + delegate]);

				postVote(transaction, function (err, res) {
					params.voteCb(err, res);
					return eachCb();
				});
			}, function (err) {
				node.onNewBlock(function (err) {
					return done(err);
				});
			});
		}
	);
}

function postVote (transaction, done) {
	node.peer.post('/peer/transactions')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('port', node.config.port)
		.set('nethash', node.config.nethash)
		.send({
			transaction: transaction
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log('Sent: ' + JSON.stringify(transaction) + ' Got reply: ' + JSON.stringify(res.body));
			return done(err, res);
		});
}

function sendLISK (params, done) {
	node.api.put('/api/transactions')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('nethash', node.config.nethash)
		.set('port', node.config.port)
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				return done(err, res);
			});
		});
}

function registerDelegate (account, done) {
	account.username = node.randomDelegateName().toLowerCase();
	var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

	node.peer.post('/peer/transactions')
		.set('Accept', 'application/json')
		.set('version', node.version)
		.set('nethash', node.config.nethash)
		.set('port', node.config.port)
		.send({
			transaction: transaction
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log('Sent: ' + JSON.stringify(transaction) + ' Got reply: ' + JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				return done(err, res);
			});
		});
}

describe('POST /peer/transactions', function () {

	before(function (done) {
		async.series([
			function (seriesCb) {
				sendLISK({
					secret: node.gAccount.password,
					amount: 100000000000,
					recipientId: account.address
				}, seriesCb);
			},
			function (seriesCb) {
				getDelegates(function (err, res) {
					delegates = res.body.delegates.map(function (delegate) {
						return delegate.publicKey;
					}).slice(0, 101);

					delegate = res.body.delegates[0].publicKey;

					return seriesCb();
				});
			},
			function (seriesCb) {
				getVotes(account.address, function (err, res) {
					votedDelegates = res.body.delegates.map(function (delegate) {
						return delegate.publicKey;
					});

					return seriesCb();
				});
			},
			function (seriesCb) {
				postVotes({
					delegates: votedDelegates,
					passphrase: account.password,
					action: '-',
					voteCb: function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
					}
				}, seriesCb);
			}
		], function (err) {
			return done(err);
		});
	});

	it('using undefined transaction', function (done) {
		postVote(undefined, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
			done();
		});
	});

	it('using undefined transaction.asset', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate]);

		delete transaction.asset;

		postVote(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
			done();
		});
	});

	it('voting for a delegate and then removing again within same block should fail', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate]);
			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

				var transaction2 = node.lisk.vote.createVote(account.password, ['-' + delegate]);
				postVote(transaction2, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('removing votes from a delegate and then voting again within same block should fail', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, ['-' + delegate]);
			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

				var transaction2 = node.lisk.vote.createVote(account.password, ['+' + delegate]);
				postVote(transaction2, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('voting twice for a delegate should fail', function (done) {
		async.series([
			function (seriesCb) {
				node.onNewBlock(function (err) {
					var transaction = node.lisk.vote.createVote(account.password, ['+' + delegate]);
					postVote(transaction, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						done();
					});
				});
			},
			function (seriesCb) {
				node.onNewBlock(function (err) {
					var transaction2 = node.lisk.vote.createVote(account.password, ['+' + delegate]);
					postVote(transaction2, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						done();
					});
				});
			},
		], function (err) {
			return done(err);
		});
	});

	it('removing votes from a delegate should be ok', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, ['-' + delegate]);
			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	it('voting for 33 delegates at once should be ok', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 33).map(function (delegate) {
				return '+' + delegate;
			}));

			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	it('removing votes from 33 delegates at once should be ok', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 33).map(function (delegate) {
				return '-' + delegate;
			}));

			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	it('voting for 34 delegates at once should fail', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 34).map(function (delegate) {
				return '+' + delegate;
			}));

			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Voting limit exceeded. Maximum is 33 votes per transaction');
				done();
			});
		});
	});

	it('voting for 101 delegates separately should be ok', function (done) {
		node.onNewBlock(function (err) {
			postVotes({
				delegates: delegates,
				passphrase: account.password,
				action: '+',
				voteCb: function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
				}
			}, done);
		});
	});

	it('removing votes from 34 delegates at once should fail', function (done) {
		node.onNewBlock(function (err) {
			var transaction = node.lisk.vote.createVote(account.password, delegates.slice(0, 34).map(function (delegate) {
				return '-' + delegate;
			}));

			postVote(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Voting limit exceeded. Maximum is 33 votes per transaction');
				done();
			});
		});
	});

	it('removing votes from 101 delegates separately should be ok', function (done) {
		postVotes({
			delegates: delegates,
			passphrase: account.password,
			action: '-',
			voteCb: function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
			}
		}, done);
	});
});

describe('POST /peer/transactions after registering a new delegate', function () {

	before(function (done) {
		async.series([
			function (seriesCb) {
				getDelegates(function (err, res) {
					delegates = res.body.delegates.map(function (delegate) {
						return delegate.publicKey;
					}).slice(0, 101);

					return seriesCb();
				});
			},
			function (seriesCb) {
				sendLISK({
					secret: node.gAccount.password,
					amount: 100000000000,
					recipientId: account.address
				}, seriesCb);
			},
			function (seriesCb) {
				registerDelegate(account, seriesCb);
			}
		], function (err) {
			return done(err);
		});
	});

	it('voting for self should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['+' + account.publicKey]);

		postVote(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				return done(err);
			});
		});
	});

	it('exceeding maximum of 101 votes within same block should fail', function (done) {
		async.series([
			function (seriesCb) {
				var slicedDelegates = delegates.slice(0, 76);
				node.expect(slicedDelegates).to.have.lengthOf(76);

				postVotes({
					delegates: slicedDelegates,
					passphrase: account.password,
					action: '+',
					voteCb: function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
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
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Maximum number of 101 votes exceeded (1 too many).');
					seriesCb();
				});
			}
		], function (err) {
			return done(err);
		});
	});

	it('removing vote from self should be ok', function (done) {
		var transaction = node.lisk.vote.createVote(account.password, ['-' + account.publicKey]);

		postVote(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});
