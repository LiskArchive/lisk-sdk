'use strict'; /*jslint mocha:true */

var node = require('./../node.js');

var account = node.randomAccount();
while (account.username === account.username.toUpperCase()) {
	account = node.randomAccount();
}

var account2 = node.randomAccount();
account2.username = account.username.toUpperCase();

describe('PUT /accounts/delegates without funds', function () {

	it('When upvoting. Should fail', function (done) {
		node.api.post('/accounts/open')
			.set('Accept', 'application/json')
			.send({
				secret: account.password
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('account').that.is.an('object');
				account.address = res.body.account.address;
				account.publicKey = res.body.account.publicKey;
				account.balance = res.body.account.balance;

				node.onNewBlock(function (err) {
					node.expect(err).to.be.not.ok;
					node.api.put('/accounts/delegates')
						.set('Accept', 'application/json')
						.send({
							secret: account.password,
							delegates: ['+' + node.Eaccount.publicKey]
						})
						.expect('Content-Type', /json/)
						.expect(200)
						.end(function (err, res) {
							// console.log(JSON.stringify(res.body));
							node.expect(res.body).to.have.property('success').to.be.false;
							node.expect(res.body).to.have.property('error');
							node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
							done();
						});
				});
			});
	});

	it('When downvoting. Should fail', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['-' + node.Eaccount.publicKey]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					node.expect(res.body.error).to.contain('Failed to remove vote');
					done();
				});
		});
	});
});

describe('PUT /delegates without funds', function () {

	it('Using valid parameters. Should fail', function (done) {
		node.api.put('/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				username: account.username
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				if (res.body.success === false && res.body.error != null) {
					node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
				} else {
					// console.log('Expected error and got success');
					// console.log('Sent: secret: ' + account.password + ', username: ' + account.username);
					node.expect(false).to.equal(true);
				}
				done();
			});
	});
});

