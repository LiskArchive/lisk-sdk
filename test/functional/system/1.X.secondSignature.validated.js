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

var transactionTypes = require('../../../helpers/transactionTypes.js');

describe('system test (type 1) - checking validated second signature registrations against other transaction types', function () {

	var library;

	var account = randomUtil.account();
	var creditTransaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
	var transaction = lisk.signature.createSignature(account.password, account.secondPassword);
	var dapp = randomUtil.application();
	var dappTransaction = lisk.dapp.createDapp(account.password, null, dapp);
	dapp.id = dappTransaction.id;

	localCommon.beforeBlock('system_1_X_second_sign_validated', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [creditTransaction], function (err, res) {
			localCommon.addTransactionsAndForge(library, [dappTransaction], function (err, res) {
				done();
			});
		});
	});

	it('adding to pool second signature registration should be ok', function (done) {
		localCommon.addTransaction(library, transaction, function (err, res) {
			res.should.equal(transaction.id);
			done();
		});
	});

	describe('after forging one block', function () {

		before(function (done) {
			localCommon.forge(library, function (err, res) {
				done();
			});
		});

		it('transaction should be included', function (done) {
			var filter = {
				id: transaction.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				should.not.exist(err);
				res.should.have.property('transactions').which.is.an('Array');
				res.transactions.length.should.equal(1);
				res.transactions[0].id.should.equal(transaction.id);
				done();
			});
		});

		it('adding to pool second signature registration for same account should fail', function (done) {
			localCommon.addTransaction(library, transaction, function (err, res) {
				err.should.equal('Missing sender second signature');
				done();
			});
		});

		describe('adding to pool other transaction types from the same account', function () {

			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key != 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' without second signature should fail', function (done) {
						localCommon.loadTransactionType(key, account, dapp, true, function (transaction) {
							localCommon.addTransaction(library, transaction, function (err, res) {
								err.should.equal('Missing sender second signature');
								done();
							});
						});
					});

					it('type ' + index + ': ' + key + ' with second signature not matching registered second passphrase should fail', function (done) {
						localCommon.loadTransactionType(key, account, dapp, false, function (transaction) {
							localCommon.addTransaction(library, transaction, function (err, res) {
								err.should.equal('Failed to verify second signature');
								done();
							});
						});
					});

					it('type ' + index + ': ' + key + ' with correct second signature should be ok', function (done) {
						localCommon.loadTransactionType(key, account, dapp, null, function (transaction) {
							localCommon.addTransaction(library, transaction, function (err, res) {
								res.should.equal(transaction.id);
								done();
							});
						});
					});
				};
			});
		});
	});
});
