'use strict';

require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;


var shared = require('../../../shared');
var localShared = require('./shared');
var accountFixtures = require('../../../../fixtures/accounts');

var swaggerEndpoint = require('../../../../common/swaggerSpec');
var apiHelpers = require('../../../../common/apiHelpers');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var createSignatureObject = apiHelpers.createSignatureObject;
var signatureEndpoint = new swaggerEndpoint('POST /signatures');

var randomUtil = require('../../../../common/utils/random');

describe('POST /api/transactions (validate type 4 on top of type 1)', function () {

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var account2 = randomUtil.account();
	var account3 = randomUtil.account();

	localShared.beforeValidationPhase(account);

	describe('creating multisig', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.multisignature.createMultisignature(account.password, null, ['+' + accountFixtures.existingDelegate.publicKey, '+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = lisk.multisignature.createMultisignature(account.password, 'wrong second password', ['+' + accountFixtures.existingDelegate.publicKey, '+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + account2.publicKey, '+' + account3.publicKey], 1, 2);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		});
	});

	describe('signing transaction', function () {

		it('with all the signatures should be ok', function () {
			signature = createSignatureObject(transaction, account2);

			return signatureEndpoint.makeRequest({signatures: [signature]}, 200).then(function (res) {
				res.body.meta.status.should.be.true;
				res.body.data.message.should.be.equal('Signature Accepted');

				signature = createSignatureObject(transaction, account3);

				return signatureEndpoint.makeRequest({signatures: [signature]}, 200);
			}).then(function (res) {
				res.body.meta.status.should.be.true;
				res.body.data.message.should.be.equal('Signature Accepted');

				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
