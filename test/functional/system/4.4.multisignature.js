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

describe('system test (type 4) - double multisignature registrations', function () {

	var library;

	var scenarios = {
		'regular': new Scenarios.Multisig()

	};

	var transactionToBeNotConfirmed = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, scenarios.regular.lifetime, scenarios.regular.min, -10000);

	scenarios.regular.multiSigTransaction.ready = true;
	scenarios.regular.multiSigTransaction.signatures = [];
	transactionToBeNotConfirmed.ready = true;
	transactionToBeNotConfirmed.signatures = [];

	scenarios.regular.members.map(function (member) {
		var signatureToBeNotconfirmed = lisk.multisignature.signTransaction(transactionToBeNotConfirmed, member.password);
		transactionToBeNotConfirmed.signatures.push(signatureToBeNotconfirmed);
		var signature = lisk.multisignature.signTransaction(scenarios.regular.multiSigTransaction, member.password);
		scenarios.regular.multiSigTransaction.signatures.push(signature);
	});

	localCommon.beforeBlock('system_4_4_multisig', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [scenarios.regular.creditTransaction], function (err, res) {
			done();
		});
	});

	it('adding to pool multisig registration should be ok', function (done) {
		localCommon.addTransaction(library, transactionToBeNotConfirmed, function (err, res) {
			expect(res).to.equal(transactionToBeNotConfirmed.id);
			done();
		});
	});

	it('adding to pool same transaction with different timestamp should be ok', function (done) {
		localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
			expect(res).to.equal(scenarios.regular.multiSigTransaction.id);
			done();
		});
	});

	describe('after forging one block', function () {

		before(function (done) {
			localCommon.forge(library, function (err, res) {
				done();
			});
		});

		it('first transaction to arrive should not be included', function (done) {
			var filter = {
				id: transactionToBeNotConfirmed.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				expect(err).to.be.null;
				expect(res).to.have.property('transactions').which.is.an('Array');
				expect(res.transactions.length).to.equal(0);
				done();
			});
		});

		it('last transaction to arrive should be included', function (done) {
			var filter = {
				id: scenarios.regular.multiSigTransaction.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				expect(err).to.be.null;
				expect(res).to.have.property('transactions').which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(scenarios.regular.multiSigTransaction.id);
				done();
			});
		});

		it('adding to pool multisignature registration for same account should fail', function (done) {
			localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
				expect(err).to.equal('Account already has multisignatures enabled');
				done();
			});
		});
	});
});
