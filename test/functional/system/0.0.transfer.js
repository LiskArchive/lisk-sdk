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

var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('./common');
var normalizer = require('../../common/utils/normalizer');

describe('system test (type 0) - double transfers', () => {
	var library;
	localCommon.beforeBlock('system_0_0_transfer', lib => {
		library = lib;
	});

	var i = 0;
	var t = 0;
	while (i < 1) {
		describe('executing 30 times', function() {
			var account = randomUtil.account();
			var transaction = lisk.transaction.createTransaction(
				account.address,
				1100 * normalizer,
				accountFixtures.genesis.password
			);
			var transaction1;
			var transaction2;

			before(done => {
				console.log(++t);
				localCommon.addTransactionsAndForge(library, [transaction], () => {
					done();
				});
			});

			it('adding to pool transfer should be ok', done => {
				transaction1 = lisk.transaction.createTransaction(
					accountFixtures.genesis.address,
					1000 * normalizer,
					account.password,
					null,
					null,
					-10000
				);
				localCommon.addTransaction(library, transaction1, (err, res) => {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('adding to pool same transfer with different timestamp should be ok', done => {
				transaction2 = lisk.transaction.createTransaction(
					accountFixtures.genesis.address,
					1000 * normalizer,
					account.password
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

				it('first transaction to arrive should not be included', done => {
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

				it('last transaction to arrive should be included', done => {
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
});
