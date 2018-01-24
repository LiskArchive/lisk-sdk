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

describe('system test (type 1) - double second signature registrations', function () {

	var library;

	var account = randomUtil.account();
	var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
	var transaction1, transaction2;

	localCommon.beforeBlock('system_1_1_second_sign', function (lib) {
		library = lib;
	});

	before(function (done) {
		localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
			done();
		});
	});

	it('adding to pool second signature registration should be ok', function (done) {
		transaction1 = lisk.signature.createSignature(account.password, account.secondPassword, -1);
		localCommon.addTransaction(library, transaction1, function (err, res) {
			expect(res).to.equal(transaction1.id);
			done();
		});
	});

	it('adding to pool same second signature registration with different timestamp should be ok', function (done) {
		transaction2 = lisk.signature.createSignature(account.password, account.secondPassword);
		localCommon.addTransaction(library, transaction2, function (err, res) {
			expect(res).to.equal(transaction2.id);
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
				id: transaction1.id
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
				id: transaction2.id
			};
			localCommon.getTransactionFromModule(library, filter, function (err, res) {
				expect(err).to.be.null;
				expect(res).to.have.property('transactions').which.is.an('Array');
				expect(res.transactions.length).to.equal(1);
				expect(res.transactions[0].id).to.equal(transaction2.id);
				done();
			});
		});

		it('adding to pool second signature registration for same account should fail', function (done) {
			localCommon.addTransaction(library, transaction1, function (err, res) {
				expect(err).to.equal('Missing sender second signature');
				done();
			});
		});
	});
});
