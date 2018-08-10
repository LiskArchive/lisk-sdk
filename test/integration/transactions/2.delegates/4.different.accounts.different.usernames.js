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
var async = require('async');
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../../common');

const constants = global.constants;

describe('system test (type 2) - double delegate registrations', () => {
	var library;
	localCommon.beforeBlock('system_2_2_delegates_4', lib => {
		library = lib;
	});

	var i = 0;
	var t = 0;
	/* eslint-disable no-loop-func */
	while (i < 30) {
		describe('executing 30 times', () => {
			var account = randomUtil.account();
			var account2 = randomUtil.account();
			var transaction;
			var transaction1;
			var transaction2;
			transaction = lisk.transaction.transfer({
				amount: 1000 * constants.normalizer,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: account.address,
			});

			before(done => {
				console.info(`Iteration count: ${++t}`);
				localCommon.addTransactionsAndForge(library, [transaction], () => {
					done();
				});
			});

			describe('with two different accounts using different username', () => {
				before(done => {
					transaction1 = lisk.transaction.transfer({
						amount: 1000 * constants.normalizer,
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account.address,
					});
					transaction2 = lisk.transaction.transfer({
						amount: 1000 * constants.normalizer,
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account2.address,
					});
					localCommon.addTransactionsAndForge(
						library,
						[transaction1, transaction2],
						done
					);
				});

				it('adding to pool delegate registration should be ok', done => {
					transaction1 = lisk.transaction.registerDelegate({
						passphrase: account.passphrase,
						username: account.username,
					});
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from different account and same username should be ok', done => {
					transaction2 = lisk.transaction.registerDelegate({
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
						localCommon.forge(library, () => {
							done();
						});
					});

					it('both transactions should be included', done => {
						async.every(
							[transaction1, transaction2],
							(transaction, callback) => {
								var filter = {
									id: transaction.id,
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
										expect(res.transactions[0].id).to.equal(transaction.id);
										callback(null, !err);
									}
								);
							},
							() => {
								done();
							}
						);
					});

					it('adding to pool delegate registration with already registered username should fail', done => {
						const transaction3 = lisk.transaction.registerDelegate({
							passphrase: account2.passphrase,
							username: account2.username,
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transaction3, err => {
							expect(err).to.equal('Account is already a delegate');
							done();
						});
					});

					it('adding to pool delegate registration from same account should fail', done => {
						const transaction4 = lisk.transaction.registerDelegate({
							passphrase: account2.passphrase,
							username: account2.username,
							timeOffset: -10000,
						});
						localCommon.addTransaction(library, transaction4, err => {
							expect(err).to.equal('Account is already a delegate');
							done();
						});
					});
				});
			});
		});
		i++;
	}
});
