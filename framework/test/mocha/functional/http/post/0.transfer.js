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
const crypto = require('crypto');
const { transfer, TransferTransaction } = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const accountFixtures = require('../../../fixtures/accounts');
const typesRepresentatives = require('../../../fixtures/types_representatives');
const phases = require('../../../common/phases');
const sendTransactionPromise = require('../../../common/helpers/api')
	.sendTransactionPromise;
const randomUtil = require('../../../common/utils/random');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const specialChar = '❤';
const nullChar1 = '\0';
const nullChar2 = '\x00';
const nullChar3 = '\u0000';

describe('POST /api/transactions (type 0) transfer funds', () => {
	let transaction;
	const goodTransaction = randomUtil.transaction();
	const badTransactions = [];
	const goodTransactions = [];
	// Low-frills deep copy
	const cloneGoodTransaction = JSON.parse(JSON.stringify(goodTransaction));

	const account = randomUtil.account();
	const accountOffset = randomUtil.account();

	describe('schema validations', () => {
		typesRepresentatives.allTypes.forEach(test => {
			it(`using ${test.description} should fail`, async () => {
				return sendTransactionPromise(test.input, 400).then(res => {
					expect(res).to.have.nested.property('body.message').that.is.not.empty;
				});
			});
		});

		it('with lowercase recipientId should fail', async () => {
			transaction = randomUtil.transaction();
			transaction.asset.recipientId = transaction.asset.recipientId.toLowerCase();
			transaction.signature = crypto.randomBytes(64).toString('hex');

			return sendTransactionPromise(transaction, 400).then(res => {
				expect(res.body.message).to.be.equal('Validation errors');
				badTransactions.push(transaction);
			});
		});
	});

	describe('transaction processing', () => {
		it('with invalid signature should fail', async () => {
			transaction = randomUtil.transaction();
			transaction.signature = crypto.randomBytes(64).toString('hex');

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Failed to validate signature ${transaction.signature}`,
				);
				badTransactions.push(transaction);
			});
		});

		it('mutating data used to build the transaction id should fail', async () => {
			transaction = randomUtil.transaction();
			transaction.timestamp += 1;

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.eql('Transaction was rejected with errors');
				expect(res.body.code).to.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors).to.not.be.empty;
				badTransactions.push(transaction);
			});
		});

		it('using zero amount should fail', async () => {
			// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
			transaction = new TransferTransaction({
				networkIdentifier,
				asset: {
					amount: '0',
					recipientId: account.address,
				},
			});
			transaction.sign(accountFixtures.genesis.passphrase);

			return sendTransactionPromise(
				transaction.toJSON(),
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					'Amount must be a valid number in string format.',
				);
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', async () => {
			transaction = transfer({
				networkIdentifier,
				amount: '1',
				passphrase: account.passphrase,
				recipientId: '1L',
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Account does not have enough LSK: ${account.address}, balance: 0`,
				);
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', async () => {
			transaction = transfer({
				networkIdentifier,
				amount: accountFixtures.genesis.balance,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: account.address,
			});

			return sendTransactionPromise(
				transaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.include(
					'Account does not have enough LSK: 11237980039345381032L, balance: ',
				);
				badTransactions.push(transaction);
			});
		});

		// Skipping this test because this signature cannot be recreated with this genesis address
		// eslint-disable-next-line mocha/no-skipped-tests
		it.skip('from the genesis account should fail', async () => {
			const signedTransactionFromGenesis = {
				senderPublicKey:
					'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b',
				timestamp: 24259352,
				type: 8,
				asset: {
					amount: new BigNum('1000').toString(),
					recipientId: accountFixtures.existingDelegate.address,
				},
				signature:
					'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
			};

			return sendTransactionPromise(
				signedTransactionFromGenesis,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.include(
					'Account does not have enough LSK: 1276152240083265771L, balance: -',
				);
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('using network identifier from different network should fail', async () => {
			const networkIdentifierOtherNetwork =
				'91a254dc30db5eb1ce4001acde35fd5a14d62584f886d30df161e4e883220eb1';
			const transactionFromDifferentNetwork = new TransferTransaction({
				networkIdentifier: networkIdentifierOtherNetwork,
				asset: {
					amount: '1',
					recipientId: account.address,
				},
			});
			transactionFromDifferentNetwork.sign(accountFixtures.genesis.passphrase);

			return sendTransactionPromise(
				transactionFromDifferentNetwork.toJSON(),
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);

				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.include(
					`Failed to validate signature ${transactionFromDifferentNetwork.signature}`,
				);
				badTransactions.push(transactionFromDifferentNetwork);
			});
		});

		it('when sender has funds should be ok', async () => {
			return sendTransactionPromise(goodTransaction).then(res => {
				expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', async () => {
			return sendTransactionPromise(
				goodTransaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Transaction is already processed: ${goodTransaction.id}`,
				);
			});
		});

		it('sending transaction with same id twice but newer timestamp should fail', async () => {
			cloneGoodTransaction.timestamp += 1;

			return sendTransactionPromise(
				cloneGoodTransaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Failed to validate signature ${cloneGoodTransaction.signature}`,
				);
			});
		});

		it('sending transaction with same id twice but older timestamp should fail', async () => {
			cloneGoodTransaction.timestamp -= 1;

			return sendTransactionPromise(
				cloneGoodTransaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.equal(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Transaction is already processed: ${cloneGoodTransaction.id}`,
				);
			});
		});

		describe('with offset', () => {
			it('using -10000 should be ok', async () => {
				transaction = transfer({
					networkIdentifier,
					amount: '1',
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: accountOffset.address,
					timeOffset: -10000,
				});

				return sendTransactionPromise(transaction).then(res => {
					expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('using future timestamp should fail', async () => {
				transaction = transfer({
					networkIdentifier,
					amount: '1',
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: accountOffset.address,
					timeOffset: 10000,
				});

				return sendTransactionPromise(
					transaction,
					apiCodes.PROCESSING_ERROR,
				).then(res => {
					expect(res.body.message).to.be.equal(
						'Transaction was rejected with errors',
					);
					expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
					expect(res.body.errors[0].message).to.be.equal(
						'Invalid transaction timestamp. Timestamp is in the future',
					);
				});
			});
		});

		describe('with additional data field', () => {
			describe('invalid cases', () => {
				const invalidCases = typesRepresentatives.additionalDataInvalidCases.concat(
					typesRepresentatives.nonStrings,
				);

				invalidCases.forEach(test => {
					it(`using ${test.description} should fail`, async () => {
						const accountAdditionalData = randomUtil.account();
						transaction = transfer({
							networkIdentifier,
							amount: '1',
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: accountAdditionalData.address,
						});
						transaction.asset.data = test.input;
						return sendTransactionPromise(
							transaction,
							apiCodes.PROCESSING_ERROR,
						).then(res => {
							expect(res.body.message).to.be.equal(
								'Transaction was rejected with errors',
							);
							expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
							expect(res.body.errors[0].message).to.not.be.empty;
							badTransactions.push(transaction);
						});
					});
				});
			});

			describe('valid cases', () => {
				const validCases = typesRepresentatives.additionalDataValidCases.concat(
					typesRepresentatives.strings,
				);

				validCases.forEach(test => {
					it(`using ${test.description} should be ok`, async () => {
						const accountAdditionalData = randomUtil.account();
						transaction = transfer({
							networkIdentifier,
							amount: '1',
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: accountAdditionalData.address,
							data: test.input,
						});

						return sendTransactionPromise(transaction).then(res => {
							expect(res.body.data.message).to.be.equal(
								'Transaction(s) accepted',
							);
							goodTransactions.push(transaction);
						});
					});
				});

				it('using SQL characters escaped as single quote should be ok', async () => {
					const additioinalData = "'0'";
					const accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
						data: additioinalData,
					});

					return sendTransactionPromise(transaction).then(res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted',
						);
						goodTransactions.push(transaction);
					});
				});
			});

			describe('edge cases', () => {
				it('using specialChar should be ok', () => {
					const additioinalData = `${specialChar} hey \x01 :)`;
					const accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
						data: additioinalData,
					});

					return sendTransactionPromise(transaction).then(res => {
						expect(res.body.data.message).to.be.equal(
							'Transaction(s) accepted',
						);
						goodTransactions.push(transaction);
					});
				});

				it('using nullChar1 should fail', () => {
					const additioinalData = `${nullChar1} hey :)`;
					const accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
						data: additioinalData,
					});

					return sendTransactionPromise(
						transaction,
						apiCodes.PROCESSING_ERROR,
					).then(res => {
						expect(res.body.message).to.be.eql(
							'Transaction was rejected with errors',
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							'\'.data\' should match format "transferData"',
						);
						badTransactions.push(transaction);
					});
				});

				it('using nullChar2 should fail', () => {
					const additionalData = `${nullChar2} hey :)`;
					const accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
						data: additionalData,
					});

					return sendTransactionPromise(
						transaction,
						apiCodes.PROCESSING_ERROR,
					).then(res => {
						expect(res.body.message).to.be.eql(
							'Transaction was rejected with errors',
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							'\'.data\' should match format "transferData"',
						);
						badTransactions.push(transaction);
					});
				});

				it('using nullChar3 should fail', () => {
					const additioinalData = `${nullChar3} hey :)`;
					const accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
						data: additioinalData,
					});

					return sendTransactionPromise(
						transaction,
						apiCodes.PROCESSING_ERROR,
					).then(res => {
						expect(res.body.message).to.be.eql(
							'Transaction was rejected with errors',
						);
						expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
						expect(res.body.errors[0].message).to.be.equal(
							'\'.data\' should match format "transferData"',
						);
						badTransactions.push(transaction);
					});
				});
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', () => {
		it('sending already confirmed transaction should fail', async () => {
			return sendTransactionPromise(
				goodTransaction,
				apiCodes.PROCESSING_ERROR,
			).then(res => {
				expect(res.body.message).to.be.eql(
					'Transaction was rejected with errors',
				);
				expect(res.body.code).to.be.eql(apiCodes.PROCESSING_ERROR);
				expect(res.body.errors[0].message).to.be.equal(
					`Transaction is already confirmed: ${goodTransaction.id}`,
				);
			});
		});
	});
});
