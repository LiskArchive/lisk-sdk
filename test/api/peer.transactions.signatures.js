'use strict';

var crypto = require('crypto');
var node = require('./../node.js');

var account = node.randomAccount();
var account2 = node.randomAccount();
var account3 = node.randomAccount();

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, function (err, res) {
		done(err, res);
	});
}

function sendLISK (params, done) {
	var transaction = node.lisk.transaction.createTransaction(params.recipientId, params.amount, params.secret);

	postTransaction(transaction, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			done(err, res);
		});
	});
}

describe('POST /peer/transactions', function () {

	describe('enabling second signature', function () {

		it('using undefined transaction', function (done) {
			postTransaction(undefined, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
				done();
			});
		});

		it('using undefined transaction.asset', function (done) {
			var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

			delete transaction.asset;

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body');
				done();
			});
		});

		describe('when account has no funds', function () {

			it('should fail', function (done) {
				var transaction = node.lisk.signature.createSignature(node.randomPassword(), node.randomPassword());

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
					done();
				});
			});
		});

		describe('when account has funds', function () {

			before(function (done) {
				sendLISK({
					secret: node.gAccount.password,
					amount: node.fees.secondPasswordFee + 100000000,
					recipientId: account.address
				}, done);
			});

			it('should be ok', function (done) {
				var transaction = node.lisk.signature.createSignature(account.password, account.secondPassword);
				transaction.fee = node.fees.secondPasswordFee;

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
					done();
				});
			});
		});
	});

	describe('using second signature', function () {

		before(function (done) {
			node.onNewBlock(function (err) {
				done();
			});
		});

		it('when account does not have one should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, node.gAccount.password, account.secondPassword);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
		});

		it('using blank second passphrase should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, '');

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Missing sender second signature');
				done();
			});
		});

		it('using fake second signature should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account.secondPassword);
			transaction.signSignature = crypto.randomBytes(64).toString('hex');
			transaction.id = node.lisk.crypto.getId(transaction);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.equal('Failed to verify second signature');
				done();
			});
		});

		it('using valid second passphrase should be ok', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password, account.secondPassword);

			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactionId').to.equal(transaction.id);
				done();
			});
		});
	});
});
