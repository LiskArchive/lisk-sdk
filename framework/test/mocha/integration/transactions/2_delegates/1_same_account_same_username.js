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

const { transfer, registerDelegate } = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('integration test (type 2) - double delegate registrations', () => {
	let library;
	localCommon.beforeBlock('2_2_delegates_1', lib => {
		library = lib;
	});

	let i = 0;
	let t = 0;

	/* eslint-disable no-loop-func */
	while (i < 30) {
		describe('executing 30 times', () => {
			let transaction1;
			let transaction2;
			const account = randomUtil.account();
			const transaction = transfer({
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
					}
				);
			});

			describe('with same account using same username and different timestamps', () => {
				it('adding to pool delegate registration should be ok', done => {
					transaction1 = registerDelegate({
						passphrase: account.passphrase,
						username: account.username,
						timeOffset: -10000,
					});
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from same account with different id should be ok', done => {
					transaction2 = registerDelegate({
						passphrase: account.passphrase,
						username: account.username,
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

					it('first delegate registration to arrive should not be included', done => {
						const filter = {
							id: transaction1.id,
						};
						localCommon.getTransactionFromModule(
							library,
							filter,
							(err, res) => {
								expect(err).to.be.null;
								expect(res)
									.to.have.property('transactions')
									.which.is.an('Array');
								expect(res.transactions.length).to.equal(0);
								done();
							}
						);
					});

					it('last delegate registration to arrive should be included', done => {
						const filter = {
							id: transaction2.id,
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
								expect(res.transactions[0].id).to.equal(transaction2.id);
								done();
							}
						);
					});

					it('adding to pool delegate registration from same account should fail', done => {
						transaction2 = registerDelegate({
							passphrase: account.passphrase,
							username: randomUtil.delegateName(),
						});
						localCommon.addTransaction(library, transaction2, err => {
							expect(err).to.equal('Account is already a delegate');
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
