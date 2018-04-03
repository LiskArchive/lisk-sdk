'use strict';

var node = require('./../node.js');
var _ = require('lodash');

describe('POST /peer/transactions', function () {

	var multisigAccount = node.randomAccount();
	var memberAccount1 = node.randomAccount();
	var memberAccount2 = node.randomAccount();
	var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

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

	describe('creating multisignature group', function () {

		before(function (done) {
			sendLISK({
				secret: node.gAccount.password,
				amount: node.fees.multisignatureRegistrationFee * 10,
				recipientId: multisigAccount.address
			}, done);
		});

		describe('signatures property', function () {

			it('using null inside array should fail', function (done) {
				multiSigTx.signatures = [null];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type null');
					done();
				});
			});

			it('using undefined inside array should fail', function (done) {
				multiSigTx.signatures = [undefined];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type null');
					done();
				});
			});

			it('using integer inside array should fail', function (done) {
				multiSigTx.signatures = [1];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type integer');
					done();
				});
			});

			it('using empty object inside array should fail', function (done) {
				multiSigTx.signatures = [{}];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					done();
				});
			});

			it('using not empty object inside array should fail', function (done) {
				multiSigTx.signatures = [new Buffer.from('Duppa')];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					done();
				});
			});

			it('using empty string inside array should fail', function (done) {
				multiSigTx.signatures = [''];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Failed to verify multisignature');
					done();
				});
			});

			it('using string with invalid format inside array should fail', function (done) {
				multiSigTx.signatures = ['x'];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format signature: ' + multiSigTx.signatures[0]);
					done();
				});
			});

			it('using invalid signature inside array should fail', function (done) {
				var signature = '3fe524c1b8d84bf7dd262f0f38287638a1babd19a5481bfa90211c79c80acd12f04f9399723b4aac59804bb6dfa5f6435bb75007d00acf2d175bcd4b24376c0f';
				multiSigTx.signatures = [signature];

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Failed to verify multisignature');
					done();
				});
			});

			it('using duplicate signature inside array should fail', function (done) {
				multiSigTx.signatures = [];
				var signature1 = node.lisk.multisignature.signTransaction(multiSigTx, memberAccount1.password);
				multiSigTx.signatures.push(signature1, signature1);

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Array items are not unique (indexes 0 and 1)');
					done();
				});
			});

			it('using empty array should be ok but never confirmed', function (done) {
				var anotherMultiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.randomAccount().publicKey, '+' + node.randomAccount().publicKey], 1, 2);
				anotherMultiSigTx.signatures = [];

				postTransaction(anotherMultiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(anotherMultiSigTx.id);
					node.onNewBlock(function (err) {
						node.get('/api/transactions/get?id=' + anotherMultiSigTx.id, function (err, res) {
							node.expect(res.body).to.have.property('success').to.be.not.ok;
							node.expect(res.body).to.have.property('error').to.equal('Transaction not found');
							done();
						});
					});
				});
			});

			it('using correct signatures should be ok and confirmed', function (done) {
				multiSigTx.signatures = [];
				var signature1 = node.lisk.multisignature.signTransaction(multiSigTx, memberAccount1.password);
				var signature2 = node.lisk.multisignature.signTransaction(multiSigTx, memberAccount2.password);
				multiSigTx.signatures.push(signature1, signature2);
				multiSigTx.ready = true;

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transactionId').to.equal(multiSigTx.id);
					node.onNewBlock(function (err) {
						node.get('/api/transactions/get?id=' + multiSigTx.id, function (err, res) {
							node.expect(res.body).to.have.property('success').to.be.ok;
							node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.id);
							done();
						});
					});
				});
			});
		});

		describe('requesterPublicKey property', function () {

			it('requesting multisig group transaction from non author account', function (done) {
				var transaction = node.lisk.transaction.createTransaction(node.randomAccount().address, 1 * node.normalizer, memberAccount1.password);
				transaction.requesterPublicKey = multisigAccount.publicKey;
				transaction.id = node.lisk.crypto.getId(transaction);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.not.be.ok;
					node.expect(res.body).to.have.property('message').to.equal('Multisig request is not allowed');
					done();
				});
			});
		});
	});
});
