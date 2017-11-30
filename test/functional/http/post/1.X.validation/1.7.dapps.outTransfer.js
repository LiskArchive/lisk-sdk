'use strict';

require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;


var shared = require('../../../shared');
var localShared = require('./shared');

var sendTransactionPromise = require('../../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../../common/utils/random');
var normalizer = require('../../../../common/utils/normalizer');

describe('POST /api/transactions (validate type 7 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localShared.beforeValidationPhase(account);

	describe('registering dapp', function () {

		it('using second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.dapp.createDapp(account.password, account.secondPassword, randomUtil.blockDataDapp);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					expect(res).to.have.property('status').to.equal(200);
					expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
					randomUtil.blockDataDapp.transactionId = transaction.id;

					return waitForConfirmations([randomUtil.blockDataDapp.transactionId]);
				});
		});
	});

	describe('outTransfer', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password, 'wrong second password');

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password, account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
