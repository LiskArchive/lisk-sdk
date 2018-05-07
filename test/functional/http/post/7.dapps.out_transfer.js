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
var lisk = require('lisk-js').default;
var Promise = require('bluebird');
var accountFixtures = require('../../../fixtures/accounts');
var phases = require('../../common/phases');
var constants = require('../../../../helpers/constants');
var bignum = require('../../../../helpers/bignum.js');
var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/wait_for');
var elements = require('../../../common/utils/elements');
var apiHelpers = require('../../../common/helpers/api');
var errorCodes = require('../../../../helpers/api_codes');
var common = require('./common');

var sendTransactionPromise = apiHelpers.sendTransactionPromise;

describe('POST /api/transactions (type 7) outTransfer dapp', () => {
	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];

	var account = randomUtil.account();
	var accountMinimalFunds = randomUtil.account();

	// Crediting accounts
	before(() => {
		var transaction1 = lisk.transaction.transfer({
			amount: 1000 * constants.normalizer,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: account.address,
		});
		var transaction2 = lisk.transaction.transfer({
			amount: constants.fees.dappRegistration,
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
					passphrase: account.password,
					options: randomUtil.guestbookDapp,
				});

				return sendTransactionPromise(transaction);
			})
			.then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');

				randomUtil.guestbookDapp.id = transaction.id;
				transactionsToWaitFor.push(randomUtil.guestbookDapp.id);
				transaction = lisk.transaction.createDapp({
					passphrase: accountMinimalFunds.password,
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
		common.invalidAssets('outTransfer', badTransactions);

		describe('dappId', () => {
			it('without should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				delete transaction.asset.outTransfer.dappId;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Missing required property: dappId'
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.dappId = 1;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type integer'
					);
					badTransactions.push(transaction);
				});
			});

			it('with number should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.dappId = 1.2;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type number, Object didn't pass validation for format id: 1.2"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty array should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.dappId = [];

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type array'
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty object should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.dappId = {};

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type object, Object didn't pass validation for format id: {}"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					'',
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: String is too short (0 chars), minimum 1'
					);
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', () => {
				var invalidDappId = '1L';
				transaction = lisk.transfer.createOutTransfer(
					invalidDappId,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate outTransfer schema: Object didn't pass validation for format id: ${invalidDappId}`
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('transactionId', () => {
			it('without should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				delete transaction.asset.outTransfer.transactionId;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Missing required property: transactionId'
					);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.transactionId = 1;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type integer'
					);
					badTransactions.push(transaction);
				});
			});

			it('with number should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.transactionId = 1.2;

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type number, Object didn't pass validation for format id: 1.2"
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty array should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.transactionId = [];

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type array'
					);
					badTransactions.push(transaction);
				});
			});

			it('with empty object should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.asset.outTransfer.transactionId = {};

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						"Invalid transaction body - Failed to validate outTransfer schema: Expected type string but found type object, Object didn't pass validation for format id: {}"
					);
					badTransactions.push(transaction);
				});
			});

			it('empty string should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					'',
					accountFixtures.genesis.address,
					1,
					account.password
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction body - Failed to validate outTransfer schema: String is too short (0 chars), minimum 1'
					);
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', () => {
				var invalidTransactionId = '1L';
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					invalidTransactionId,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						`Invalid transaction body - Failed to validate outTransfer schema: Object didn't pass validation for format id: ${invalidTransactionId}`
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('recipientId', () => {
			it('with integer should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.recipientId = 1;

				return sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(
					() => {
						badTransactions.push(transaction);
					}
				);
			});

			it('with number should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.recipientId = 1.2;

				return sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(
					() => {
						badTransactions.push(transaction);
					}
				);
			});

			it('with empty array should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.recipientId = [];

				return sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(
					() => {
						badTransactions.push(transaction);
					}
				);
			});

			it('with empty object should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					account.password
				);
				transaction.recipientId = {};

				return sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(
					() => {
						badTransactions.push(transaction);
					}
				);
			});

			it('empty string should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					'',
					1,
					account.password
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(() => {
					badTransactions.push(transaction);
				});
			});

			it('with invalid string should fail', () => {
				var invalidRecipientId = '1X';
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					invalidRecipientId,
					Date.now(),
					account.password
				);

				return sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(
					() => {
						badTransactions.push(transaction);
					}
				);
			});
		});

		describe('amount', () => {
			it('using < 0 should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					-1,
					account.password
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
				var params = [`address=${account.address}`];

				return apiHelpers
					.getAccountsPromise(params)
					.then(res => {
						expect(res.body)
							.to.have.nested.property('data')
							.to.have.lengthOf(1);

						var balance = res.body.data[0].balance;
						var amount = new bignum(balance).plus('1').toNumber();
						transaction = lisk.transfer.createOutTransfer(
							randomUtil.guestbookDapp.id,
							randomUtil.transaction().id,
							accountFixtures.genesis.address,
							amount,
							account.password
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
			transaction = lisk.transfer.createOutTransfer(
				unknownDappId,
				randomUtil.transaction().id,
				accountFixtures.genesis.address,
				1,
				account.password
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
			transaction = lisk.transfer.createOutTransfer(
				inexistentId,
				randomUtil.transaction().id,
				accountFixtures.genesis.address,
				1,
				account.password
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

		it('using unrelated existent transaction id as dapp id should fail', () => {
			transaction = lisk.transfer.createOutTransfer(
				transactionsToWaitFor[0],
				randomUtil.transaction().id,
				accountFixtures.genesis.address,
				1,
				account.password
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
			transaction = lisk.transfer.createOutTransfer(
				randomUtil.guestbookDapp.id,
				randomUtil.transaction().id,
				accountFixtures.genesis.address,
				10 * constants.normalizer,
				account.password
			);

			return sendTransactionPromise(transaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		describe('from the author itself', () => {
			it('with minimal funds should fail', () => {
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.blockDataDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					10 * constants.normalizer,
					accountMinimalFunds.password
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
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					10 * constants.normalizer,
					account.password
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
				recipientId: '16313739661670634666L',
				senderPublicKey:
					'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
				timestamp: 60731685,
				type: 7,
				fee: '10000000',
				asset: {
					outTransfer: {
						dappId: randomUtil.guestbookDapp.id,
						transactionId: '10457544900900787263',
					},
				},
			};

			transaction = elements.redoSignature(
				transaction,
				accountFixtures.genesis.passphrase
			);

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
