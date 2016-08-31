'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');
var crypto = require('crypto');

var genesisblock = require('../../genesisBlock.json');

function postTransaction (transaction, done) {
	node.peer.post('/transactions')
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
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function getAddress (address, done) {
	node.api.get('/accounts?address=' + address)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

describe('POST /peer/transactions', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('1L', 1, node.Gaccount.password);

		var validHash = node.config.nethash;
		node.config.nethash = 'incorrect';

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body.expected).to.equal(validHash);
			node.config.nethash = validHash;
			done();
		});
	});

	it('using correct nethash in headers should be ok', function (done) {
		var transaction = node.lisk.transaction.createTransaction('1L', 1, node.Gaccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});

	it('using varying recipientId casing should go to same address', function (done) {
		var account = node.randomAccount();
		var keys = node.lisk.crypto.getKeys(account.password);
		var address = node.lisk.crypto.getAddress(keys.publicKey);

		var transaction = node.lisk.transaction.createTransaction(address, 100000000, node.Gaccount.password);
		postTransaction(transaction, function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				var transaction2 = node.lisk.transaction.createTransaction(address.toLowerCase(), 100000000, node.Gaccount.password);
				postTransaction(transaction2, function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.onNewBlock(function (err) {
						getAddress(address, function (err, res) {
							// console.log(JSON.stringify(res.body));
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
		var transaction = node.lisk.transaction.createTransaction(undefined, 1, node.Gaccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using transaction with negative amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('1L', -1, node.Gaccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid passphrase should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.Gaccount.password);
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
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using fake signature should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.Gaccount.password);
		transaction.signature = crypto.randomBytes(64).toString('hex');
		transaction.id = node.lisk.crypto.getId(transaction);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.Gaccount.password);
		transaction.senderPublicKey = node.randomPassword();

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using invalid signature should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1, node.Gaccount.password);
		transaction.signature = node.randomPassword();

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using very large amount and genesis block id should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 10000000000000000, node.Gaccount.password);
		transaction.blockId = genesisblock.id;

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using overflown amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 184819291270000000012910218291201281920128129,
		node.Gaccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});

	it('using float amount should fail', function (done) {
		var transaction = node.lisk.transaction.createTransaction('12L', 1.3, node.Gaccount.password);

		postTransaction(transaction, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('message');
			done();
		});
	});
});
