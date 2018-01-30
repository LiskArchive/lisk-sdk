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
var Scenarios = require('../common/scenarios');
var localCommon = require('./common');
var transactionTypes = require('../../../helpers/transaction_types.js');

describe('system test (type 4) - sending transactions on top of unconfirmed multisignature registration', function () {

	var library, transaction;

	var scenarios = {
		'regular': new Scenarios.Multisig()
	};

	scenarios.regular.dapp = randomUtil.application();
	var dappTransaction = lisk.dapp.createDapp(scenarios.regular.account.password, null, scenarios.regular.dapp);
	scenarios.regular.dapp.id = dappTransaction.id;

	localCommon.beforeBlock('system_4_X_multisig_unconfirmed', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [scenarios.regular.creditTransaction], function (err, res) {
			localCommon.addTransactionsAndForge(library, [dappTransaction], function (err, res) {
				done();
			});
		});
	});

	it('adding to pool multisig registration should be ok', function (done) {
		localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
			expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
			done();
		});
	});

	describe('adding to pool other transactions from same account', function () {

		Object.keys(transactionTypes).forEach(function (key, index) {
			if (key === 'IN_TRANSFER' || key === 'OUT_TRANSFER') {
				it('type ' + index + ': ' + key + ' should be rejected', function (done) {
					localCommon.loadTransactionType(key, scenarios.regular.account, scenarios.regular.dapp, true, function (transaction) {
						localCommon.addTransaction(library, transaction, function (err, res) {
							expect(err).to.equal('Transaction type ' + transaction.type + ' is frozen');
							done();
						});
					});
				});
			} else if (key != 'MULTI') {
				it('type ' + index + ': ' + key + ' should be ok', function (done) {
					localCommon.loadTransactionType(key, scenarios.regular.account, scenarios.regular.dapp, true, function (transaction) {
						localCommon.addTransaction(library, transaction, function (err, res) {
							expect(res).to.equal(transaction.id);
							done();
						});
					});
				});
			};
		});
	});
});
