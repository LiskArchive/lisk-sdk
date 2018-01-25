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
var async = require('async');

var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var localCommon = require('./../common');
var normalizer = require('../../../common/utils/normalizer');

describe('system test (type 2) - double delegate registrations', function () {

	var library;
	localCommon.beforeBlock('system_2_2_delegates_4', function (lib) {
		library = lib;
	});

	var i = 0;
	var t = 0;
	while (i < 30) {

		describe('executing 30 times', function () {

			var account = randomUtil.account();
			var account2 = randomUtil.account();
			var transaction, transaction1, transaction2;
			transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

			before(function (done) {
				console.log(++t);
				localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
					done();
				});
			});

			describe('with two different accounts using different username', function () {

				before(function (done) {
					transaction1 = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
					transaction2 = lisk.transaction.createTransaction(account2.address, 1000 * normalizer, accountFixtures.genesis.password);
					localCommon.addTransactionsAndForge(library, [transaction1, transaction2], done);
				});

				it('adding to pool delegate registration should be ok', function (done) {
					transaction1 = lisk.delegate.createDelegate(account.password, account.username);
					localCommon.addTransaction(library, transaction1, function (err, res) {
						expect(res).to.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from different account and same username should be ok', function (done) {
					transaction2 = lisk.delegate.createDelegate(account2.password, account2.username);
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

					it('both transactions should be included', function (done) {
						async.every([transaction1, transaction2], function (transaction, callback) {
							var filter = {
								id: transaction.id
							};

							localCommon.getTransactionFromModule(library, filter, function (err, res) {
								expect(err).to.be.null;
								expect(res).to.have.property('transactions').which.is.an('Array');
								expect(res.transactions.length).to.equal(1);
								expect(res.transactions[0].id).to.equal(transaction.id);
								callback(null, !err);
							});
						}, function (err, result) {
							done();
						});
					});

					it('adding to pool delegate registration with already registered username should fail', function (done) {
						localCommon.addTransaction(library, transaction1, function (err, res) {
							expect(err).to.equal('Account is already a delegate');
							done();
						});
					});

					it('adding to pool delegate registration from same account should fail', function (done) {
						localCommon.addTransaction(library, transaction2, function (err, res) {
							expect(err).to.equal('Account is already a delegate');
							done();
						});
					});
				});
			});
		});
		i++;
	};
});