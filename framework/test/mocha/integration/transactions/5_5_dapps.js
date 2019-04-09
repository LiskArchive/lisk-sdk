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

const { transfer, createDapp } = require('@liskhq/lisk-transactions');
const async = require('async');
const accountFixtures = require('../../fixtures/accounts');
const randomUtil = require('../../common/utils/random');
const localCommon = require('../common');

const { NORMALIZER } = global.constants;

describe('integration test (type 5) - dapp registrations with repeated values', () => {
	let library;

	const account = randomUtil.account();
	const transaction = transfer({
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
	});
	const dapp = randomUtil.application();
	const dappTransaction = createDapp({
		passphrase: account.passphrase,
		options: dapp,
	});
	dapp.id = dappTransaction.id;
	const goodTransactions = [];
	const badTransactions = [];
	let transaction1;
	let transaction2;
	let transaction3;
	let transaction4;
	let transaction5;
	let transaction6;

	const dappDuplicate = randomUtil.application();
	const dappDuplicateNameSuccess = randomUtil.application();
	const dappDuplicateNameFail = randomUtil.application();
	dappDuplicateNameSuccess.name = dappDuplicateNameFail.name;
	const dappDuplicateLinkSuccess = randomUtil.application();
	const dappDuplicateLinkFail = randomUtil.application();
	dappDuplicateLinkSuccess.link = dappDuplicateLinkFail.link;

	localCommon.beforeBlock('5_5_dapps', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [transaction], async () => {
			localCommon.addTransactionsAndForge(
				library,
				[dappTransaction],
				async () => {
					done();
				}
			);
		});
	});

	it('adding to pool dapp transaction 1 should be ok', done => {
		transaction1 = createDapp({
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
		transaction2 = createDapp({
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
		transaction3 = createDapp({
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
		transaction4 = createDapp({
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
		transaction5 = createDapp({
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
		transaction6 = createDapp({
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
			localCommon.forge(library, async () => {
				done();
			});
		});

		it('first dapp transactions to arrive should not be included', done => {
			async.every(
				badTransactions,
				(everyTransaction, callback) => {
					const filter = {
						id: everyTransaction.id,
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
				async () => {
					done();
				}
			);
		});

		it('last dapp transactions to arrive should be included', done => {
			async.every(
				goodTransactions,
				(everyTransaction, callback) => {
					const filter = {
						id: everyTransaction.id,
					};

					localCommon.getTransactionFromModule(library, filter, (err, res) => {
						expect(err).to.be.null;
						expect(res)
							.to.have.property('transactions')
							.which.is.an('Array');
						expect(res.transactions.length).to.equal(1);
						expect(res.transactions[0].id).to.equal(everyTransaction.id);
						callback(null, !err);
					});
				},
				async () => {
					done();
				}
			);
		});

		it('adding to pool already registered dapp should fail', done => {
			transaction2 = createDapp({
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
			transaction4 = createDapp({
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
			transaction6 = createDapp({
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
