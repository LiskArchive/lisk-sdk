'use strict';

require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;
var Promise = require('bluebird');

var test = require('../../../test');
var shared = require('../../shared');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');

describe('POST /api/transactions (type 1) register second secret', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountNoFunds = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();
	var accountNoSecondPassword = randomUtil.account();

	// Crediting accounts
	before(function () {
		var transaction1 = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
		var transaction2 = lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.secondSignature, accountFixtures.genesis.password);
		var transaction3 = lisk.transaction.createTransaction(accountNoSecondPassword.address, constants.fees.secondSignature, accountFixtures.genesis.password);

		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		promises.push(sendTransactionPromise(transaction3));

		return Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					expect(res).to.have.property('status').to.equal(200);
					expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id, transaction3.id);
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets('signature', badTransactions);
	});

	describe('transactions processing', function () {

		it('using second passphrase on a fresh account should fail', function () {
			transaction = lisk.transaction.createTransaction(accountFixtures.existingDelegate.address, 1, accountNoSecondPassword.password, accountNoSecondPassword.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Sender does not have a second signature');
				badTransactions.push(transaction);
			});
		});

		it('with no funds should fail', function () {
			transaction = lisk.signature.createSignature(accountNoFunds.password, accountNoFunds.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(400);
				expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal required amount of funds should be ok', function () {
			transaction = lisk.signature.createSignature(accountMinimalFunds.password, accountMinimalFunds.secondPassword, -1);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', function () {
			transaction = lisk.signature.createSignature(account.password, account.secondPassword);

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
