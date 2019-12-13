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

const { transfer, registerDelegate } = require('@liskhq/lisk-transactions');
const async = require('async');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const { NORMALIZER } = global.__testContext.config;

describe('integration test (type 2) - double delegate registrations', () => {
	let library;
	localCommon.beforeBlock('2_2_delegates_4', lib => {
		library = lib;
	});

	let i = 0;
	let t = 0;

	/* eslint-disable no-loop-func */
	while (i < 30) {
		describe('executing 30 times', () => {
			const account = randomUtil.account();
			const account2 = randomUtil.account();
			let transaction1;
			let transaction2;
			const transaction = transfer({
				networkIdentifier,
				amount: (1000 * NORMALIZER).toString(),
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: account.address,
			});

			before(done => {
				console.info(`Iteration count: ${++t}`);
				localCommon.addTransactionsAndForge(
					library,
					[transaction],
					async () => {
						done();
					},
				);
			});

			describe('with two different accounts using different username', () => {
				before(done => {
					transaction1 = transfer({
						networkIdentifier,
						amount: (1000 * NORMALIZER).toString(),
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account.address,
					});
					transaction2 = transfer({
						networkIdentifier,
						amount: (1000 * NORMALIZER).toString(),
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account2.address,
					});
					localCommon.addTransactionsAndForge(
						library,
						[transaction1, transaction2],
						done,
					);
				});

				it('adding to pool delegate registration should be ok', done => {
					transaction1 = registerDelegate({
						networkIdentifier,
						passphrase: account.passphrase,
						username: account.username,
					});
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from different account and same username should be ok', done => {
					transaction2 = registerDelegate({
						networkIdentifier,
						passphrase: account2.passphrase,
						username: account2.username,
					});
					localCommon.addTransaction(library, transaction2, (err, res) => {
						expect(res).to.equal(transaction2.id);
						done();
					});
				});

				describe('after forging one block', () => {
					before(done => {
						localCommon.forge(library, async () => {
							done();
						});
					});

					it('both transactions should be included', done => {
						async.every(
							[transaction1, transaction2],
							(everyTransaction, callback) => {
								const filter = {
									id: everyTransaction.id,
								};

								localCommon.getTransactionFromModule(
									library,
									filter,
									(err, res) => {
										expect(err).to.be.null;
										expect(res)
											.to.have.property('transactions')
											.which.is.an('Array');
										expect(res.transactions.length).to.equal(1);
										expect(res.transactions[0].id).to.equal(
											everyTransaction.id,
										);
										callback(null, !err);
									},
								);
							},
							async () => {
								done();
							},
						);
					});

					it('adding to pool delegate registration with already registered username should fail', done => {
						const transaction3 = registerDelegate({
							networkIdentifier,
							passphrase: account2.passphrase,
							username: account2.username,
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transaction3, err => {
							const expectedErrors = [
								`Transaction: ${transaction3.id} failed at .asset.username: Username is not unique.`,
								`Transaction: ${transaction3.id} failed at .asset.username: Account is already a delegate`,
							];
							expect(err).to.equal(expectedErrors.join(','));
							done();
						});
					});
				});
			});
		});
		i++;
	}
	/* eslint-enable no-loop-func */
});
