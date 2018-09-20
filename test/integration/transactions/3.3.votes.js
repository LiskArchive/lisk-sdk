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

var lisk = require('lisk-elements').default;
var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('../common');

const { NORMALIZER } = global.constants;

describe('system test (type 3) - voting with duplicate submissions', () => {
	var library;
	localCommon.beforeBlock('system_3_3_votes', lib => {
		library = lib;
	});

	var i = 0;
	var t = 0;
	/* eslint-disable no-loop-func */
	while (i < 30) {
		describe('executing 30 times', () => {
			var transaction1;
			var transaction2;
			var transaction3;
			var transaction4;
			var account;
			var transaction;

			account = randomUtil.account();
			transaction = lisk.transaction.transfer({
				amount: 1000 * NORMALIZER,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: account.address,
			});

			before(done => {
				console.info(`Iteration count: ${++t}`);
				localCommon.addTransactionsAndForge(library, [transaction], () => {
					done();
				});
			});

			it('adding to pool upvoting transaction should be ok', done => {
				transaction1 = lisk.transaction.castVotes({
					passphrase: account.passphrase,
					votes: [`${accountFixtures.existingDelegate.publicKey}`],
					timeOffset: -10000,
				});
				localCommon.addTransaction(library, transaction1, (err, res) => {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('adding to pool upvoting transaction for same delegate from same account with different id should be ok', done => {
				transaction2 = lisk.transaction.castVotes({
					passphrase: account.passphrase,
					votes: [`${accountFixtures.existingDelegate.publicKey}`],
				});
				localCommon.addTransaction(library, transaction2, (err, res) => {
					expect(res).to.equal(transaction2.id);
					done();
				});
			});

			describe('after forging one block', () => {
				before(done => {
					localCommon.forge(library, () => {
						done();
					});
				});

				it('first upvoting transaction to arrive should not be included', done => {
					var filter = {
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

				it('last upvoting transaction to arrive should be included', done => {
					var filter = {
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

				it('adding to pool upvoting transaction to same delegate from same account should fail', done => {
					localCommon.addTransaction(library, transaction1, err => {
						expect(err).to.equal(
							`Failed to add vote, delegate "${
								accountFixtures.existingDelegate.delegateName
							}" already voted for`
						);
						done();
					});
				});

				it('adding to pool downvoting transaction to same delegate from same account should be ok', done => {
					transaction3 = lisk.transaction.castVotes({
						passphrase: account.passphrase,
						unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
						timeOffset: -10000,
					});
					localCommon.addTransaction(library, transaction3, (err, res) => {
						expect(res).to.equal(transaction3.id);
						done();
					});
				});

				it('adding to pool downvoting transaction to same delegate from same account with different id should be ok', done => {
					transaction4 = lisk.transaction.castVotes({
						passphrase: account.passphrase,
						unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
					});
					localCommon.addTransaction(library, transaction4, (err, res) => {
						expect(res).to.equal(transaction4.id);
						done();
					});
				});

				describe('after forging a second block', () => {
					before(done => {
						localCommon.forge(library, () => {
							done();
						});
					});

					it('first downvoting transaction to arrive should not be included', done => {
						var filter = {
							id: transaction3.id,
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

					it('last downvoting transaction to arrive should be included', done => {
						var filter = {
							id: transaction4.id,
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
								expect(res.transactions[0].id).to.equal(transaction4.id);
								done();
							}
						);
					});

					it('adding to pool downvoting transaction to same delegate from same account should fail', done => {
						const transaction5 = lisk.transaction.castVotes({
							passphrase: account.passphrase,
							unvotes: [`${accountFixtures.existingDelegate.publicKey}`],
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transaction5, err => {
							expect(err).to.equal(
								`Failed to remove vote, delegate "${
									accountFixtures.existingDelegate.delegateName
								}" was not voted for`
							);
							done();
						});
					});
				});
			});
		});
		i++;
	}
});
