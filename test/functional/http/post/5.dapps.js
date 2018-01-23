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

var randomstring = require('randomstring');
var lisk = require('lisk-js');
var Promise = require('bluebird');

var common = require('./common');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var apiCodes = require('../../../../helpers/apiCodes');
var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');
var apiHelpers = require('../../../common/helpers/api');
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (type 5) register dapp', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountNoFunds = randomUtil.account();
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
					expect(res).to.have.property('status').to.equal(200);
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);

				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		common.invalidAssets('dapp', badTransactions);

		describe('category', function () {

			it('without should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				delete transaction.asset.dapp.category;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Missing required property: category$/);
					badTransactions.push(transaction);
				});
			});

			it('with string should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.category = '0';

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.be.equal('Invalid transaction body - Failed to validate dapp schema: Expected type integer but found type string');
					badTransactions.push(transaction);
				});
			});

			it('with integer less than minimum should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.category = -1;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.category = 9;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Value 9 is greater than maximum 8$/);
					badTransactions.push(transaction);
				});
			});

			it('with correct integer should be ok', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});

		describe('description', function () {

			it('without should be ok', function () {
				var application = randomUtil.application();
				delete application.description;

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.description = 0;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.be.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', function () {
				var application = randomUtil.application();
				application.description = '';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', function () {
				var application = randomUtil.application();
				application.description = randomstring.generate({
					length: 161
				});
				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/String is too long \(161 chars\), maximum 160$/);
					badTransactions.push(transaction);
				});
			});
		});

		describe('icon', function () {

			it('without should be ok', function () {
				var application = randomUtil.application();
				delete application.icon;

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.icon = 0;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with invalid url should fail', function () {
				var application = randomUtil.application();
				application.icon = 'invalidUrl';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid application icon link');
					badTransactions.push(transaction);
				});
			});

			it('with invalid file type should fail', function () {
				var application = randomUtil.application();
				application.icon += '.invalid';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid application icon file type');
					badTransactions.push(transaction);
				});
			});
		});

		describe('link', function () {

			it('with empty string should fail', function () {
				var application = randomUtil.application();
				application.link = '';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid application link');
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.link = 0;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});


			it('with invalid extension type should fail', function () {
				var application = randomUtil.application();
				application.link += '.invalid';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid application file type');
					badTransactions.push(transaction);
				});
			});
		});

		describe('name', function () {

			it('without should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				delete transaction.asset.dapp.name;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Missing required property: name$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.name = 0;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.name = '';

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/String is too short \(0 chars\), minimum 1$/);
					badTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(32) should fail', function () {
				var application = randomUtil.application();
				application.name = randomstring.generate({
					length: 33
				});
				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/String is too long \(33 chars\), maximum 32$/);
					badTransactions.push(transaction);
				});
			});
		});

		describe('tags', function () {

			it('without should be ok', function () {
				var application = randomUtil.application();
				delete application.tags;

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.tags = 0;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', function () {
				var application = randomUtil.application();
				application.tags = '';

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', function () {
				var application = randomUtil.application();
				application.tags = randomstring.generate({
					length: 161
				});
				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/String is too long \(161 chars\), maximum 160$/);
					badTransactions.push(transaction);
				});
			});

			it('with several should be ok', function () {
				var application = randomUtil.application();
				application.tags += ',' + randomUtil.applicationName();

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with duplicate tag should be ok', function () {
				var application = randomUtil.application();
				var tag = application.tags;
				application.tags += ',' + tag;

				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Encountered duplicate tag: ' + tag + ' in application');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type', function () {

			it('without should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				delete transaction.asset.dapp.type;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Missing required property: type$/);
					badTransactions.push(transaction);
				});
			});

			it('with negative integer should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer smaller than minimum should fail', function () {
				transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', function () {
				var application = randomUtil.application();
				application.type = 2;
				transaction = lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					expect(res.body.message).to.equal('Invalid application type');
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', function () {

		it('using registered name should fail', function () {
			var dapp = randomUtil.application();
			dapp.name = randomUtil.guestbookDapp.name;
			transaction = lisk.dapp.createDapp(account.password, null, dapp);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				expect(res.body.message).to.equal('Application name already exists: ' + dapp.name);
				badTransactions.push(transaction);
			});
		});

		it('using registered link should fail', function () {
			var dapp = randomUtil.application();
			dapp.link = randomUtil.guestbookDapp.link;
			transaction = lisk.dapp.createDapp(account.password, null, dapp);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				expect(res.body.message).to.equal('Application link already exists: ' + dapp.link);
				badTransactions.push(transaction);
			});
		});

		it('with no funds should fail', function () {
			transaction = lisk.dapp.createDapp(accountNoFunds.password, null, randomUtil.application());

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				expect(res.body.message).to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal funds should be ok', function () {
			transaction = lisk.dapp.createDapp(accountMinimalFunds.password, null, randomUtil.application());

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', function () {
			transaction = lisk.dapp.createDapp(account.password, null, randomUtil.application());

			return sendTransactionPromise(transaction).then(function (res) {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
