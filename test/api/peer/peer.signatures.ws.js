'use strict';

var node = require('../../node.js');
var http = require('../../common/httpCommunication.js');
var ws = require('../../common/wsCommunication.js');

var owner = node.randomAccount();
var coSigner1 = node.randomAccount();
var coSigner2 = node.randomAccount();

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

function postTransactions (transactions, done) {
	ws.call('postTransactions', {
		transactions: transactions
	}, done, true);
}

function postSignature (transaction, signature, done) {
	ws.call('postSignatures', {
		signature: {
			transaction: transaction.id,
			signature: signature
		}
	}, done);
}

describe('getSignatures', function () {

	it('using valid headers should be ok', function (done) {
		ws.call('getSignatures', function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('signatures').that.is.an('array');
			done();
		});
	});
});

describe('postSignatures', function () {

	var validParams;
	var transaction = node.lisk.transaction.createTransaction('1L', 1, node.gAccount.password);

	beforeEach(function (done) {
		validParams = {
			signature: {
				signature: transaction.signature,
				transaction: transaction.id
			}
		};
		done();
	});

	it('using invalid signature schema should fail', function (done) {
		delete validParams.signature.transaction;

		ws.call('postSignatures', validParams, function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid signature body');
			done();
		});
	});

	it('using unprocessable signature should fail', function (done) {
		validParams.signature.transaction = '1';

		ws.call('postSignatures', validParams, function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Error processing signature: Transaction not found');
			done();
		});
	});

	describe('creating a new multisignature account', function () {

		var transaction;

		// Fund accounts
		before(function (done) {
			var transactions = [];

			node.async.eachSeries([owner, coSigner1, coSigner2], function (account, eachSeriesCb) {
				transactions.push(
					node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password)
				);
				eachSeriesCb();
			}, function (err) {
				postTransactions(transactions, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.onNewBlock(function (err) {
						done();
					});
				});
			});
		});

		// Create multisignature group
		before(function (done) {
			var keysgroup = ['+' + coSigner1.publicKey, '+' + coSigner2.publicKey];
			var lifetime = 72;
			var min = 2;

			transaction = node.lisk.multisignature.createMultisignature(owner.password, null, keysgroup, lifetime, min);

			postTransactions([transaction], function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.onNewBlock(function (err) {
					done();
				});
			});
		});

		it('using processable signature for owner should fail', function (done) {
			var signature = node.lisk.multisignature.signTransaction(transaction, owner.password);

			postSignature(transaction, signature, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Error processing signature: Failed to verify signature');
				done();
			});
		});

		it('using processable signature for coSigner1 should be ok', function (done) {
			var signature = node.lisk.multisignature.signTransaction(transaction, coSigner1.password);

			postSignature(transaction, signature, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				done();
			});
		});

		it('using processable signature for coSigner1 should not confirm the transaction', function (done) {
			node.onNewBlock(function (err) {
				node.onNewBlock(function (err) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						done();
					});
				});
			});
		});

		it('using processable signature for coSigner2 should be ok', function (done) {
			var signature = node.lisk.multisignature.signTransaction(transaction, coSigner2.password);

			postSignature(transaction, signature, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				done();
			});
		});

		it('using processable signature for coSigner2 should confirm the transaction', function (done) {
			node.onNewBlock(function (err) {
				http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(transaction.id);
					done();
				});
			});
		});
	});

	describe('sending transaction from multisignature account', function () {

		var transaction;

		before(function (done) {
			node.onNewBlock(done);
		});

		// Send transaction
		before(function (done) {
			transaction = node.lisk.multisignature.createTransaction('1L', 1, owner.password);

			postTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.onNewBlock(function (err) {
					done();
				});
			});
		});

		it('using processable signature for coSigner1 should be ok', function (done) {
			var signature = node.lisk.multisignature.signTransaction(transaction, coSigner1.password);

			postSignature(transaction, signature, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				done();
			});
		});

		it('using processable signature for coSigner1 should not confirm the transaction', function (done) {
			node.onNewBlock(function (err) {
				node.onNewBlock(function (err) {
					http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						done();
					});
				});
			});
		});

		it('using processable signature for coSigner2 should be ok', function (done) {
			var signature = node.lisk.multisignature.signTransaction(transaction, coSigner2.password);

			postSignature(transaction, signature, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				done();
			});
		});

		it('using processable signature for coSigner2 should confirm the transaction', function (done) {
			node.onNewBlock(function (err) {
				http.get('/api/transactions/get?id=' + transaction.id, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(transaction.id);
					done();
				});
			});
		});
	});

});
