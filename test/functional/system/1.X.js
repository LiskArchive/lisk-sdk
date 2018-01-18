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

	localCommon.beforeBlock('system_1_X_second_sign', function (lib, sender) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
			localCommon.addTransactionsAndForge(library, [dappTransaction], function (err, res) {
				done();
			});
		});
	});

	it('adding to pool transaction type 1 second signature should be ok', function (done) {
		localCommon.addTransaction(library, transactionSecondSignature, function (err, res) {
			expect(res).to.equal(transactionSecondSignature.id);
			done();
		});
	});

	describe('adding to pool other transactions from same account', function () {

		describe('with second password', function () {

			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key === 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' should fail', function (done) {
						localCommon.addTransaction(library, transactionSecondSignature, function (err, res) {
							expect(err).to.equal('Transaction is already processed: ' + transactionSecondSignature.id);
							done();
						});
					});

					it('type ' + index + ': ' + key + ' with different timestamp should be ok', function (done) {
						transactionWith = lisk.signature.createSignature(account.password, account.secondPassword, -1);
						localCommon.addTransaction(library, transactionWith, function (err, res) {
							expect(res).to.equal(transactionWith.id);
							done();
						});
					});
				} else {
					it('type ' + index + ': ' + key + ' should fail', function (done) {
						switch (key) {
							case 'SEND':
								transactionWith = lisk.transaction.createTransaction(randomUtil.account().address, 1, account.password, account.secondPassword);
								break;
							case 'DELEGATE':
								transactionWith = lisk.delegate.createDelegate(account.password, account.username, account.secondPassword);
								break;
							case 'VOTE':
								transactionWith = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey], account.secondPassword);
								break;
							case 'MULTI':
								transactionWith = lisk.multisignature.createMultisignature(account.password, account.secondPassword, ['+' + accountFixtures.existingDelegate.publicKey], 1, 1);
								break;
							case 'DAPP':
								transactionWith = lisk.dapp.createDapp(account.password, account.secondPassword, randomUtil.guestbookDapp);
								break;
							case 'IN_TRANSFER':
								transactionWith = lisk.transfer.createInTransfer(dapp.id, 1, account.password, account.secondPassword);
								break;
							case 'OUT_TRANSFER':
								transactionWith = lisk.transfer.createOutTransfer(dapp.id, randomUtil.transaction().id, randomUtil.account().address, 1, account.password, account.secondPassword);
								break;
						};

						localCommon.addTransaction(library, transactionWith, function (err, res) {
							expect(err).to.equal('Sender does not have a second signature');
							done();
						});
					});
				};
			});
		});

		describe('without second password', function () {

			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key != 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' should be ok', function (done) {
						switch (key) {
							case 'SEND':
								transactionWithout = lisk.transaction.createTransaction(randomUtil.account().address, 1, account.password);
								break;
							case 'DELEGATE':
								transactionWithout = lisk.delegate.createDelegate(account.password, account.username);
								break;
							case 'VOTE':
								transactionWithout = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey]);
								break;
							case 'MULTI':
								transactionWithout = lisk.multisignature.createMultisignature(account.password, null, ['+' + accountFixtures.existingDelegate.publicKey], 1, 1);
								break;
							case 'DAPP':
								transactionWithout = lisk.dapp.createDapp(account.password, null, randomUtil.guestbookDapp);
								break;
							case 'IN_TRANSFER':
								transactionWithout = lisk.transfer.createInTransfer(dapp.id, 1, account.password);
								break;
							case 'OUT_TRANSFER':
								transactionWithout = lisk.transfer.createOutTransfer(dapp.id, randomUtil.transaction().id, randomUtil.account().address, 1, account.password);
								break;
						};

						localCommon.addTransaction(library, transactionWithout, function (err, res) {
							expect(res).to.equal(transactionWithout.id);
							done();
						});
					});
				};
			});
		});
	});
});
