/*
 * Copyright © 2019 Lisk Foundation
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
const Promise = require('bluebird');
const randomstring = require('randomstring');
const { transfer, createDapp } = require('@liskhq/lisk-transactions');
const phases = require('../../../common/phases');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const apiHelpers = require('../../../common/helpers/api');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const common = require('./common');

const { FEES } = global.constants;
const { NORMALIZER } = global.__testContext.config;
const sendTransactionPromise = apiHelpers.sendTransactionPromise;

// Dapp Transaction is not part of framework and can't be tested using test_app
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('POST /api/transactions (type 5) register dapp', () => {
	let transaction;
	const transactionsToWaitFor = [];
	const badTransactions = [];
	const goodTransactions = [];

	const account = randomUtil.account();
	const accountNoFunds = randomUtil.account();
	const accountMinimalFunds = randomUtil.account();

	const specialChar = '❤';
	const nullChar1 = '\0';
	const nullChar2 = '\x00';
	const nullChar3 = '\u0000';
	const nullChar4 = '\\U00000000';

	// Crediting accounts
	before(() => {
		const transaction1 = transfer({
			amount: (1000 * NORMALIZER).toString(),
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		const transaction2 = transfer({
			amount: FEES.DAPP_REGISTRATION,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		const promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));

		return Promise.all(promises)
			.then(results => {
				results.forEach(res => {
					expect(res)
						.to.have.property('status')
						.to.equal(200);
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);
				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(() => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.guestbookDapp,
				});

				return sendTransactionPromise(transaction);
			})
			.then(res => {
				expect(res)
					.to.have.property('status')
					.to.equal(200);
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', () => {
		common.invalidAssets('dapp', badTransactions);

		describe('category', () => {
			it('without should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				delete transaction.asset.dapp.category;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp' should have required property 'category'"
					);
					badTransactions.push(transaction);
				});
			});

			it('with string should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.category = '0';

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.category' should be integer"
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer less than minimum should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.category = -1;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.category' should be >= 0"
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.category = 9;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.category' should be <= 8"
					);
					badTransactions.push(transaction);
				});
			});

			it('with correct integer should be ok', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});

		describe('description', () => {
			it('without should be ok', async () => {
				const application = randomUtil.application();
				delete application.description;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.description = 0;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors).to.not.be.empty;
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', async () => {
				const application = randomUtil.application();
				application.description = '';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', async () => {
				const application = randomUtil.application();
				application.description = randomstring.generate({
					length: 161,
				});
				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.description' should NOT be longer than 160 characters"
					);
					badTransactions.push(transaction);
				});
			});

			it('with unicode special symbol should be ok', () => {
				const application = randomUtil.application();
				application.description = `Lorem ${specialChar} ipsum`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with nullChar1 should fail', () => {
				const application = randomUtil.application();
				application.description = `lorem${nullChar1} ipsum`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.description\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar2 should fail', () => {
				const application = randomUtil.application();
				application.description = `lorem${nullChar2} ipsum`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.description\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar3 should fail', () => {
				const application = randomUtil.application();
				application.description = `lorem${nullChar3} ipsum`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.description\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar4 should fail', () => {
				const application = randomUtil.application();
				application.description = `lorem${nullChar4}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.description\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('icon', () => {
			it('without should be ok', async () => {
				const application = randomUtil.application();
				delete application.icon;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.icon = 0;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors).to.not.be.empty;
					badTransactions.push(transaction);
				});
			});

			it('with invalid url should fail', async () => {
				const application = randomUtil.application();
				application.icon = 'invalidUrl';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.icon\' should match format "uri"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with invalid file type should fail', async () => {
				const application = randomUtil.application();
				application.icon += '.invalid';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'Dapp icon must have suffix of one of .png,.jpeg,.jpg'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('link', () => {
			it('with empty string should fail', async () => {
				const application = randomUtil.application();
				application.link = '';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.link\' should match format "uri"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.link = 0;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.link' should be string"
					);
					badTransactions.push(transaction);
				});
			});

			it('with invalid extension type should fail', async () => {
				const application = randomUtil.application();
				application.link += '.invalid';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'Dapp icon must have suffix .zip'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('name', () => {
			it('without should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				delete transaction.asset.dapp.name;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp' should have required property 'name'"
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.name = 0;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.name' should be string"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.name = '';

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.name' should NOT be shorter than 1 characters"
					);
					badTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(32) should fail', async () => {
				const application = randomUtil.application();
				application.name = randomstring.generate({
					length: 33,
				});
				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.name' should NOT be longer than 32 characters"
					);
					badTransactions.push(transaction);
				});
			});

			it('with unicode special symbol should be ok', () => {
				const application = randomUtil.application();
				// Add special charactr insuring the name is unique and isn't longer than maximun length
				application.name = specialChar + application.name.substring(2);

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with nullChar1 should fail', () => {
				const application = randomUtil.application();
				application.name = `lorem${nullChar1}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.name\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar2 should fail', () => {
				const application = randomUtil.application();
				application.name = `lorem${nullChar2}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.name\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar3 should fail', () => {
				const application = randomUtil.application();
				application.name = `lorem${nullChar3}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.name\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar4 should fail', () => {
				const application = randomUtil.application();
				application.name = `lorem${nullChar4}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.name\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('tags', () => {
			it('without should be ok', async () => {
				const application = randomUtil.application();
				delete application.tags;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.tags = 0;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors).to.not.be.empty;
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', async () => {
				const application = randomUtil.application();
				application.tags = '';

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', async () => {
				const application = randomUtil.application();
				application.tags = randomstring.generate({
					length: 161,
				});
				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.tags' should NOT be longer than 160 characters"
					);
					badTransactions.push(transaction);
				});
			});

			it('with several should be ok', async () => {
				const application = randomUtil.application();
				application.tags += `,${randomUtil.applicationName()}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with duplicate tag should fail', () => {
				const application = randomUtil.application();
				const tag = application.tags;
				application.tags += `,${tag}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'Dapp tags must have unique set'
					);
					badTransactions.push(transaction);
				});
			});

			it('with unicode special symbol should be ok', () => {
				const application = randomUtil.application();
				application.tags += `,${specialChar}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with nullChar1 should fail', () => {
				const application = randomUtil.application();
				application.tags += `,lorem${nullChar1}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.tags\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar2 should fail', () => {
				const application = randomUtil.application();
				application.tags += `,lorem${nullChar2}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.tags\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar3 should fail', () => {
				const application = randomUtil.application();
				application.tags += `,lorem${nullChar3}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.tags\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});

			it('with nullChar4 should fail', () => {
				const application = randomUtil.application();
				application.tags += `,lorem${nullChar4}`;

				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'\'.dapp.tags\' should match format "noNullByte"'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('type', () => {
			it('without should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				delete transaction.asset.dapp.type;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp' should have required property 'type'"
					);
					badTransactions.push(transaction);
				});
			});

			it('with negative integer should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.type' should be >= 0"
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer smaller than minimum should fail', async () => {
				transaction = createDapp({
					passphrase: account.passphrase,
					options: randomUtil.application(),
				});
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.type' should be >= 0"
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', async () => {
				const application = randomUtil.application();
				application.type = 2;
				transaction = createDapp({
					passphrase: account.passphrase,
					options: application,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors'
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						"'.dapp.type' should be <= 1"
					);
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', () => {
		it('using registered name should fail', async () => {
			const dapp = randomUtil.application();
			dapp.name = randomUtil.guestbookDapp.name;
			transaction = createDapp({
				passphrase: account.passphrase,
				options: dapp,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors'
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Application name already exists: ${randomUtil.guestbookDapp.name}`
				);
				badTransactions.push(transaction);
			});
		});

		it('using registered link should fail', async () => {
			const dapp = randomUtil.application();
			dapp.link = randomUtil.guestbookDapp.link;
			transaction = createDapp({
				passphrase: account.passphrase,
				options: dapp,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors'
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Application link already exists: ${randomUtil.guestbookDapp.link}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with no funds should fail', async () => {
			transaction = createDapp({
				passphrase: accountNoFunds.passphrase,
				options: randomUtil.application(),
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors'
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Account does not have enough LSK: ${
						accountNoFunds.address
					}, balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('with minimal funds should be ok', async () => {
			transaction = createDapp({
				passphrase: accountMinimalFunds.passphrase,
				options: randomUtil.application(),
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', async () => {
			transaction = createDapp({
				passphrase: account.passphrase,
				options: randomUtil.application(),
			});

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});
});
