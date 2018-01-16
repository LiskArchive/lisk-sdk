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

describe('System test (type 3) voting with duplicate submissions', function () {

	var library;

	var account = randomUtil.account();
	var transaction1, transaction2, transaction3, transacion4;

	localCommon.beforeBlock('system_3_votes', account, randomUtil.application(), function (lib, sender) {
		library = lib;
	});

	it('add to pool upvoting transaction should be ok', function (done) {
		transaction1 = lisk.vote.createVote(account.password, ['+' + accountFixtures.existingDelegate.publicKey], null, -1);
		localCommon.addTransaction(library, transaction1, function (err, res) {
			expect(res).to.equal(transaction1.id);
			done();
		});
	});

	it('add to pool upvoting transaction for same delegate from same account with different id should be ok', function (done) {
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

		it('add to pool upvoting transaction to same delegate from same account should fail', function (done) {
			localCommon.addTransaction(library, transaction1, function (err, res) {
				expect(err).to.equal('Failed to add vote, delegate "' + accountFixtures.existingDelegate.delegateName + '" already voted for');
				done();
			});
		});

		it('add to pool downvoting transaction to same delegate from same account should be ok', function (done) {
			transaction3 = lisk.vote.createVote(account.password, ['-' + accountFixtures.existingDelegate.publicKey], null, -1);
			localCommon.addTransaction(library, transaction3, function (err, res) {
				expect(res).to.equal(transaction3.id);
				done();
			});
		});

		it('add to pool downvoting transaction to same delegate from same account with different id should be ok', function (done) {
			transacion4 = lisk.vote.createVote(account.password, ['-' + accountFixtures.existingDelegate.publicKey]);
			localCommon.addTransaction(library, transacion4, function (err, res) {
				expect(res).to.equal(transacion4.id);
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
					id: transacion4.id
				};
				localCommon.getTransactionFromModule(library, filter, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transactions').which.is.an('Array');
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(transacion4.id);
					done();
				});
			});

			it('add to pool downvoting transaction to same delegate from same account should fail', function (done) {
				localCommon.addTransaction(library, transacion4, function (err, res) {
					expect(err).to.equal('Failed to remove vote, delegate "' + accountFixtures.existingDelegate.delegateName + '" was not voted for');
					done();
				});
			});
		});
	});
});
