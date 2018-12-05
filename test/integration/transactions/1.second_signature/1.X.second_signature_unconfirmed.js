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

const lisk = require('lisk-elements').default;
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const transactionTypes = require('../../../../helpers/transaction_types.js');
const localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('system test (type 1) - sending transactions on top of unconfirmed second signature', () => {
	let library;

	const account = randomUtil.account();
	const transaction = lisk.transaction.transfer({
		amount: 1000 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	const dapp = randomUtil.application();
	const dappTransaction = lisk.transaction.createDapp({
		passphrase: account.passphrase,
		options: dapp,
	});
	dapp.id = dappTransaction.id;
	let transactionWith;
	const transactionSecondSignature = lisk.transaction.registerSecondPassphrase({
		passphrase: account.passphrase,
		secondPassphrase: account.secondPassphrase,
	});

	localCommon.beforeBlock('system_1_X_second_sign_unconfirmed', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [transaction], () => {
			localCommon.addTransactionsAndForge(library, [dappTransaction], () => {
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
			}
		);
	});

	describe('validating unconfirmed status while adding to pool other transaction types from same account', () => {
		describe('with second signature', () => {
			Object.keys(transactionTypes).forEach((key, index) => {
				if (key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				} else if (key === 'SIGNATURE') {
					it(`type ${index}: ${key} should fail`, done => {
						localCommon.addTransaction(
							library,
							transactionSecondSignature,
							err => {
								expect(err).to.equal(
									`Transaction is already processed: ${
										transactionSecondSignature.id
									}`
								);
								done();
							}
						);
					});

					it(`type ${index}: ${key} with different timestamp should be ok`, done => {
						transactionWith = lisk.transaction.registerSecondPassphrase({
							passphrase: account.passphrase,
							secondPassphrase: account.secondPassphrase,
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transactionWith, (err, res) => {
							expect(res).to.equal(transactionWith.id);
							done();
						});
					});
				} else {
					it(`type ${index}: ${key} should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							null,
							loadedTransaction => {
								localCommon.addTransaction(library, loadedTransaction, err => {
									expect(err).to.equal(
										'Sender does not have a second signature'
									);
									done();
								});
							}
						);
					});
				}

				return true;
			});
		});

		describe('without second signature', () => {
			Object.keys(transactionTypes).forEach((key, index) => {
				if (key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				} else if (key !== 'SIGNATURE') {
					it(`type ${index}: ${key} should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							true,
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
				return true;
			});
		});
	});
});
