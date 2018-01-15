/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var lisk = require('lisk-js');
var Promise = require('bluebird');

var common = require('./common');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');
var bignum = require('../../../../helpers/bignum.js');

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');
var apiHelpers = require('../../../common/helpers/api');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (type 6) inTransfer dapp', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();

	// Crediting accounts
	before(function () {
		var transaction1 = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
		var transaction2 = lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.dappRegistration, accountFixtures.genesis.password);
		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));

		return Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);

				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				transaction = lisk.dapp.createDapp(accountMinimalFunds.password, null, randomUtil.blockDataDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');

				randomUtil.blockDataDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.blockDataDapp.id);

				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		common.invalidAssets('inTransfer', badTransactions);

		describe('dappId', function () {

			it('without should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				delete transaction.asset.inTransfer.dappId;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Missing required property: dappId');
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				transaction.asset.inTransfer.dappId = 1;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with number should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				transaction.asset.inTransfer.dappId = 1.2;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type number, Object didn\'t pass validation for format id: 1.2');
					badTransactions.push(transaction);
				});
			});

			it('with empty array should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				transaction.asset.inTransfer.dappId = [];

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type array');
					badTransactions.push(transaction);
				});
			});

			it('with empty object should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				transaction.asset.inTransfer.dappId = {};

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type object, Object didn\'t pass validation for format id: {}');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', function () {
				transaction = lisk.transfer.createInTransfer('', Date.now(), account.password);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: String is too short (0 chars), minimum 1');
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', function () {
				var invalidDappId = '1L';
				transaction = lisk.transfer.createInTransfer(invalidDappId, 1, accountFixtures.genesis.password);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate inTransfer schema: Object didn\'t pass validation for format id: ' + invalidDappId);
					badTransactions.push(transaction);
				});
			});
		});

		describe('amount', function () {

			it('using < 0 should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, -1, accountFixtures.genesis.password);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum 0');
					badTransactions.push(transaction);
				});
			});

			it('using > balance should fail', function () {
				return apiHelpers.getAccountsPromise('address=' + account.address)
					.then(function (res) {
						expect(res.body).to.have.nested.property('data').to.have.lengthOf(1);

						var balance = res.body.data[0].balance;
						var amount = new bignum(balance).plus('1').toNumber();
						transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, amount, account.password);

						return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR);
					})
					.then(function (res) {
						res.body.message.should.match(/^Account does not have enough LSK: /);
						badTransactions.push(transaction);
					});
			});
		});
	});

	describe('transactions processing', function () {

		it('using unknown dapp id should fail', function () {
			var unknownDappId = '1';
			transaction = lisk.transfer.createInTransfer(unknownDappId, 1, accountFixtures.genesis.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Application not found: ' + unknownDappId);
				badTransactions.push(transaction);
			});
		});

		it('using valid but inexistent transaction id as dapp id should fail', function () {
			var inexistentId = randomUtil.transaction().id;
			transaction = lisk.transfer.createInTransfer(inexistentId, 1, account.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Application not found: ' + inexistentId);
				badTransactions.push(transaction);
			});
		});

		it('using unrelated transaction id as dapp id should fail', function () {
			transaction = lisk.transfer.createInTransfer(transactionsToWaitFor[0], 1, accountFixtures.genesis.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Application not found: ' + transactionsToWaitFor[0]);
				badTransactions.push(transaction);
			});
		});

		it('with correct data should be ok', function () {
			transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, 10 * normalizer, accountFixtures.genesis.password);

			return sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		describe('from the author itself', function (){

			it('with minimal funds should fail', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.blockDataDapp.id, 1, accountMinimalFunds.password);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.match(/^Account does not have enough LSK: /);
					badTransactions.push(transaction);
				});
			});

			it('with enough funds should be ok', function () {
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, 10 * normalizer, account.password);

				return sendTransactionPromise(transaction).then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
