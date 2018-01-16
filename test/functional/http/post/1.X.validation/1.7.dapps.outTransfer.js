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

var phases = require('../../../common/phases');
var localCommon = require('./common');

var apiHelpers = require('../../../../common/helpers/api');
var randomUtil = require('../../../../common/utils/random');
var waitFor = require('../../../../common/utils/waitFor');
var normalizer = require('../../../../common/utils/normalizer');
var errorCodes = require('../../../../../helpers/apiCodes');

describe('POST /api/transactions (validate type 7 on top of type 1)', function () {

	var transaction;
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();

	localCommon.beforeValidationPhase(account);

	describe('registering dapp', function () {

		it('using second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.dapp.createDapp(account.password, account.secondPassword, randomUtil.blockDataDapp);

			return apiHelpers.sendTransactionPromise(transaction)
				.then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
					randomUtil.blockDataDapp.transactionId = transaction.id;

					return waitFor.confirmations([randomUtil.blockDataDapp.transactionId]);
				});
		});
	});

	describe('outTransfer', function () {

		it('using no second passphrase on an account with second passphrase enabled should fail', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password);

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Missing sender second signature');
				badTransactions.push(transaction);
			});
		});

		it('using second passphrase not matching registered secondPublicKey should fail', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password, 'wrong second password');

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Failed to verify second signature');
				badTransactions.push(transaction);
			});
		});

		it('using correct second passphrase should be ok', function () {
			transaction = lisk.transfer.createOutTransfer(randomUtil.blockDataDapp.transactionId, randomUtil.transaction().id, randomUtil.account().address, 10 * normalizer, account.password, account.secondPassword);

			return apiHelpers.sendTransactionPromise(transaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
