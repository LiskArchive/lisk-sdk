'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();
var account3 = node.randomTxAccount();

var transactionList = [];
var offsetTimestamp = 0;

function putTransaction (params, done) {
	node.api.put('/transactions')
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function sendLISK (account, done) {
	var randomLISK = node.randomLISK();
	var expectedFee = node.expectedFee(randomLISK);

	putTransaction({
		secret: node.gAccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		if (res.body.success && res.body.transactionId != null) {
			transactionList.push({
				'sender': node.gAccount.address,
				'recipient': account.address,
				'grossSent': (randomLISK + expectedFee) / node.normalizer,
				'fee': expectedFee / node.normalizer,
				'netSent': randomLISK / node.normalizer,
				'txId': res.body.transactionId,
				'type': node.txTypes.SEND
			});
		}
		done(err, res);
	});
}

before(function (done) {
	setTimeout(function () {
		sendLISK(account, done);
	}, 2000);
});

before(function (done) {
	setTimeout(function () {
		sendLISK(account2, done);
	}, 2000);
});

before(function (done) {
	node.onNewBlock(function (err) {
		done();
	});
});

describe('GET /api/transactions', function () {

	it('using valid parameters should be ok', function (done) {
		var senderId = node.gAccount.address, blockId = '', recipientId = account.address, limit = 10, offset = 0, orderBy = 'amount:asc';

		node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');
				node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
				if (res.body.transactions.length > 0) {
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
						}
					}
				} else {
					// console.log('Request failed. Expected success');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('using type should be ok', function (done) {
		node.api.get('/transactions?type=' + node.txTypes.SEND)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				if (res.body.success && res.body.transactions != null) {
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i]) {
							node.expect(res.body.transactions[i].type).to.equal(node.txTypes.SEND);
						}
					}
				} else {
					// console.log('Request failed or transaction list is null');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('using no limit should be ok', function (done) {
		var senderId = node.gAccount.address, blockId = '', recipientId = account.address, offset = 0, orderBy = 'amount:desc';

		node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');
				if (res.body.transactions.length > 0) {
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].amount).to.be.at.least(res.body.transactions[i + 1].amount);
						}
					}
				}
				done();
			});
	});

	it('using limit > 100 should fail', function (done) {
		var senderId = node.gAccount.address, blockId = '', recipientId = account.address, limit = 999999, offset = 0, orderBy = 'amount:asc';

		node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('ordered by ascending timestamp should be ok', function (done) {
		var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 0, orderBy = 'timestamp:asc';

		node.onNewBlock(function (err) {
			node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactions').that.is.an('array');
					node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
					if (res.body.transactions.length > 0) {
						var flag = 0;
						for (var i = 0; i < res.body.transactions.length; i++) {
							if (res.body.transactions[i + 1]) {
								node.expect(res.body.transactions[i].timestamp).to.be.at.most(res.body.transactions[i + 1].timestamp);
								if (flag === 0) {
									offsetTimestamp = res.body.transactions[i + 1].timestamp;
									flag = 1;
								}
							}
						}
					} else {
						// console.log('Request failed. Expected success');
						node.expect(false).to.equal(true);
					}
					done();
				});
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 1, orderBy = 'timestamp:asc';

		node.onNewBlock(function (err) {
			node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactions').that.is.an('array');
					node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
					if (res.body.transactions.length > 0) {
						node.expect(res.body.transactions[0].timestamp).to.be.equal(offsetTimestamp);
					}
					done();
				});
		});
	});

	it('using offset == "one" should fail', function (done) {
		var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 'one', orderBy = 'timestamp:asc';

		node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			 });
	});

	it('using completely invalid fields should fail', function (done) {
		var senderId = 'invalid', blockId = 'invalid', recipientId = 'invalid', limit = 'invalid', offset = 'invalid', orderBy = 'blockId:asc';

		node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using partially invalid fields should fail', function (done) {
		var senderId = 'invalid', blockId = 'invalid', recipientId = account.address, limit = 'invalid', offset = 'invalid', orderBy = 'blockId:asc';

		node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});

