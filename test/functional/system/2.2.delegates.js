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
var normalizer = require('../../common/utils/normalizer');
var localCommon = require('./common');
var accountFixtures = require('../../fixtures/accounts');

describe('System test (type 2) double delegate registration', function () {

	var library;

	var account = randomUtil.account();
	var account2 = randomUtil.account();
	var transaction, transaction1, transaction2, transaction3, transacion4;
	var differentDelegateName = randomUtil.delegateName();

	localCommon.beforeBlock('system_2_delegates', account, randomUtil.application(), function (lib, sender) {
		library = lib;
	});

	describe('with same account', function () {

		describe('using same username and different timestamps', function () {

			it('add to pool delegate registration should be ok', function (done) {
				transaction1 = lisk.delegate.createDelegate(account.password, account.username, null, -1);
				localCommon.addTransaction(library, transaction1, function (err, res) {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('add to pool delegate registration from same account and different name should be ok', function (done) {
				transaction2 = lisk.delegate.createDelegate(account.password, account.username);
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

				after('delete last block', function (done) {
					var last_block = library.modules.blocks.lastBlock.get();
					library.modules.blocks.chain.deleteLastBlock(done);
				});

				it('first delegate registration to arrive should not be included', function (done) {
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

				it('last delegate registration to arrive should be included', function (done) {
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

				it('add to pool delegate registration from same account should fail', function (done) {
					localCommon.addTransaction(library, transaction2, function (err, res) {
						expect(err).to.equal('Account is already a delegate');
						done();
					});
				});
			});
		});

		describe('using different usernames', function () {
			
			it('add to pool delegate registration should be ok', function (done) {
				transaction1 = lisk.delegate.createDelegate(account.password, differentDelegateName);
				localCommon.addTransaction(library, transaction1, function (err, res) {
					expect(res).to.equal(transaction1.id);
					done();
				});
			});

			it('add to pool delegate registration from same account and different name should be ok', function (done) {
				transaction2 = lisk.delegate.createDelegate(account.password, account.username);
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

				after('delete last block', function (done) {
					var last_block = library.modules.blocks.lastBlock.get();
					library.modules.blocks.chain.deleteLastBlock(done);
				});

				it('first delegate registration to arrive should not be included', function (done) {
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

				it('last delegate registration to arrive should be included', function (done) {
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

				it('add to pool delegate registration from same account should fail', function (done) {
					localCommon.addTransaction(library, transaction2, function (err, res) {
						expect(err).to.equal('Account is already a delegate');
						done();
					});
				});
			});
		});
	});

	describe('with two different accounts using same username and same timestamp', function () {

		before(function (done) {
			transaction = lisk.transaction.createTransaction(account2.address, 1000 * normalizer, accountFixtures.genesis.password);
			localCommon.addTransactionsAndForge(library, [transaction], done);
		});

		it('add to pool delegate registration should be ok', function (done) {
			transaction1 = lisk.delegate.createDelegate(account.password, account.username);
			localCommon.addTransaction(library, transaction1, function (err, res) {
				expect(res).to.equal(transaction1.id);
				done();
			});
		});

		it('add to pool delegate registration from different account and same username should be ok', function (done) {
			transaction2 = lisk.delegate.createDelegate(account2.password, account.username);
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

			after('delete last block', function (done) {
				var last_block = library.modules.blocks.lastBlock.get();
				library.modules.blocks.chain.deleteLastBlock(done);
			});

			it('first delegate registration to arrive should not be included', function (done) {
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

			it('last delegate registration to arrive should be included', function (done) {
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

			it('add to pool delegate registration with username already registered should fail', function (done) {
				localCommon.addTransaction(library, transaction1, function (err, res) {
					expect(err).to.equal('Username ' + account.username + ' already exists');
					done();
				});
			});

			it('add to pool delegate registration from same account should fail', function (done) {
				localCommon.addTransaction(library, transaction2, function (err, res) {
					expect(err).to.equal('Account is already a delegate');
					done();
				});
			});
		});
	});
});
