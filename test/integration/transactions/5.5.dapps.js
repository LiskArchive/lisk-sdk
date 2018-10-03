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
var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('../common');

const { NORMALIZER } = global.constants;

describe('system test (type 5) - dapp registrations with repeated values', () => {
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
	var goodTransactions = [];
	var badTransactions = [];
	var transaction1;
	var transaction2;
	var transaction3;
	var transaction4;
	var transaction5;
	var transaction6;

	var dappDuplicate = randomUtil.application();
	var dappDuplicateNameSuccess = randomUtil.application();
	var dappDuplicateNameFail = randomUtil.application();
	dappDuplicateNameSuccess.name = dappDuplicateNameFail.name;
	var dappDuplicateLinkSuccess = randomUtil.application();
	var dappDuplicateLinkFail = randomUtil.application();
	dappDuplicateLinkSuccess.link = dappDuplicateLinkFail.link;

	localCommon.beforeBlock('system_5_5_dapps', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [transaction], () => {
			localCommon.addTransactionsAndForge(library, [dappTransaction], () => {
				done();
			});
		});
	});

	it('adding to pool dapp transaction 1 should be ok', done => {
		transaction1 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicate,
			timeOffset: -10000,
		});
		badTransactions.push(transaction1);
		localCommon.addTransaction(library, transaction1, (err, res) => {
			expect(res).to.equal(transaction1.id);
			done();
		});
	});

	it('adding to pool dapp transaction 2 with same data than 1 but different id should be ok', done => {
		transaction2 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicate,
			timeOffset: -5000,
		});
		goodTransactions.push(transaction2);
		localCommon.addTransaction(library, transaction2, (err, res) => {
			expect(res).to.equal(transaction2.id);
			done();
		});
	});

	it('adding to pool dapp transaction 3 should be ok', done => {
		transaction3 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicateNameFail,
			timeOffset: -10000,
		});
		badTransactions.push(transaction3);
		localCommon.addTransaction(library, transaction3, (err, res) => {
			expect(res).to.equal(transaction3.id);
			done();
		});
	});

	it('adding to pool dapp transaction 4 with same name than 3 should be ok', done => {
		transaction4 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicateNameSuccess,
		});
		goodTransactions.push(transaction4);
		localCommon.addTransaction(library, transaction4, (err, res) => {
			expect(res).to.equal(transaction4.id);
			done();
		});
	});

	it('adding to pool dapp transaction 5 should be ok', done => {
		transaction5 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicateLinkFail,
			timeOffset: -10000,
		});
		badTransactions.push(transaction5);
		localCommon.addTransaction(library, transaction5, (err, res) => {
			expect(res).to.equal(transaction5.id);
			done();
		});
	});

	it('adding to pool dapp transaction 6 with same link than 5 should be ok', done => {
		transaction6 = lisk.transaction.createDapp({
			passphrase: account.passphrase,
			options: dappDuplicateLinkSuccess,
		});
		goodTransactions.push(transaction6);
		localCommon.addTransaction(library, transaction6, (err, res) => {
			expect(res).to.equal(transaction6.id);
			done();
		});
	});

	describe('after forging one block', () => {
		before(done => {
			localCommon.forge(library, () => {
				done();
			});
		});

		it('first dapp transactions to arrive should not be included', done => {
			async.every(
				badTransactions,
				(transaction, callback) => {
					var filter = {
						id: transaction.id,
					};

					localCommon.getTransactionFromModule(library, filter, (err, res) => {
						expect(err).to.be.null;
						expect(res)
							.to.have.property('transactions')
							.which.is.an('Array');
						expect(res.transactions.length).to.equal(0);
						callback(null, !err);
					});
				},
				() => {
					done();
				}
			);
		});

		it('last dapp transactions to arrive should be included', done => {
			async.every(
				goodTransactions,
				(transaction, callback) => {
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
						callback(null, !err);
					});
				},
				() => {
					done();
				}
			);
		});

		it('adding to pool already registered dapp should fail', done => {
			transaction2 = lisk.transaction.createDapp({
				passphrase: account.passphrase,
				options: dappDuplicate,
			});
			localCommon.addTransaction(library, transaction2, err => {
				expect(err).to.equal(
					`Application name already exists: ${dappDuplicate.name}`
				);
				done();
			});
		});

		it('adding to pool already registered dapp name should fail', done => {
			transaction4 = lisk.transaction.createDapp({
				passphrase: account.passphrase,
				options: dappDuplicateNameFail,
			});
			localCommon.addTransaction(library, transaction4, err => {
				expect(err).to.equal(
					`Application name already exists: ${dappDuplicateNameFail.name}`
				);
				done();
			});
		});

		it('adding to pool already registered dapp link should fail', done => {
			transaction6 = lisk.transaction.createDapp({
				passphrase: account.passphrase,
				options: dappDuplicateLinkFail,
			});
			localCommon.addTransaction(library, transaction6, err => {
				expect(err).to.equal(
					`Application link already exists: ${dappDuplicateLinkFail.link}`
				);
				done();
			});
		});
	});
});
