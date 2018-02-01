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

require('../../functional.js');
var lisk = require('lisk-js');
var Promise = require('bluebird');

var common = require('./common');
var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var normalizer = require('../../../common/utils/normalizer');
var errorCodes = require('../../../../helpers/api_codes');

describe('POST /api/transactions (type 1) register second secret', () => {
	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountNoFunds = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();
	var accountNoSecondPassword = randomUtil.account();

	// Crediting accounts
	before(() => {
		var transaction1 = lisk.transaction.createTransaction(
			account.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);
		var transaction2 = lisk.transaction.createTransaction(
			accountMinimalFunds.address,
			constants.fees.secondSignature,
			accountFixtures.genesis.password
		);
		var transaction3 = lisk.transaction.createTransaction(
			accountNoSecondPassword.address,
			constants.fees.secondSignature,
			accountFixtures.genesis.password
		);

		var promises = [];
		promises.push(apiHelpers.sendTransactionPromise(transaction1));
		promises.push(apiHelpers.sendTransactionPromise(transaction2));
		promises.push(apiHelpers.sendTransactionPromise(transaction3));

		return Promise.all(promises).then(results => {
			results.forEach(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
			});

			transactionsToWaitFor.push(
				transaction1.id,
				transaction2.id,
				transaction3.id
			);
			return waitFor.confirmations(transactionsToWaitFor);
		});
	});

	describe('schema validations', () => {
		common.invalidAssets('signature', badTransactions);
	});

	describe('transactions processing', () => {
		it('using second passphrase on a fresh account should fail', () => {
			transaction = lisk.transaction.createTransaction(
				accountFixtures.existingDelegate.address,
				1,
				accountNoSecondPassword.password,
				accountNoSecondPassword.secondPassword
			);

			return apiHelpers
				.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR)
				.then(res => {
					expect(res.body.message).to.be.equal(
						'Sender does not have a second signature'
					);
					badTransactions.push(transaction);
				});
		});

		it('with no funds should fail', () => {
			transaction = lisk.signature.createSignature(
				accountNoFunds.password,
				accountNoFunds.secondPassword
			);

			return apiHelpers
				.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR)
				.then(res => {
					expect(res.body.message).to.be.equal(
						`Account does not have enough LSK: ${
							accountNoFunds.address
						} balance: 0`
					);
					badTransactions.push(transaction);
				});
		});

		it('with minimal required amount of funds should be ok', () => {
			transaction = lisk.signature.createSignature(
				accountMinimalFunds.password,
				accountMinimalFunds.secondPassword,
				-10000
			);

			return apiHelpers.sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', () => {
			transaction = lisk.signature.createSignature(
				account.password,
				account.secondPassword
			);

			return apiHelpers.sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});
});
