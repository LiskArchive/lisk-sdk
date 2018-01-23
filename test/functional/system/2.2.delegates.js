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

describe('system test (type 2) - double delegate registrations @unstable', function () {

	var library;
	localCommon.beforeBlock('system_2_2_delegates', function (lib) {
		library = lib;
	});

	var i = 0;
	var t = 0;
	while (i < 30) {

		describe('executing 30 times', function () {

			var account = randomUtil.account();
			var account2 = randomUtil.account();
			var transaction, transaction1, transaction2, transaction3, transacion4;
			var differentDelegateName = randomUtil.delegateName();
			transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);

			before(function (done) {
				console.log(++t);
				localCommon.addTransactionsAndForge(library, [transaction], function (err, res) {
					done();
				});
			});

			describe('with same account', function () {

				describe('using same username and different timestamps', function () {

					it('adding to pool delegate registration should be ok', function (done) {
						transaction1 = lisk.delegate.createDelegate(account.password, account.username, null, -1);
						localCommon.addTransaction(library, transaction1, function (err, res) {
							res.should.equal(transaction1.id);
							done();
						});
					});

					it('adding to pool delegate registration from same account with different id should be ok', function (done) {
						transaction2 = lisk.delegate.createDelegate(account.password, account.username);
						localCommon.addTransaction(library, transaction2, function (err, res) {
							res.should.equal(transaction2.id);
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
								should.not.exist(err);
								res.should.have.property('transactions').which.is.an('Array');
								res.transactions.length.should.equal(0);
								done();
							});
						});

						it('last delegate registration to arrive should be included', function (done) {
							var filter = {
								id: transaction2.id
							};
							localCommon.getTransactionFromModule(library, filter, function (err, res) {
								should.not.exist(err);
								res.should.have.property('transactions').which.is.an('Array');
								res.transactions.length.should.equal(1);
								res.transactions[0].id.should.equal(transaction2.id);
								done();
							});
						});

						it('adding to pool delegate registration from same account should fail', function (done) {
							transaction2 = lisk.delegate.createDelegate(account.password, randomUtil.delegateName());
							localCommon.addTransaction(library, transaction2, function (err, res) {
								err.should.equal('Account is already a delegate');
								done();
							});
						});
					});
				});

				describe('using different usernames', function () {
					
					it('adding to pool delegate registration should be ok', function (done) {
						transaction1 = lisk.delegate.createDelegate(account.password, differentDelegateName);
						localCommon.addTransaction(library, transaction1, function (err, res) {
							res.should.equal(transaction1.id);
							done();
						});
					});

					it('adding to pool delegate registration from same account and different name should be ok', function (done) {
						transaction2 = lisk.delegate.createDelegate(account.password, account.username);
						localCommon.addTransaction(library, transaction2, function (err, res) {
							res.should.equal(transaction2.id);
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
								should.not.exist(err);
								res.should.have.property('transactions').which.is.an('Array');
								res.transactions.length.should.equal(0);
								done();
							});
						});

						it('last delegate registration to arrive should be included', function (done) {
							var filter = {
								id: transaction2.id
							};
							localCommon.getTransactionFromModule(library, filter, function (err, res) {
								should.not.exist(err);
								res.should.have.property('transactions').which.is.an('Array');
								res.transactions.length.should.equal(1);
								res.transactions[0].id.should.equal(transaction2.id);
								done();
							});
						});

						it('adding to pool delegate registration from same account should fail', function (done) {
							transaction2 = lisk.delegate.createDelegate(account.password, randomUtil.delegateName());
							localCommon.addTransaction(library, transaction2, function (err, res) {
								err.should.equal('Account is already a delegate');
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

				after('delete last block', function (done) {
					var last_block = library.modules.blocks.lastBlock.get();
					library.modules.blocks.chain.deleteLastBlock(done);
				});

				it('adding to pool delegate registration should be ok', function (done) {
					transaction1 = lisk.delegate.createDelegate(account.password, account.username);
					localCommon.addTransaction(library, transaction1, function (err, res) {
						res.should.equal(transaction1.id);
						done();
					});
				});

				it('adding to pool delegate registration from different account and same username should be ok', function (done) {
					transaction2 = lisk.delegate.createDelegate(account2.password, account.username);
					localCommon.addTransaction(library, transaction2, function (err, res) {
						res.should.equal(transaction2.id);
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
							should.not.exist(err);
							res.should.have.property('transactions').which.is.an('Array');
							res.transactions.length.should.equal(0);
							done();
						});
					});

					it('last delegate registration to arrive should be included', function (done) {
						var filter = {
							id: transaction2.id
						};
						localCommon.getTransactionFromModule(library, filter, function (err, res) {
							should.not.exist(err);
							res.should.have.property('transactions').which.is.an('Array');
							res.transactions.length.should.equal(1);
							res.transactions[0].id.should.equal(transaction2.id);
							done();
						});
					});

					it('adding to pool delegate registration with already registered username should fail', function (done) {
						localCommon.addTransaction(library, transaction1, function (err, res) {
							err.should.equal('Username ' + account.username + ' already exists');
							done();
						});
					});

					it('adding to pool delegate registration from same account should fail', function (done) {
						localCommon.addTransaction(library, transaction2, function (err, res) {
							err.should.equal('Account is already a delegate');
							done();
						});
					});
				});
			});
		});
		i++;
	};	
});
