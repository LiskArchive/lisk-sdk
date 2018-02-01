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

var accountFixtures = require('../../../fixtures/accounts');

var typesRepresentatives = require('../../../fixtures/types_representatives');

var phases = require('../../common/phases');
var sendTransactionPromise = require('../../../common/helpers/api')
	.sendTransactionPromise;
var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var errorCodes = require('../../../../helpers/api_codes');

describe('POST /api/transactions (type 0) transfer funds', () => {
	var transaction;
	var goodTransaction = randomUtil.transaction();
	var badTransactions = [];
	var goodTransactions = [];
	// Low-frills deep copy
	var cloneGoodTransaction = JSON.parse(JSON.stringify(goodTransaction));

	var account = randomUtil.account();
	var accountOffset = randomUtil.account();

	describe('schema validations', () => {
		typesRepresentatives.allTypes.forEach(test => {
			it(`using ${test.description} should fail`, () => {
				return sendTransactionPromise(test.input, 400).then(res => {
					expect(res).to.have.nested.property('body.message').that.is.not.empty;
				});
			});
		});
	});

	describe('transaction processing', () => {
		it('mutating data used to build the transaction id should fail', () => {
			transaction = randomUtil.transaction();
			transaction.timestamp += 1;

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Invalid transaction id');
				badTransactions.push(transaction);
			});
		});

		it('using zero amount should fail', () => {
			transaction = lisk.transaction.createTransaction(
				account.address,
				0,
				accountFixtures.genesis.password
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal('Invalid transaction amount');
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', () => {
			transaction = lisk.transaction.createTransaction(
				'1L',
				1,
				account.password
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Account does not have enough LSK: ${account.address} balance: 0`
				);
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', () => {
			transaction = lisk.transaction.createTransaction(
				account.address,
				Math.floor(accountFixtures.genesis.balance),
				accountFixtures.genesis.password
			);

			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.match(
					/^Account does not have enough LSK: [0-9]+L balance: /
				);
				badTransactions.push(transaction);
			});
		});

		it('from the genesis account should fail', () => {
			var signedTransactionFromGenesis = {
				type: 0,
				amount: 1000,
				senderPublicKey:
					'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
				requesterPublicKey: null,
				timestamp: 24259352,
				asset: {},
				recipientId: accountFixtures.existingDelegate.address,
				signature:
					'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
				fee: 0.1 * normalizer,
			};

			return sendTransactionPromise(
				signedTransactionFromGenesis,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Invalid sender. Can not send from genesis account'
				);
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('when sender has funds should be ok', () => {
			return sendTransactionPromise(goodTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', () => {
			return sendTransactionPromise(
				goodTransaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction is already processed: ${goodTransaction.id}`
				);
			});
		});

		it('sending transaction with same id twice but newer timestamp should fail', () => {
			cloneGoodTransaction.timestamp += 1;

			return sendTransactionPromise(
				cloneGoodTransaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction is already processed: ${cloneGoodTransaction.id}`
				);
			});
		});

		it('sending transaction with same id twice but older timestamp should fail', () => {
			cloneGoodTransaction.timestamp -= 1;

			return sendTransactionPromise(
				cloneGoodTransaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction is already processed: ${cloneGoodTransaction.id}`
				);
			});
		});

		describe('with offset', () => {
			it('using -10000 should be ok', () => {
				transaction = lisk.transaction.createTransaction(
					accountOffset.address,
					1,
					accountFixtures.genesis.password,
					null,
					null,
					-10000
				);

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('using future timestamp should fail', () => {
				transaction = lisk.transaction.createTransaction(
					accountOffset.address,
					1,
					accountFixtures.genesis.password,
					null,
					null,
					10000
				);

				return sendTransactionPromise(
					transaction,
					errorCodes.PROCESSING_ERROR
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Invalid transaction timestamp. Timestamp is in the future'
					);
					badTransactions.push(transaction);
				});
			});
		});

		describe('with additional data field', () => {
			describe('invalid cases', () => {
				var invalidCases = typesRepresentatives.additionalDataInvalidCases.concat(
					typesRepresentatives.nonStrings
				);

				invalidCases.forEach(test => {
					it(`using ${test.description} should fail`, () => {
						var accountAdditionalData = randomUtil.account();
						transaction = lisk.transaction.createTransaction(
							accountAdditionalData.address,
							1,
							accountFixtures.genesis.password
						);
						transaction.asset.data = test.input;

						return sendTransactionPromise(
							transaction,
							errorCodes.PROCESSING_ERROR
						).then(res => {
							expect(res.body.message).to.not.be.empty;
							badTransactions.push(transaction);
						});
					});
				});
			});

			describe('valid cases', () => {
				var validCases = typesRepresentatives.additionalDataValidCases.concat(
					typesRepresentatives.strings
				);

				validCases.forEach(test => {
					it(`using ${test.description} should be ok`, () => {
						var accountAdditionalData = randomUtil.account();
						transaction = lisk.transaction.createTransaction(
							accountAdditionalData.address,
							1,
							accountFixtures.genesis.password,
							null,
							test.input
						);

						return sendTransactionPromise(transaction).then(res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted'
							);
							goodTransactions.push(transaction);
						});
					});
				});
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', () => {
		it('sending already confirmed transaction should fail', () => {
			return sendTransactionPromise(
				goodTransaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction is already confirmed: ${goodTransaction.id}`
				);
			});
		});
	});
});
