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
var async = require('async');

var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('./common');
var normalizer = require('../../common/utils/normalizer');

describe('system test (type 5) - dapp registrations with repeated values', function () {

	var library;

	var account = randomUtil.account();
	var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
	var dapp = randomUtil.application();
	var dappTransaction = lisk.dapp.createDapp(account.password, null, dapp);
	dapp.id = dappTransaction.id;
	var goodTransactions = [];
	var badTransactions = [];
	var transaction1, transaction2, transaction3, transaction4, transaction5, transaction6;

	var dappDuplicate = randomUtil.application();
	var dappDuplicateNameSuccess = randomUtil.application();
	var dappDuplicateNameFail = randomUtil.application();
	dappDuplicateNameSuccess.name = dappDuplicateNameFail.name;
	var dappDuplicateLinkSuccess = randomUtil.application();
	var dappDuplicateLinkFail = randomUtil.application();
	dappDuplicateLinkSuccess.link = dappDuplicateLinkFail.link;

	localCommon.beforeBlock('system_5_5_dapps', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
			localCommon.addTransactionsAndForge(library, [dappTransaction], function (err, res) {
				done();
			});
		});
	});

	it('adding to pool dapp transaction 1 should be ok', function (done) {
		transaction1 = lisk.dapp.createDapp(account.password, null, dappDuplicate, -10000);
		badTransactions.push(transaction1);
		localCommon.addTransaction(library, transaction1, function (err, res) {
			expect(res).to.equal(transaction1.id);
			done();
		});
	});

	it('adding to pool dapp transaction 2 with same data than 1 but different id should be ok', function (done) {
		transaction2 = lisk.dapp.createDapp(account.password, null, dappDuplicate, -5000);
		goodTransactions.push(transaction2);
		localCommon.addTransaction(library, transaction2, function (err, res) {
			expect(res).to.equal(transaction2.id);
			done();
		});
	});

	it('adding to pool dapp transaction 3 should be ok', function (done) {
		transaction3 = lisk.dapp.createDapp(account.password, null, dappDuplicateNameFail, -10000);
		badTransactions.push(transaction3);
		localCommon.addTransaction(library, transaction3, function (err, res) {
			expect(res).to.equal(transaction3.id);
			done();
		});
	});

	it('adding to pool dapp transaction 4 with same name than 3 should be ok', function (done) {
		transaction4 = lisk.dapp.createDapp(account.password, null, dappDuplicateNameSuccess);
		goodTransactions.push(transaction4);
		localCommon.addTransaction(library, transaction4, function (err, res) {
			expect(res).to.equal(transaction4.id);
			done();
		});
	});

	it('adding to pool dapp transaction 5 should be ok', function (done) {
		transaction5 = lisk.dapp.createDapp(account.password, null, dappDuplicateLinkFail, -10000);
		badTransactions.push(transaction5);
		localCommon.addTransaction(library, transaction5, function (err, res) {
			expect(res).to.equal(transaction5.id);
			done();
		});
	});

	it('adding to pool dapp transaction 6 with same link than 5 should be ok', function (done) {
		transaction6 = lisk.dapp.createDapp(account.password, null, dappDuplicateLinkSuccess);
		goodTransactions.push(transaction6);
		localCommon.addTransaction(library, transaction6, function (err, res) {
			expect(res).to.equal(transaction6.id);
			done();
		});
	});

	describe('after forging one block', function () {

		before(function (done) {
			localCommon.forge(library, function (err, res) {
				done();
			});
		});

		it('first dapp transactions to arrive should not be included', function (done) {
			async.every(badTransactions, function (transaction, callback) {
				var filter = {
					id: transaction.id
				};

				localCommon.getTransactionFromModule(library, filter, function (err, res) {
					expect(err).to.be.null;
					expect(res).to.have.property('transactions').which.is.an('Array');
					expect(res.transactions.length).to.equal(0);
					callback(null, !err);
				});
			}, function (err, result) {
				done();
			});
		});

		it('last dapp transactions to arrive should be included', function (done) {
			async.every(goodTransactions, function (transaction, callback) {
				var filter = {
					id: transaction.id
				};

				localCommon.getTransactionFromModule(library, filter, function (err, res) {
					expect(err).to.be.null;
					expect(res).to.have.property('transactions').which.is.an('Array');
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(transaction.id);
					callback(null, !err);
				});
			}, function (err, result) {
				done();
			});
		});

		it('adding to pool already registered dapp should fail', function (done) {
			transaction2 = lisk.dapp.createDapp(account.password, null, dappDuplicate);
			localCommon.addTransaction(library, transaction2, function (err, res) {
				expect(err).to.equal('Application name already exists: ' + dappDuplicate.name);
				done();
			});
		});

		it('adding to pool already registered dapp name should fail', function (done) {
			transaction4 = lisk.dapp.createDapp(account.password, null, dappDuplicateNameFail);
			localCommon.addTransaction(library, transaction4, function (err, res) {
				expect(err).to.equal('Application name already exists: ' + dappDuplicateNameFail.name);
				done();
			});
		});

		it('adding to pool already registered dapp link should fail', function (done) {
			transaction6 = lisk.dapp.createDapp(account.password, null, dappDuplicateLinkFail);
			localCommon.addTransaction(library, transaction6, function (err, res) {
				expect(err).to.equal('Application link already exists: ' + dappDuplicateLinkFail.link);
				done();
			});
		});
	});
});