describe('PUT /accounts/delegates with funds', function () {

	before(function (done) {
		// Send random LISK amount from genesis account to Random account

		node.api.put('/transactions')
			.set('Accept', 'application/json')
			.send({
				secret: node.Gaccount.password,
				amount: node.LISK,
				recipientId: account.address
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('transactionId');
				if (res.body.success && res.body.transactionId) {
					node.expect(res.body.transactionId).to.be.above(1);
					account.amount += node.LISK;
				} else {
					// console.log('Transaction failed or transactionId is null');
					// console.log('Sent: secret: ' + node.Gaccount.password + ', amount: ' + node.LISK + ', recipientId: ' + account.address);
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	before(function (done) {
		// Check that account has the LISK we sent

		node.onNewBlock(function (err) {
			node.expect(err).to.be.not.ok;

			node.api.post('/accounts/open')
				.set('Accept', 'application/json')
				.send({
					secret: account.password
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					if (res.body.success && res.body.account) {
						node.expect(res.body.account.balance).to.be.equal(String(node.LISK));
					} else {
						// console.log('Failed to open account or account object is null');
						// console.log('Sent: secret: ' + account.password);
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('When upvoting same delegate multiple times. Should fail', function (done) {
		var votedDelegate = ''+' + node.Eaccount.publicKey + '','+' + node.Eaccount.publicKey + ''';
		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: [votedDelegate]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					if (res.body.success) {
						// console.log('Sent: secret:' + account.password + ', delegates: [' + votedDelegate + ']');
					}
					done();
				});
		});
	});

	it('When downvoting same delegate multiple times. Should fail', function (done) {
		var votedDelegate = ''-' + node.Eaccount.publicKey + '','-' + node.Eaccount.publicKey + ''';
		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: [votedDelegate]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					if (res.body.success) {
						// console.log('Sent: secret:' + account.password + ', delegates: [' + votedDelegate + ']');
					}
					done();
				});
		});
	});

	it('When upvoting and downvoting within same request. Should fail', function (done) {
		var votedDelegate = ''+' + node.Eaccount.publicKey + '','-' + node.Eaccount.publicKey + ''';

		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: [votedDelegate]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					if (res.body.success) {
						// console.log('Sent: secret:' + account.password + ', delegates: [' + votedDelegate + ']');
					}
					done();
				});
		});
	});

	it('When upvoting. Should be ok', function (done) {
		node.api.put('/accounts/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				delegates: ['+' + node.Eaccount.publicKey]
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				if (res.body.success && res.body.transaction) {
					node.expect(res.body.transaction.type).to.equal(node.TxTypes.VOTE);
					node.expect(res.body.transaction.amount).to.equal(0);
					node.expect(res.body.transaction.senderPublicKey).to.equal(account.publicKey);
					node.expect(res.body.transaction.fee).to.equal(node.Fees.voteFee);
				} else {
					// console.log('Transaction failed or transaction object is null');
					// console.log('Sent: secret: ' + account.password + ', delegates: [+' + node.Eaccount.publicKey + ']');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('When upvoting again from same account. Should fail', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['+' + node.Eaccount.publicKey]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					if (res.body.success === false && res.body.error != null) {
						node.expect(res.body.error.toLowerCase()).to.contain('already voted');
					} else {
						// console.log('Expected error but got success');
						// console.log('Sent: secret: ' + account.password + ', delegates: [+' + node.Eaccount.publicKey + ']');
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('When downvoting. Should be ok', function (done) {
		node.onNewBlock(function (err) {
		node.expect(err).to.be.not.ok;
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['-' + node.Eaccount.publicKey]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					node.expect(res.body).to.have.property('transaction').that.is.an('object');
					if (res.body.success && res.body.transaction) {
						node.expect(res.body.transaction.type).to.equal(node.TxTypes.VOTE);
						node.expect(res.body.transaction.amount).to.equal(0);
						node.expect(res.body.transaction.senderPublicKey).to.equal(account.publicKey);
						node.expect(res.body.transaction.fee).to.equal(node.Fees.voteFee);
					} else {
						// console.log('Expected success but got error');
						// console.log('Sent: secret: ' + account.password + ', delegates: [-' + node.Eaccount.publicKey + ']');
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('When downvoting again from same account. Should fail', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['-' + node.Eaccount.publicKey]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					if (res.body.success === false && res.body.error != null) {
						node.expect(res.body.error.toLowerCase()).to.contain('not voted');
					} else {
						// console.log('Expected error but got success');
						// console.log('Sent: secret: ' + account.password + ', delegates: [-' + node.Eaccount.publicKey + ']');
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('When upvoting using a blank pasphrase. Should fail', function (done) {
		node.api.put('/accounts/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: '',
				delegates: ['+' + node.Eaccount.publicKey]
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When downvoting using a blank pasphrase. Should fail', function (done) {
		node.api.put('/accounts/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: '',
				delegates: ['-' + node.Eaccount.publicKey]
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When upvoting without any delegates. Should fail', function (done) {
		node.onNewBlock(function () {
		node.api.put('/accounts/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				delegates: ['+']
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('When downvoting without any delegates. Should fail', function (done) {
		node.onNewBlock(function () {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['-']
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		});
	});

	it('Without any delegates. Should fail', function (done) {
		setTimeout(function () {
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ''
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		}, 3000);
	});
});

describe('PUT /delegates with funds', function () {

	before(function (done) {
		// Send random LISK amount from foundation account to second Random account

		node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send({
			secret: account2.password
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.true;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			account2.address = res.body.account.address;
			account2.publicKey = res.body.account.publicKey;
			account2.balance = res.body.account.balance;

			node.onNewBlock(function (err) {
				node.expect(err).to.be.not.ok;
				node.api.put('/transactions')
					.set('Accept', 'application/json')
					.send({
						secret: node.Gaccount.password,
						amount: node.LISK,
						recipientId: account2.address
					})
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function (err, res) {
						// console.log(JSON.stringify(res.body));
						node.expect(res.body).to.have.property('success').to.be.true;
						node.expect(res.body).to.have.property('transactionId');
						if (res.body.success && res.body.transactionId) {
							node.expect(res.body.transactionId).to.be.above(1);
							account2.amount += node.LISK;
						} else {
							// console.log('Transaction failed or transactionId is null');
							// console.log('Sent: secret: ' + node.Gaccount.password + ', amount: ' + node.LISK + ', recipientId: ' + account2.address);
							node.expect(false).to.equal(true);
						}
						done();
					});
			});
	});

	before(function (done) {
		// Check that account2 has the LISK we sent

		node.onNewBlock(function (err) {
			node.expect(err).to.be.not.ok;
			node.api.post('/accounts/open')
				.set('Accept', 'application/json')
				.send({
					secret: account2.password
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					if (res.body.success && res.body.account) {
						node.expect(res.body.account.balance).to.be.equal(''+node.LISK);
					} else {
						// console.log('Failed to open account or account object is null');
						// console.log('Sent: secret: ' + account2.password);
						node.expect(false).to.equal(true);
					}
					done();
				});
			});
		});
	});

	it('Using blank pasphrase. Should fail', function (done) {
		node.api.put('/delegates')
			.set('Accept', 'application/json')
			.send({
				secret: '',
				username: account.username
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('Using invalid pasphrase. Should fail', function (done) {
		setTimeout(function () {
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: [],
					username: account.username
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		}, 3000);
	});

	it('Using invalid username. Should fail', function (done) {
		setTimeout(function () {
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					username: '~!@#$%^&*()_+.,?/'
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		}, 1000);
	});

	it('Using username longer than 20 characters. Should fail', function (done) {
		setTimeout(function () {
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					username: 'ABCDEFGHIJKLMNOPQRSTU'
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		}, 1000);
	});

	it('Using blank username. Should fail', function (done) {
		setTimeout(function () {
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					username: ''
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		}, 1000);
	});

	it('Using uppercase username: ' + account.username + '. Should be ok and delegate should be registered in lower case', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					username: account.username
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					node.expect(res.body).to.have.property('transaction').that.is.an('object');
					if (res.body.success && res.body.transaction) {
						node.expect(res.body.transaction.fee).to.equal(node.Fees.delegateRegistrationFee);
						node.expect(res.body.transaction.asset.delegate.username).to.equal(account.username.toLowerCase());
						node.expect(res.body.transaction.asset.delegate.publicKey).to.equal(account.publicKey);
						node.expect(res.body.transaction.type).to.equal(node.TxTypes.DELEGATE);
						node.expect(res.body.transaction.amount).to.equal(0);
					} else {
						// console.log('Transaction failed or transaction object is null');
						// console.log('Sent: secret: ' + account.password + ', username: ' + account.username);
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('Using same account. Should fail', function (done) {
		node.onNewBlock(function (err) {
			node.expect(err).to.be.not.ok;
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					username: account.username
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		});
	});

	it('Using existing username but different case: ' + account2.username + '. Should fail', function (done) {
		node.onNewBlock(function (err) {
			node.expect(err).to.be.not.ok;
			// console.log(JSON.stringify({
			//	secret: account2.password,
			//	username: account2.username
			// }));
			node.api.put('/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account2.password,
					username: account2.username
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.false;
					node.expect(res.body).to.have.property('error');
					done();
				});
		});
	});
});

describe('GET /delegates', function () {

	it('Using no parameters. Should be ok', function (done) {
		var limit = 10;
		var offset = 0;

		node.api.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=vote:asc')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body).to.have.property('totalCount').that.is.at.least(0);
				node.expect(res.body.delegates).to.have.length.of.at.most(limit);
				var num_of_delegates = res.body.delegates.length;
				// console.log('Limit is ' + limit + '. Number of delegates returned is: ' + num_of_delegates);
				// console.log('Total Number of delegates returned is: ' + res.body.totalCount);
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
					// console.log('Got 0 delegates');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('Using valid parameters. Should be ok', function (done) {
		var limit = 20;
		var offset = 10;

		node.api.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=rate:desc')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body).to.have.property('totalCount').that.is.at.least(0);
				node.expect(res.body.delegates).to.have.length.of.at.most(limit);
				var num_of_delegates = res.body.delegates.length;
				// console.log('Limit is: ' + limit + '. Number of delegates returned is: ' + num_of_delegates);
				// console.log('Total Number of delegates returned is: ' + res.body.totalCount);
				if (num_of_delegates >= 1) {
					for (var i = 0; i < num_of_delegates; i++) {
						if (res.body.delegates[i + 1] != null) {
							node.expect(res.body.delegates[i].rate).to.be.at.least(res.body.delegates[i + 1].rate);
						}
					}
				} else {
					// console.log('Got 0 delegates');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('Using invalid parameters. Should be ok', function (done) {
		// Should be ok because invalid parameters that we send are optional parameters

		var limit = 'invalid';
		var offset = 'invalid';

		node.api.get('/delegates?limit='+limit+'&offset='+offset+'&orderBy=invalid')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});

describe('GET /accounts/delegates?address=', function () {

	it('Using valid address. Should be ok', function (done) {
		node.api.get('/accounts/delegates?address=' + node.Gaccount.address)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
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

	it('Using invalid address. Should fail', function (done) {
		node.api.get('/accounts/delegates?address=NOTaLiskAddress')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});

describe('GET /delegates/count', function () {

	it('Should be ok', function (done) {
		node.api.get('/delegates/count')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('count').to.be.at.least(101);
				done();
			});
	});
});

describe('GET /delegates/voters', function () {

	before(function (done) {
		// console.log(JSON.stringify({
		//	secret: account.password,
		//	delegates: ['+' + node.Eaccount.publicKey]
		// }));
		node.onNewBlock(function (err) {
			node.expect(err).to.be.not.ok;
			node.api.put('/accounts/delegates')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					delegates: ['+' + node.Eaccount.publicKey]
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					done();
				});
		});
	});

	it('Using no publicKey. Should fail', function (done) {
		node.api.get('/delegates/voters?publicKey=')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success');
				if(res.body.success === false) {
					node.expect(res.body).to.have.property('error');
				} else {
					node.expect(res.body).to.have.property('accounts').that.is.an('array');
					node.expect(res.body.accounts.length).to.equal(0);
				}

				done();
			});
	});

	it('Using invalid publicKey. Should fail', function (done) {
		node.api.get('/delegates/voters?publicKey=NotAPublicKey')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('Using valid publicKey. Should be ok', function (done) {
		node.onNewBlock(function (err) {
			node.api.get('/delegates/voters?publicKey=' + node.Eaccount.publicKey)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.true;
					node.expect(res.body).to.have.property('accounts').that.is.an('array');
					var flag = 0;
					for (var i = 0; i < res.body.accounts.length; i++) {
						if (res.body.accounts[i].address == account.address) {
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

	it('When criteria is missing. Should fail', function (done) {
		var q = '';

		node.api.get('/delegates/search')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When criteria is an empty string. Should fail', function (done) {
		var q = '';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When criteria length is 1 character. Should be ok', function (done) {
		var q = 'g'; // 1 character

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				done();
			});
	});

	it('When criteria length is 20 characters. Should be ok', function (done) {
		var q = 'genesis_123456789012'; // 20 characters

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				done();
			});
	});

	it('When criteria length is greater than 20 characters. Should fail', function (done) {
		var q = 'genesis_1234567890123'; // 21 characters

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When critera == 'genesis_1'. Should return 13 delegates', function (done) {
		var q = 'genesis_1';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(13);
				done();
			});
	});

	it('When critera == 'genesis_10'. Should return 3 delegates', function (done) {
		var q = 'genesis_10';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(3);
				done();
			});
	});

	it('When critera == 'genesis_101'. Should return 1 delegate', function (done) {
		var q = 'genesis_101';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(1);
				done();
			});
	});

	it('When critera == 'genesis_101'. Should have all properties', function (done) {
		var q = 'genesis_101';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
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

	it('When limit is missing. Should be ok', function (done) {
		var q = 'genesis_';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(100);
				done();
			});
	});

	it('When limit is a string. Should be ok', function (done) {
		var q = 'genesis_';
		var limit = 'one'

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When limit == -100. Should fail', function (done) {
		var q = 'genesis_';
		var limit = -100;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When limit == -1. Should fail', function (done) {
		var q = 'genesis_';
		var limit = -1;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When limit === 0. Should fail', function (done) {
		var q = 'genesis_';
		var limit = 0;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When limit == 1. Should be ok', function (done) {
		var q = 'genesis_';
		var limit = 1;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(1);
				done();
			});
	});

	it('When limit == 100. Should be ok', function (done) {
		var q = 'genesis_';
		var limit = 100;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(100);
				done();
			});
	});

	it('When limit > 100. Should fail', function (done) {
		var q = 'genesis_';
		var limit = 101;

		node.api.get('/delegates/search?q=' + q + '&limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When orderBy is invalid. Should fail', function (done) {
		var q = 'genesis_';

		node.api.get('/delegates/search?q=' + q + '&orderBy=unknown:abc')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.false;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('When orderBy is missing. Should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		node.api.get('/delegates/search?q=' + q)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(100);
				node.expect(res.body.delegates[0]).to.have.property('username');
				node.expect(res.body.delegates[0].username).to.equal('genesis_1');
				node.expect(res.body.delegates[24]).to.have.property('username');
				node.expect(res.body.delegates[24].username).to.equal('genesis_3');
				done();
			});
	});

	it('When orderBy == 'username:asc'. Should be ordered by ascending username', function (done) {
		var q = 'genesis_';

		node.api.get('/delegates/search?q=' + q + '&orderBy=username:asc')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
				node.expect(res.body).to.have.property('delegates').that.is.an('array');
				node.expect(res.body.delegates).to.have.length(100);
				node.expect(res.body.delegates[0]).to.have.property('username');
				node.expect(res.body.delegates[0].username).to.equal('genesis_1');
				node.expect(res.body.delegates[24]).to.have.property('username');
				node.expect(res.body.delegates[24].username).to.equal('genesis_3');
				done();
			});
	});

	it('When orderBy == 'username:desc'. Should be ordered by descending username', function (done) {
		var q = 'genesis_';

		node.api.get('/delegates/search?q=' + q + '&orderBy=username:desc')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.true;
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
