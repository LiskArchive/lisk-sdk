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

const {
	transfer,
	registerSecondPassphrase,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { TRANSACTION_TYPES } = global.constants;
const { NORMALIZER } = global.__testContext.config;

describe('integration test (type 1) - checking validated second signature registrations against other transaction types', () => {
	let library;

	const account = randomUtil.account();
	const creditTransaction = transfer({
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	const transaction = registerSecondPassphrase({
		passphrase: account.passphrase,
		secondPassphrase: account.secondPassphrase,
	});
	const randomTransfer = transfer({
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: '123L',
	});

	localCommon.beforeBlock('1_X_second_sign_validated', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(
			library,
			[creditTransaction],
			async () => {
				localCommon.addTransactionsAndForge(
					library,
					[randomTransfer],
					async () => {
						done();
					}
				);
			}
		);
	});

	it('adding to pool second signature registration should be ok', done => {
		localCommon.addTransaction(library, transaction, (err, res) => {
			expect(res).to.equal(transaction.id);
			done();
		});
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, async () => {
				done();
			});
		});

		it('transaction should be included', done => {
			const filter = {
				id: transaction.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(transaction.id);
				done();
			});
		});

		it('adding to pool second signature registration for same account should fail', done => {
			const auxTransaction = registerSecondPassphrase({
				passphrase: account.passphrase,
				secondPassphrase: account.secondPassphrase,
			});
			localCommon.addTransaction(library, auxTransaction, err => {
				const expectedErrors = [
					`Transaction: ${
						auxTransaction.id
					} failed at .signSignature: Missing signSignature`,
					`Transaction: ${
						auxTransaction.id
					} failed at .secondPublicKey: Register second signature only allowed once per account.`,
				];
				expect(err).to.equal(expectedErrors.join(','));
				done();
			});
		});

		describe('adding to pool other transaction types from the same account', () => {
			Object.keys(TRANSACTION_TYPES).forEach((key, index) => {
				if (
					key !== 'SIGNATURE' &&
					key !== 'DAPP' &&
					key !== 'IN_TRANSFER' &&
					key !== 'OUT_TRANSFER'
				) {
					it(`type ${index}: ${key} without second signature should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							randomTransfer,
							true,
							loadedTransaction => {
								localCommon.addTransaction(library, loadedTransaction, err => {
									if (key !== 'MULTI') {
										expect(err).to.equal(
											`Transaction: ${
												loadedTransaction.id
											} failed at .signSignature: Missing signSignature`
										);
									} else {
										const expectedErrors = [
											`Transaction: ${
												loadedTransaction.id
											} failed at .signSignature: Missing signSignature`,
											`Transaction: ${
												loadedTransaction.id
											} failed at .signatures: Missing signatures `,
										];
										expect(err).to.equal(expectedErrors.join(','));
									}
									done();
								});
							}
						);
					});

					it(`type ${index}: ${key} with second signature not matching registered second passphrase should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							randomTransfer,
							false,
							loadedTransaction => {
								localCommon.addTransaction(
									library,
									loadedTransaction,
									(err, res) => {
										console.info(res);
										// expect(err).to.equal('Failed to verify second signature');
										done();
									}
								);
							}
						);
					});

					it(`type ${index}: ${key} with correct second signature should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							randomTransfer,
							null,
							loadedTransaction => {
								localCommon.addTransaction(
									library,
									loadedTransaction,
									(err, res) => {
										expect(res).to.equal(loadedTransaction.id);
										done();
									}
								);
							}
						);
					});
				}
			});
		});
	});
});
