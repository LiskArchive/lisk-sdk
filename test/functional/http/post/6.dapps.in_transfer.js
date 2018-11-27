/* eslint-disable mocha/no-skipped-tests */
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
var lisk = require('lisk-elements').default;
var Promise = require('bluebird');
var phases = require('../../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');
var Bignum = require('../../../../helpers/bignum.js');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var apiHelpers = require('../../../common/helpers/api');
var errorCodes = require('../../../../helpers/api_codes');
var common = require('./common');

const { FEES, NORMALIZER } = global.constants;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 6) inTransfer dapp', () => {
	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();

	// Crediting accounts
	before(() => {
		var transaction1 = lisk.transaction.transfer({
			amount: 1000 * NORMALIZER,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		var transaction2 = lisk.transaction.transfer({
			amount: FEES.DAPP_REGISTRATION,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: accountMinimalFunds.address,
		});
		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));

		return Promise.all(promises)
			.then(results => {
				results.forEach(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);

				return waitFor.confirmations(transactionsToWaitFor);
			})
			.then(() => {
				transaction = lisk.transaction.createDapp({
					passphrase: account.passphrase,
					options: randomUtil.guestbookDapp,
				});

				return sendTransactionPromise(transaction);
			})
			.then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				transaction = lisk.transaction.createDapp({
					passphrase: accountMinimalFunds.passphrase,
					options: randomUtil.blockDataDapp,
				});

				return sendTransactionPromise(transaction);
			})
			.then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				randomUtil.blockDataDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.blockDataDapp.id);

				return waitFor.confirmations(transactionsToWaitFor);
			});
	});

	describe.skip('schema validations', () => {
		common.invalidAssets('inTransfer', badTransactions);

		describe('dappId', () => {
			it('without should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.passphrase
				);
				delete transaction.asset.inTransfer.dappId;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate inTransfer schema: Missing required property: dappId'
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.passphrase
				);
				transaction.asset.inTransfer.dappId = 1;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type integer'
					);
					badTransactions.push(transaction);
				});
			});

			it('with number should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.passphrase
				);
				transaction.asset.inTransfer.dappId = 1.2;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type number, Object didn't pass validation for format id: 1.2"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty array should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.passphrase
				);
				transaction.asset.inTransfer.dappId = [];

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type array'
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty object should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.passphrase
				);
				transaction.asset.inTransfer.dappId = {};

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate inTransfer schema: Expected type string but found type object, Object didn't pass validation for format id: {}"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					'',
					Date.now(),
					account.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate inTransfer schema: String is too short (0 chars), minimum 1'
					);
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', () => {
				var invalidDappId = '1L';
				transaction = lisk.transfer.createInTransfer(
					invalidDappId,
					1,
					accountFixtures.genesis.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate inTransfer schema: Object didn't pass validation for format id: ${invalidDappId}`
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('amount', () => {
			it('using < 0 should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					-1,
					accountFixtures.genesis.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum 0'
					);
					badTransactions.push(transaction);
				});
			});

			it('using > balance should fail', () => {
				return apiHelpers
					.getAccountsPromise(`address=${account.address}`)
					.then(res => {
						expect(res.body)
							.to.have.nested.property('data')
							.to.have.lengthOf(1);

						var balance = res.body.data[0].balance;
						var amount = new Bignum(balance).plus('1').toString();
						transaction = lisk.transfer.createInTransfer(
							randomUtil.guestbookDapp.id,
							amount,
							account.passphrase
						);

						return sendTransactionPromise(
							transaction,
							errorCodes.PROCESSING_ERROR
						);
					})
					.then(res => {
						expect(res.body.message).to.match(
							/^Account does not have enough LSK: /
						);
						badTransactions.push(transaction);
					});
			});
		});
	});

	describe.skip('transactions processing', () => {
		it('using unknown dapp id should fail', () => {
			var unknownDappId = '1';
			transaction = lisk.transfer.createInTransfer(
				unknownDappId,
				1,
				accountFixtures.genesis.passphrase
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Application not found: ${unknownDappId}`
				);
				badTransactions.push(transaction);
			});
		});

		it('using valid but inexistent transaction id as dapp id should fail', () => {
			var inexistentId = randomUtil.transaction().id;
			transaction = lisk.transfer.createInTransfer(
				inexistentId,
				1,
				account.passphrase
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Application not found: ${inexistentId}`
				);
				badTransactions.push(transaction);
			});
		});

		it('using unrelated transaction id as dapp id should fail', () => {
			transaction = lisk.transfer.createInTransfer(
				transactionsToWaitFor[0],
				1,
				accountFixtures.genesis.passphrase
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Application not found: ${transactionsToWaitFor[0]}`
				);
				badTransactions.push(transaction);
			});
		});

		it('with correct data should be ok', () => {
			transaction = lisk.transfer.createInTransfer(
				randomUtil.guestbookDapp.id,
				10 * NORMALIZER,
				accountFixtures.genesis.passphrase
			);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		describe('from the author itself', () => {
			it('with minimal funds should fail', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.blockDataDapp.id,
					1,
					accountMinimalFunds.passphrase
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.match(
						/^Account does not have enough LSK: /
					);
					badTransactions.push(transaction);
				});
			});

			it('with enough funds should be ok', () => {
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					10 * NORMALIZER,
					account.passphrase
				);

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});
	});

	describe.skip('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('check frozen type', () => {
		it('transaction should be rejected', () => {
			transaction = {
				amount: '100000000',
				recipientId: '',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 60731530,
				type: 6,
				fee: '10000000',
				asset: { inTransfer: { dappId: '7670083247477258129' } },
				signature:
					'0845ea4121c868d11f04397fc8e2af518c530f0b1c0cfb0009da2bd688a58711146068b35eed70d55e89714ace1b8ec350c25178e5c4cc016ff517a76ded3f00',
				id: '10457544900900787263',
			};

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction type ${transaction.type} is frozen`
				);
			});
		});
	});
});
