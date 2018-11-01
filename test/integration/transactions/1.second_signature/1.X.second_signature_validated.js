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
var transactionTypes = require('../../../../helpers/transaction_types.js');
var localCommon = require('../../common');

const { NORMALIZER } = global.constants;

describe('system test (type 1) - checking validated second signature registrations against other transaction types', () => {
	var library;

	var account = randomUtil.account();
	var creditTransaction = lisk.transaction.transfer({
		amount: 1000 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	var transaction = lisk.transaction.registerSecondPassphrase({
		passphrase: account.passphrase,
		secondPassphrase: account.secondPassphrase,
	});
	var dapp = randomUtil.application();
	var dappTransaction = lisk.transaction.createDapp({
		passphrase: account.passphrase,
		options: dapp,
	});
	dapp.id = dappTransaction.id;

	localCommon.beforeBlock('system_1_X_second_sign_validated', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [creditTransaction], () => {
			localCommon.addTransactionsAndForge(library, [dappTransaction], () => {
				done();
			});
		});
	});

	it('adding to pool second signature registration should be ok', done => {
		localCommon.addTransaction(library, transaction, (err, res) => {
			expect(res).to.equal(transaction.id);
			done();
		});
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, () => {
				done();
			});
		});

		it('transaction should be included', done => {
			var filter = {
				id: transaction.id,
			};
			localCommon.getTransactionFromModule(library, filter, (err, res) => {
				expect(err).to.be.null;
				expect(res)
					.to.have.property('transactions')
					.which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(transaction.id);
				done();
			});
		});

		it('adding to pool second signature registration for same account should fail', done => {
			const transaction = lisk.transaction.registerSecondPassphrase({
				passphrase: account.passphrase,
				secondPassphrase: account.secondPassphrase,
			});
			localCommon.addTransaction(library, transaction, err => {
				expect(err).to.equal('Missing sender second signature');
				done();
			});
		});

		describe('adding to pool other transaction types from the same account', () => {
			Object.keys(transactionTypes).forEach((key, index) => {
				if (
					key != 'SIGNATURE' &&
					key != 'IN_TRANSFER' &&
					key != 'OUT_TRANSFER'
				) {
					it(`type ${index}: ${key} without second signature should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							true,
							transaction => {
								localCommon.addTransaction(library, transaction, err => {
									expect(err).to.equal('Missing sender second signature');
									done();
								});
							}
						);
					});

					it(`type ${index}: ${key} with second signature not matching registered second passphrase should fail`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							false,
							transaction => {
								localCommon.addTransaction(library, transaction, (err, res) => {
									console.info(res);
									// expect(err).to.equal('Failed to verify second signature');
									done();
								});
							}
						);
					});

					it(`type ${index}: ${key} with correct second signature should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							null,
							transaction => {
								localCommon.addTransaction(library, transaction, (err, res) => {
									expect(res).to.equal(transaction.id);
									done();
								});
							}
						);
					});
				}
			});
		});
	});
});
