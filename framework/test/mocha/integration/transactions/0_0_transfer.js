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

const { transfer } = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../common/utils/random');
const localCommon = require('../common');

const { NORMALIZER } = global.constants;

describe('integration test (type 0) - double transfers', () => {
	let library;
	localCommon.beforeBlock('0_0_transfer', lib => {
		library = lib;
	});

	let i = 0;
	let t = 0;

	/* eslint-disable no-loop-func */
	while (i < 1) {
		describe('executing 30 times', () => {
			const account = randomUtil.account();
			const transaction = transfer({
				amount: (1100 * NORMALIZER).toString(),
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: account.address,
			});
			let transaction1;
			let transaction2;

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

			it('adding to pool transfer should be ok', done => {
				transaction1 = transfer({
					amount: (1000 * NORMALIZER).toString(),
					passphrase: account.passphrase,
					recipientId: accountFixtures.genesis.address,
					timeOffset: -10000,
				});
				localCommon.addTransaction(library, transaction1, (err, res) => {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('adding to pool same transfer with different timestamp should be ok', done => {
				transaction2 = transfer({
					amount: (1000 * NORMALIZER).toString(),
					passphrase: account.passphrase,
					recipientId: accountFixtures.genesis.address,
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

				it('first transaction to arrive should not be included', done => {
					const filter = {
						id: transaction1.id,
					};
					localCommon.getTransactionFromModule(library, filter, (err, res) => {
						expect(err).to.be.null;
						expect(res)
							.to.have.property('transactions')
							.which.is.an('Array');
						expect(res.transactions.length).to.equal(0);
						done();
					});
				});

				it('last transaction to arrive should be included', done => {
					const filter = {
						id: transaction2.id,
					};
					localCommon.getTransactionFromModule(library, filter, (err, res) => {
						expect(err).to.be.null;
						expect(res)
							.to.have.property('transactions')
							.which.is.an('Array');
						expect(res.transactions.length).to.equal(1);
						expect(res.transactions[0].id).to.equal(transaction2.id);
						done();
					});
				});

				it('adding to pool transfer for same account should fail', done => {
					localCommon.addTransaction(library, transaction1, err => {
						expect(err).to.match(/^Account does not have enough LSK: /);
						done();
					});
				});
			});
		});
		i++;
	}
	/* eslint-enable no-loop-func */
});
