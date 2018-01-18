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
var transactionTypes = require('../../../helpers/transactionTypes.js');

describe('system test (type 4) - double multisig registrations', function () {

	var library, transaction;

	var scenarios = {
		'regular': new Scenarios.Multisig()
	};

	localCommon.beforeBlock('system_4_4_multisig', function (lib, sender) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [scenarios.regular.creditTransaction], function (err, res) {
			done();
		});
	});

	it('adding to pool multisig registration should be ok', function (done) {
		localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
			expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
			done();
		});
	});

	it('adding to pool same transactions with different timestamp should be ok', function (done) {
		transaction = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, scenarios.regular.lifetime, scenarios.regular.min, -1);
		localCommon.addTransaction(library, transaction, function (err, res) {
			expect(res).to.equal(transaction.id);
			done();
		});
	});

	// TODO: activate when we have a function to sign pending multisg
	describe.skip('after signing pending multigs and forging one block', function () {

		before(function (done) {
			localCommon.forge(library, function (err, res) {
				done();
			});
		});

		it('first transaction to arrive should not be included', function (done) {
			var filter = {
				id: scenarios.regular.multiSigTransaction.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.have.property('transactions').which.is.an('Array');
				expect(res.transactions.length).to.equal(0);
				done();
			});
		});

		it('last transaction to arrive should be included', function (done) {
			var filter = {
				id: transaction.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.have.property('transactions').which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(transaction.id);
				done();
			});
		});

		it('adding to pool registering second password transaction for same account without second password should fail', function (done) {
			localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
				expect(err).to.equal('Missing sender second signature');
				done();
			});
		});

		it('adding to pool registering second password transaction for same account with second password should fail', function (done) {
			localCommon.addTransaction(library, transaction, function (err, res) {
				expect(err).to.equal('Missing sender second signature');
				done();
			});
		});
	});
});
