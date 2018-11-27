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

describe('system test (type 1) - sending transactions on top of unconfirmed second signature', () => {
	var library;

	var account = randomUtil.account();
	var transaction = lisk.transaction.transfer({
		amount: 1000 * NORMALIZER,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	var dapp = randomUtil.application();
	var dappTransaction = lisk.transaction.createDapp({
		passphrase: account.passphrase,
		options: dapp,
	});
	dapp.id = dappTransaction.id;
	var transactionWith;
	var transactionSecondSignature = lisk.transaction.registerSecondPassphrase({
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
							transaction => {
								localCommon.addTransaction(library, transaction, err => {
									expect(err).to.equal(
										'Sender does not have a second signature'
									);
									done();
								});
							}
						);
					});
				}
			});
		});

		describe('without second signature', () => {
			Object.keys(transactionTypes).forEach((key, index) => {
				if (key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
					return true;
				} else if (key != 'SIGNATURE') {
					it(`type ${index}: ${key} should be ok`, done => {
						localCommon.loadTransactionType(
							key,
							account,
							dapp,
							true,
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
