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

describe('system test (type 3) - voting with duplicate submissions', function () {
	
	var library;
	localCommon.beforeBlock('system_3_3_votes', function (lib) {
		library = lib;
	});

	var i = 0;
	var t = 0;
	while (i < 30) {

		describe('executing 30 times', function () {

			var transaction1, transaction2, transaction3, transaction4;
			var account, transaction;

			account = randomUtil.account();
			transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

			before(function (done){
				console.log(++t);
				localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
					done();
				});
			});

			it('adding to pool upvoting transaction should be ok', function (done) {
				transaction1 = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey], null, -1);
				localCommon.addTransaction(library, transaction1, function (err, res) {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('adding to pool upvoting transaction for same delegate from same account with different id should be ok', function (done) {
				transaction2 = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey]);
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

				it('first upvoting transaction to arrive should not be included', function (done) {
					var filter = {
						id: transaction1.id
					};
					localCommon.getTransactionFromModule(library, filter, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.have.property('transactions').which.is.an('Array');
						expect(res.transactions.length).to.equal(0);
						done();
					});
				});

				it('last upvoting transaction to arrive should be included', function (done) {
					var filter = {
						id: transaction2.id
					};
					localCommon.getTransactionFromModule(library, filter, function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.have.property('transactions').which.is.an('Array');
						expect(res.transactions.length).to.equal(1);
						expect(res.transactions[0].id).to.equal(transaction2.id);
						done();
					});
				});

				it('adding to pool upvoting transaction to same delegate from same account should fail', function (done) {
					localCommon.addTransaction(library, transaction1, function (err, res) {
						expect(err).to.equal('Failed to add vote, delegate "' + accountFixtures.existingDelegate.delegateName + '" already voted for');
						done();
					});
				});

				it('adding to pool downvoting transaction to same delegate from same account should be ok', function (done) {
					transaction3 = lisk.vote.createVote(account.password, ['-' + accountFixtures.existingDelegate.publicKey], null, -1);
					localCommon.addTransaction(library, transaction3, function (err, res) {
						expect(res).to.equal(transaction3.id);
						done();
					});
				});

				it('adding to pool downvoting transaction to same delegate from same account with different id should be ok', function (done) {
					transaction4 = lisk.vote.createVote(account.password, ['-' + accountFixtures.existingDelegate.publicKey]);
					localCommon.addTransaction(library, transaction4, function (err, res) {
						expect(res).to.equal(transaction4.id);
						done();
					});
				});

				describe('after forging a second block', function () {

					before(function (done) {
						localCommon.forge(library, function (err, res) {
							done();
						});
					});

					it('first downvoting transaction to arrive should not be included', function (done) {
						var filter = {
							id: transaction3.id
						};
						localCommon.getTransactionFromModule(library, filter, function (err, res) {
							expect(err).to.not.exist;
							expect(res).to.have.property('transactions').which.is.an('Array');
							expect(res.transactions.length).to.equal(0);
							done();
						});
					});

					it('last downvoting transaction to arrive should be included', function (done) {
						var filter = {
							id: transaction4.id
						};
						localCommon.getTransactionFromModule(library, filter, function (err, res) {
							expect(err).to.not.exist;
							expect(res).to.have.property('transactions').which.is.an('Array');
							expect(res.transactions.length).to.equal(1);
							expect(res.transactions[0].id).to.equal(transaction4.id);
							done();
						});
					});

					it('adding to pool downvoting transaction to same delegate from same account should fail', function (done) {
						localCommon.addTransaction(library, transaction4, function (err, res) {
							expect(err).to.equal('Failed to remove vote, delegate "' + accountFixtures.existingDelegate.delegateName + '" was not voted for');
							done();
						});
					});
				});
			});
		});
		i++;
	};
});