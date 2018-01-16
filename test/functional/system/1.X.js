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

var chai = require('chai');
var expect = require('chai').expect;
var lisk = require('lisk-js');

var accountFixtures = require('../../fixtures/accounts');
var randomUtil = require('../../common/utils/random');
var localCommon = require('./common');
var transactionTypes = require('../../../helpers/transactionTypes.js');

describe('System test (type 1) send transactions on top of unconfirmed second signature', function () {

	var library, transaction;

	var account = randomUtil.account();
	var dapp = randomUtil.application();
	var transactionWith, transactionWithout;

	localCommon.beforeBlock('system_1_second_sign', account, dapp, function (lib, sender) {
		library = lib;
	});

	it('add to pool transaction type 1 second signature should be ok', function (done) {
		transaction = lisk.signature.createSignature(account.password, account.secondPassword);
		localCommon.addTransaction(library, transaction, function (err, res) {
			expect(res).to.equal(transaction.id);
			done();
		});
	});

	describe('add to pool another transactions from same account', function () {

		describe('with second password', function () {
			Object.keys(transactionTypes).forEach(function (key, index) {
				if (key === 'SIGNATURE') {
					it('type ' + index + ': ' + key + ' should fail', function (done) {
						transactionWithout = lisk.signature.createSignature(account.password, account.secondPassword);
						localCommon.addTransaction(library, transaction, function (err, res) {
							expect(err).to.match(/^Transaction is already processed: /);
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
