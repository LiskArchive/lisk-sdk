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

describe('system test (type 4) - double multisig registrations', function () {

	var library, multisigSender;

	var scenarios = {
		'regular': new Scenarios.Multisig()
	};

	var transactionToBeNotConfirmed = lisk.multisignature.createMultisignature(scenarios.regular.account.password, null, scenarios.regular.keysgroup, scenarios.regular.lifetime, scenarios.regular.min, -1);

	localCommon.beforeBlock('system_4_4_multisig', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [scenarios.regular.creditTransaction], function (err, res) {
			library.logic.account.get({ address: scenarios.regular.account.address }, function (err, sender) {
				multisigSender = sender;
				done();
			});
		});
	});

	it('adding to pool multisig registration should be ok', function (done) {
		localCommon.addTransaction(library, transactionToBeNotConfirmed, function (err, res) {
			res.should.equal(transactionToBeNotConfirmed.id);
			done();
		});
	});

	it('adding to pool same transaction with different timestamp should be ok', function (done) {
		localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
			res.should.equal(scenarios.regular.multiSigTransaction.id);
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
				id: transactionToBeNotConfirmed.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				should.not.exist(err);
				res.should.have.property('transactions').which.is.an('Array');
				res.transactions.length.should.equal(0);
				done();
			});
		});

		it('last transaction to arrive should be included', function (done) {
			var filter = {
				id: scenarios.regular.multiSigTransaction.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				should.not.exist(err);
				res.should.have.property('transactions').which.is.an('Array');
				res.transactions.length.should.equal(1);
				res.transactions[0].id.should.equal(scenarios.regular.multiSigTransaction.id);
				done();
			});
		});

		it('adding to pool transaction type 4 for same account should fail', function (done) {
			localCommon.addTransaction(library, scenarios.regular.multiSigTransaction, function (err, res) {
				err.should.equal('TODO');
				done();
			});
		});
	});
});
