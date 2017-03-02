'use strict';

var crypto = require('crypto');
var node = require('./../node.js');

var genesisblock = require('../../genesisBlock.json');

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, done);
}

function getAddress (address, done) {
	node.get('/api/accounts?address=' + address, done);
}

describe('GET /peer/transactions', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.get('/peer/transactions')
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using incompatible version in headers should fail', function (done) {
		node.get('/peer/transactions')
			.set('version', '0.1.0a')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.eql('Request is made from incompatible version');
				node.expect(res.body).to.have.property('expected').to.eql('0.0.0a');
				node.expect(res.body).to.have.property('received').to.eql('0.1.0a');
				done();
			});
	});

	it('using valid headers should be ok', function (done) {
		node.get('/peer/transactions')
			.end(function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').to.be.an('array');
				done();
			});
	});
});

describe('POST /peer/transactions', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.post('/peer/transactions')
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using incompatible version in headers should fail', function (done) {
		node.post('/peer/transactions')
			.set('version', '0.1.0a')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.eql('Request is made from incompatible version');
				node.expect(res.body).to.have.property('expected').to.eql('0.0.0a');
				node.expect(res.body).to.have.property('received').to.eql('0.1.0a');
				done();
			});
	});

	it('using valid headers should be ok', function (done) {
		var account = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
			done();
		});
	});

	it('using already processed transaction should fail', function (done) {
		var account = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.match(/Transaction is already processed: [0-9]+/);
				done();
			});
		});
	});

	it('using already confirmed transaction should fail', function (done) {
		var account = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);

			node.onNewBlock(function (err) {
				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.match(/Transaction is already confirmed: [0-9]+/);
					done();
				});
			});
		});
	});

	it('using varying recipientId casing should go to same address', function (done) {
		var account = node.randomAccount();
		var keys = node.lisk.crypto.getKeys(account.password);
		var address = node.lisk.crypto.getAddress(keys.publicKey);

		var transaction = node.lisk.transaction.createTransaction(address, 100000000, node.gAccount.password);
		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;

			node.onNewBlock(function (err) {
				var transaction2 = node.lisk.transaction.createTransaction(address.toLowerCase(), 100000000, node.gAccount.password);
				postTransaction(transaction2, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;

					node.onNewBlock(function (err) {
						getAddress(address, function (err, res) {
							node.expect(res.body).to.have.property('success').to.be.ok;
							node.expect(res.body).to.have.property('account').that.is.an('object');
							node.expect(res.body.account).to.have.property('balance').to.equal('200000000');
							done();
						});
					});
				});
			});
		});
	});

	it('using transaction with undefined recipientId should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction(undefined, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message').to.eql('Missing recipient');
			done();
		});
	});

	it('using transaction with invalid recipientId should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('0123456789001234567890L', 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message').to.eql('Invalid transaction body');
			done();
		});
	});

	it('using transaction with negative amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('1L', -1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid passphrase should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.gAccount.password);
		transaction.recipientId = '1L';
		transaction.id = node.lisk.crypto.getId(transaction);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('when sender has no funds should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('1L', 1, 'randomstring');

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('when sender does not have enough funds should always fail', function (done) {
		var account = node.randomAccount();
		var transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);

			node.onNewBlock(function () {
				var count = 1;
				var transaction2 = node.lisk.transaction.createTransaction(node.gAccount.address, 2, account.password);

				node.async.doUntil(function (next) {
					postTransaction(transaction2, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						node.expect(res.body).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 1e-8/);
						count++;
						return next();
					});
				}, function () {
					return count === 10;
				}, function () {
					return done();
				});
			});
		});
	});

	it('using fake signature should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.gAccount.password);
		transaction.signature = crypto.randomBytes(64).toString('hex');
		transaction.id = node.lisk.crypto.getId(transaction);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.gAccount.password);
		transaction.senderPublicKey = node.randomPassword();

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid signature should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.gAccount.password);
		transaction.signature = node.randomPassword();

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using very large amount and genesis block id should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 10000000000000000, node.gAccount.password);
		transaction.blockId = genesisblock.id;

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using overflown amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 184819291270000000012910218291201281920128129,
		node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using float amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1.3, node.gAccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	describe('from the genesis account', function () {

		var signedTransactionFromGenesis = {
			type: 0,
			amount: 1000,
			senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			requesterPublicKey: null,
			timestamp: 24259352,
			asset: {},
			recipientId: node.eAccount.address,
			signature: 'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
			id: '15307587316657110485',
			fee: 10000000
		};

		it('should fail', function (done) {
			postTransaction(signedTransactionFromGenesis, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				done();
			});
		});
	});

	describe('using multiple transactions', function () {
		it('with invalid transaction should fail');

		it('with valid transaction should be ok');
	});
});
