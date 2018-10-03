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
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('system test (type 2) - double delegate registrations', () => {
	var library;
	localCommon.beforeBlock('system_2_2_delegates_2', lib => {
		library = lib;
	});

	var i = 0;
	var t = 0;
	/* eslint-disable no-loop-func */
	while (i < 30) {
		describe('executing 30 times', () => {
			var account = randomUtil.account();
			var transaction;
			var transaction1;
			var transaction2;
			var differentDelegateName = randomUtil.delegateName();
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

			describe('with same account using different usernames', () => {
				it('adding to pool delegate registration should be ok', done => {
					transaction1 = lisk.transaction.registerDelegate({
						passphrase: account.passphrase,
						username: differentDelegateName,
					});
					localCommon.addTransaction(library, transaction1, (err, res) => {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from same account and different name should be ok', done => {
					transaction2 = lisk.transaction.registerDelegate({
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

					it('adding to pool delegate registration from same account should fail', done => {
						transaction2 = lisk.transaction.registerDelegate({
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
});