describe('GET /transactions/get?id=', function () {

	it('using valid id should be ok', function (done) {
		var transactionInCheck = transactionList[0];

		node.api.get('/transactions/get?id='+transactionInCheck.txId)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				if (res.body.success && res.body.transaction.id != null) {
					node.expect(res.body.transaction.id).to.equal(transactionInCheck.txId);
					node.expect(res.body.transaction.amount / node.normalizer).to.equal(transactionInCheck.netSent);
					node.expect(res.body.transaction.fee / node.normalizer).to.equal(transactionInCheck.fee);
					node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipient);
					node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.sender);
					node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);
				} else {
					// console.log('Transaction failed or transaction list is null');
					node.expect(false).to.equal(true);
				}
				done();
			});
	});

	it('using invalid id should fail', function (done) {
		node.api.get('/transactions/get?id=NotTxId')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});
});

describe('GET /transactions/unconfirmed/get?id=', function () {

	it('using valid id should be ok', function (done) {
		node.api.get('/transactions/unconfirmed/get?id=' + transactionList[transactionList.length - 1].txId)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success');
				if (res.body.success) {
					if (res.body.transaction != null) {
						node.expect(res.body.transaction.id).to.equal(transactionList[transactionList.length - 1].txId);
					}
				} else {
					// console.log('Transaction already processed');
					node.expect(res.body).to.have.property('error');
				}
				done();
			});
	});
});

describe('GET /transactions/unconfirmed', function () {

	it('should be ok', function (done) {
		node.api.get('/transactions/unconfirmed')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');
				done();
			});
	});
});

describe('PUT /api/transactions', function () {

	it('using valid parameters should be ok', function (done) {
		var amountToSend = 100000000;
		var expectedFee = node.expectedFee(amountToSend);

		putTransaction({
			secret: account.password,
			amount: amountToSend,
			recipientId: account2.address
		}, function (err, res) {
			if (res.body.success && res.body.transactionId != null) {
				transactionList.push({
					'sender': account.address,
					'recipient': account2.address,
					'grossSent': (amountToSend + expectedFee) / node.normalizer,
					'fee': expectedFee / node.normalizer,
					'netSent': amountToSend / node.normalizer,
					'txId': res.body.transactionId,
					'type': node.txTypes.SEND
				});
			}
			done();
		});
	});

	it('using negative amount should fail', function (done) {
		var amountToSend = -100000000;

		putTransaction({
			secret: account.password,
			amount: amountToSend,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using float amount should fail', function (done) {
		var amountToSend = 1.2;

		putTransaction({
			secret: account.password,
			amount: amountToSend,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using entire balance should fail', function (done) {
		putTransaction({
			secret: account.password,
			amount: account.balance,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using zero amount should fail', function (done) {
		putTransaction({
			secret: account.password,
			amount: 0,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using positive overflown amount should fail', function (done) {
		putTransaction({
			secret: account.password,
			amount: 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using negative overflown amount should fail', function (done) {
		putTransaction({
			secret: account.password,
			amount: -1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using small fractional amount should be ok', function (done) {
		putTransaction({
			secret: account.password,
			amount: 1,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			done();
		});
	});

	it('using no passphase should fail', function (done) {
		var amountToSend = 100000000;

		putTransaction({
			amount: amountToSend,
			recipientId: account2.address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no recipient should fail', function (done) {
		var amountToSend = 100000000;

		putTransaction({
			secret: account.password,
			amount: amountToSend
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	describe('to a cold address', function (done) {
		var recipientId = '13896491535841206186L';

		it('should be ok', function (done) {
			var amountToSend = 110000000;

			putTransaction({
				secret: node.gAccount.password,
				amount: amountToSend,
				recipientId: recipientId
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	describe('from a cold address', function (done) {
		var passphrase = 'fiber diet blind uncover crunch breeze bicycle globe attack chalk cousin divert';

		before(function (done) {
			node.onNewBlock(done);
		});

		it('should be ok', function (done) {
			var amountToSend = 100000000;

			putTransaction({
				secret: passphrase,
				amount: amountToSend,
				recipientId: account2.address
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});
});
