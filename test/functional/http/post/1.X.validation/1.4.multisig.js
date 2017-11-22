'use strict';

var node = require('../../../../node');
var shared = require('../../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var sendSignaturePromise = require('../../../../common/apiHelpers').sendSignaturePromise;

describe('POST /api/transactions (type 4 on top of type 1)', function () {

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();
	var account2 = node.randomAccount();
	var account3 = node.randomAccount();

	localShared.beforeValidationPhase(account);

	describe('creating multisig', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey, '+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = node.lisk.multisignature.createMultisignature(account.password, 'wrong second password', ['+' + node.eAccount.publicKey, '+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = node.lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		});
	});

	describe('signing transaction', function () {

		it('with all the signatures should be ok', function () {
			signature = node.lisk.multisignature.signTransaction(transaction, account2.password);

			return sendSignaturePromise(signature, transaction)
				.then(function (res) {
					node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');

					signature = node.lisk.multisignature.signTransaction(transaction, account3.password);

					return sendSignaturePromise(signature, transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.nested.property('body.status').to.equal('Signature Accepted');

					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
