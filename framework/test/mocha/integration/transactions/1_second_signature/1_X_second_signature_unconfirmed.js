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

const {
	transfer,
	registerSecondPassphrase,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { TRANSACTION_TYPES } = global.constants;
const { NORMALIZER } = global.__testContext.config;

describe('integration test (type 1) - sending transactions on top of unconfirmed second signature', () => {
	let library;

	const account = randomUtil.account();
	const transaction = transfer({
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	let transactionWith;
	const transactionSecondSignature = registerSecondPassphrase({
		passphrase: account.passphrase,
		secondPassphrase: account.secondPassphrase,
	});

	localCommon.beforeBlock('1_X_second_sign_unconfirmed', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [transaction], async () => {
			localCommon.addTransactionsAndForge(library, [], async () => {
				done();
			});
		});
	});

	it('adding to pool second signature registration should be ok', done => {
		localCommon.addTransaction(
			library,
			transactionSecondSignature,
			(err, res) => {
				expect(res).to.equal(transactionSecondSignature.id);
				done();
			},
		);
	});

	describe('validating unconfirmed status while adding to pool other transaction types from same account', () => {
		describe('with second signature', () => {
			Object.keys(TRANSACTION_TYPES).forEach((key, index) => {
				if (key === 'DAPP' || key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				}
				if (key === 'SIGNATURE') {
					it(`type ${index}: ${key} should fail`, done => {
						localCommon.addTransaction(
							library,
							transactionSecondSignature,
							err => {
								expect(err).to.equal(
									`Transaction: ${
										transactionSecondSignature.id
									} failed at .id: Transaction is already processed: ${
										transactionSecondSignature.id
									}`,
								);
								done();
							},
						);
					});

					it(`type ${index}: ${key} with different timestamp should be ok`, done => {
						transactionWith = registerSecondPassphrase({
							passphrase: account.passphrase,
							secondPassphrase: account.secondPassphrase,
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transactionWith, (err, res) => {
							expect(res).to.equal(transactionWith.id);
							done();
						});
					});
				} else if (key === 'MULTI') {
					it(`type ${index}: ${key} should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							transaction,
							null,
							loadedTransaction => {
								localCommon.addTransaction(library, loadedTransaction, err => {
									const expectedErrors = [
										`Transaction: ${
											loadedTransaction.id
										} failed at .signSignature: Sender does not have a secondPublicKey`,
										`Transaction: ${
											loadedTransaction.id
										} failed at .signatures: Missing signatures `,
									];
									expect(err).to.equal(
										expectedErrors.join(','),
										// `Transaction: ${loadedTransaction.id} failed at .signSignature: Sender does not have a secondPublicKey`
									);
									done();
								});
							},
						);
					});
				} else {
					it(`type ${index}: ${key} should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							transaction,
							null,
							loadedTransaction => {
								localCommon.addTransaction(library, loadedTransaction, err => {
									expect(err).to.equal(
										`Transaction: ${
											loadedTransaction.id
										} failed at .signSignature: Sender does not have a secondPublicKey`,
									);
									done();
								});
							},
						);
					});
				}

				return true;
			});
		});

		describe('without second signature', () => {
			Object.keys(TRANSACTION_TYPES).forEach((key, index) => {
				if (key === 'DAPP' || key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				}
				if (key !== 'SIGNATURE') {
					it(`type ${index}: ${key} should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							transaction,
							true,
							loadedTransaction => {
								localCommon.addTransaction(
									library,
									loadedTransaction,
									(err, res) => {
										expect(res).to.equal(loadedTransaction.id);
										done();
									},
								);
							},
						);
					});
				}
				return true;
			});
		});
	});
});
