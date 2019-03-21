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

require('../../functional');
const {
	transfer,
	registerSecondPassphrase,
} = require('@liskhq/lisk-transactions');
const Promise = require('bluebird');
const phases = require('../../../common/phases');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');

const { FEES, NORMALIZER } = global.constants;

describe('POST /api/transactions (type 1) register second passphrase', () => {
	let transaction;
	const transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];

	const account = randomUtil.account();
	const accountNoFunds = randomUtil.account();
	const accountMinimalFunds = randomUtil.account();
	const accountNoSecondPassphrase = randomUtil.account();

	// Crediting accounts
	before(() => {
		const transaction1 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		const transaction2 = transfer({
			amount: FEES.SECOND_SIGNATURE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		const transaction3 = transfer({
			amount: FEES.SECOND_SIGNATURE,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountNoSecondPassphrase.address,
		});

		const promises = [];
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
		it('using second passphrase on a fresh account should fail', async () => {
			transaction = transfer({
				amount: '1',
				passphrase: accountNoSecondPassphrase.passphrase,
				secondPassphrase: accountNoSecondPassphrase.secondPassphrase,
				recipientId: accountFixtures.existingDelegate.address,
			});

			return apiHelpers
				.sendTransactionPromise(transaction, apiCodes.PROCESSING_ERROR)
				.then(res => {
					expect(res.body.message).to.be.equal(
						'Sender does not have a second signature'
					);
					badTransactions.push(transaction);
				});
		});

		it('with no funds should fail', async () => {
			transaction = registerSecondPassphrase({
				passphrase: accountNoFunds.passphrase,
				secondPassphrase: accountNoFunds.secondPassphrase,
			});

			return apiHelpers
				.sendTransactionPromise(transaction, apiCodes.PROCESSING_ERROR)
				.then(res => {
					expect(res.body.message).to.be.equal(
						`Account does not have enough LSK: ${
							accountNoFunds.address
						} balance: 0`
					);
					badTransactions.push(transaction);
				});
		});

		it('with minimal required amount of funds should be ok', async () => {
			transaction = registerSecondPassphrase({
				passphrase: accountMinimalFunds.passphrase,
				secondPassphrase: accountMinimalFunds.secondPassphrase,
				timeOffset: -10000,
			});

			return apiHelpers.sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', async () => {
			transaction = registerSecondPassphrase({
				passphrase: account.passphrase,
				secondPassphrase: account.secondPassphrase,
			});

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
