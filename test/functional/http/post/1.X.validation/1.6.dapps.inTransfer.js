'use strict';

var test = require('../../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var shared = require('../../../shared');
var localShared = require('./shared');

var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var normalizer = require('../../../../common/utils/normalizer');
var waitFor = require('../../../../common/utils/waitFor');

describe('POST /api/transactions (validate type 6 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localShared.beforeValidationPhase(account);

	describe('registering dapp', function () {

		it('using second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.dapp.createDapp(account.password, account.secondPassword, randomUtil.blockDataDapp);

			return apiHelpers.sendTransactionPromise(transaction)
				.then(function (res) {
					expect(res).to.have.property('status').to.equal(200);
					expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
					randomUtil.blockDataDapp.transactionId = transaction.id;

					return waitFor.confirmations([randomUtil.blockDataDapp.transactionId]);
				});
		});
	});

	describe('inTransfer', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.blockDataDapp.transactionId, 10 * normalizer, account.password);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.blockDataDapp.transactionId, 10 * normalizer, account.password, 'wrong second password');

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.blockDataDapp.transactionId, 10 * normalizer, account.password, account.secondPassword);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
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
