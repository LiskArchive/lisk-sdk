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

var lisk = require('lisk-js');

var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('./../common');
var normalizer = require('../../../common/utils/normalizer');

describe('system test (type 2) - double delegate registrations', () => {
	var library;
	localCommon.beforeBlock('system_2_2_delegates_3', lib => {
		library = lib;
	});

	var i = 0;
	var t = 0;
	while (i < 30) {
		describe('executing 30 times', () => {
			var account = randomUtil.account();
			var account2 = randomUtil.account();
			var transaction;
			var transaction1;
			var transaction2;
			transaction = lisk.transaction.createTransaction(
				account.address,
				1000 * normalizer,
				accountFixtures.genesis.password
			);

			before(done => {
				console.log(++t);
				localCommon.addTransactionsAndForge(library, [transaction], () => {
					done();
				});
			});

			describe('with two different accounts using same username', () => {
				before(done => {
					transaction = lisk.transaction.createTransaction(
						account2.address,
						1000 * normalizer,
						accountFixtures.genesis.password
					);
					localCommon.addTransactionsAndForge(library, [transaction], done);
				});

				it('adding to pool delegate registration should be ok', done => {
					transaction1 = lisk.delegate.createDelegate(
						account.password,
						account.username
					);
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from different account and same username should be ok', done => {
					transaction2 = lisk.delegate.createDelegate(
						account2.password,
						account.username
					);
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

					it('first delegate registration to arrive should not be included', done => {
						var filter = {
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
						var filter = {
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

					it('adding to pool delegate registration with already registered username should fail', done => {
						localCommon.addTransaction(library, transaction1, err => {
							expect(err).to.equal(
								`Username ${account.username} already exists`
							);
							done();
						});
					});

					it('adding to pool delegate registration from same account should fail', done => {
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
});
