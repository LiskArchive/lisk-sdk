'use strict';

var crypto = require('crypto');
var node = require('./../node.js');

var multisigAccount = node.randomAccount();

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

	describe('creating multisignature group', function () {

		describe('when account has no funds', function () {

			it('should fail', function (done) {
				var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, [node.lisk.crypto.getKeys(node.randomPassword()).publicKey], 1, 2);

				postTransaction(multiSigTx, function (err, res) {
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
					amount: node.fees.multisignatureRegistrationFee * 10,
					recipientId: multisigAccount.address
				}, done);
			});

			it('using null member in keysgroup should fail', function (done) {
				var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, null], 1, 2);

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid member in keysgroup');
					done();
				});
			});

			it('using invalid member in keysgroup should fail', function (done) {
				var memberAccount1 = node.randomAccount();
				var memberAccount2 = node.randomAccount();

				var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey + 'A', '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

				postTransaction(multiSigTx, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
					done();
				});
			});
		});
	});
});
