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

describe('system test (type 1) - sending transactions on top of unconfirmed second signature', function () {

	var library;

	var account = randomUtil.account();
	var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
	var dapp = randomUtil.application();
	var dappTransaction = lisk.dapp.createDapp(account.password, null, dapp);
	dapp.id = dappTransaction.id;
	var transactionWith, transactionWithout;
	var transactionSecondSignature = lisk.signature.createSignature(account.password, account.secondPassword);

	localCommon.beforeBlock('system_1_X_second_sign_unconfirmed', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
			localCommon.addTransactionsAndForge(library, [dappTransaction], function (err, res) {
				done();
			});
		});
	});

	it('adding to pool second signature registration should be ok', function (done) {
		localCommon.addTransaction(library, transactionSecondSignature, function (err, res) {
			res.should.equal(transactionSecondSignature.id);
			done();
		});
	});

	describe('validating unconfirmed status while adding to pool other transaction types from same account', function () {

		describe('with second signature', function () {

			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key === 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' should fail', function (done) {
						localCommon.addTransaction(library, transactionSecondSignature, function (err, res) {
							err.should.equal('Transaction is already processed: ' + transactionSecondSignature.id);
							done();
						});
					});

					it('type ' + index + ': ' + key + ' with different timestamp should be ok', function (done) {
						transactionWith = lisk.signature.createSignature(account.password, account.secondPassword, -1);
						localCommon.addTransaction(library, transactionWith, function (err, res) {
							res.should.equal(transactionWith.id);
							done();
						});
					});
				} else {
					it('type ' + index + ': ' + key + ' should fail', function (done) {
						localCommon.loadTransactionType(key, account, dapp, null, function (transaction) {
							localCommon.addTransaction(library, transaction, function (err, res) {
								err.should.equal('Sender does not have a second signature');
								done();
							});
						});
					});
				};
			});
		});

		describe('without second signature', function () {

			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key != 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' should be ok', function (done) {
						localCommon.loadTransactionType(key, account, dapp, true, function (transaction) {
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
