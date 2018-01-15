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

var test = require('../../test');
var _ = test._;

var accountFixtures = require('../../fixtures/accounts');

var randomUtil = require('../../common/utils/random');
var Scenarios = require('../common/scenarios');

var localCommon = require('./common');

var transactionTypes = require('../../../helpers/transactionTypes.js');

describe('send transactions on top of unconfirmed type 4', function () {

	var library, transaction;

	var scenarios = {
		'regular': new Scenarios.Multisig()
	};

	scenarios.regular.dapp = randomUtil.application();

	localCommon.beforeBlock(scenarios.regular.account, scenarios.regular.dapp, function (lib, sender) {
		library = lib;
	});

	before('add multisig transaction to pool', function (done) {
		localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
			expect(res).not.null;
			done();
		});
	});

	Object.keys(transactionTypes).forEach(function (key, index) {
		it('type' + index + ': ' + key, function (done) {
			switch (key) {
				case 'SEND':
					transaction = lisk.transaction.createTransaction(randomUtil.account().address, 1, scenarios.regular.account.password);
					break;
				case 'SIGNATURE':
					transaction = lisk.signature.createSignature(scenarios.regular.account.password, scenarios.regular.account.secondPassword);
					break;
				case 'DELEGATE':
					transaction = lisk.delegate.createDelegate(scenarios.regular.account.password, scenarios.regular.account.username);
					break;
				case 'VOTE':
					transaction = lisk.vote.createVote(scenarios.regular.account.password, ['+' + accountFixtures.existingDelegate.publicKey]);
					break;
				case 'MULTI':
					transaction = scenarios.regular.multiSigTransaction;
					break;
				case 'DAPP':
					transaction = lisk.dapp.createDapp(scenarios.regular.account.password, null, randomUtil.guestbookDapp);
					break;
				case 'IN_TRANSFER':
					transaction = lisk.transfer.createInTransfer(scenarios.regular.dapp.id, 1, scenarios.regular.account.password);
					break;
				case 'OUT_TRANSFER':
					transaction = lisk.transfer.createOutTransfer(scenarios.regular.dapp.id, randomUtil.transaction().id, randomUtil.account().address, 1, scenarios.regular.account.password);
					break;
			};

			localCommon.addTransaction(library, transaction, function (err, res) {
				if (err) {
					expect(err).to.equal('Transaction is already processed: ' + transaction.id);
				} else {
					expect(res).to.equal(transaction.id);
				}
				done();
			});
		});
	});
});
