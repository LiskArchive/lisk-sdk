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

var test = require('../../test');
var _  = test._;
var accountFixtures = require('../../fixtures/accounts');

var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');

var localCommon = require('./common');

describe('multisignature', function () {

	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_multisignatures'}}, function (err, scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	describe('with LISK sent to multisignature account', function () {

		var multisigAccount;

		before('send funds to multisignature account', function (done) {
			multisigAccount = randomUtil.account();
			var sendTransaction = lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, accountFixtures.genesis.password);
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('from multisignature account', function () {

			var multisigSender;

			before('get multisignature account', function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('applyUnconfirm transaction', function () {

				var multisigTransaction;
				var signer1 = randomUtil.account();
				var signer2 = randomUtil.account();

				before('applyUnconfirm multisignature transaction', function (done) {
					var keysgroup = [
						'+' + signer1.publicKey,
						'+' + signer2.publicKey
					];

					multisigTransaction = lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
					var sign1 = lisk.multisignature.signTransaction(multisigTransaction, signer1.password);
					var sign2 = lisk.multisignature.signTransaction(multisigTransaction, signer2.password);

					multisigTransaction.signatures = [sign1, sign2];
					multisigTransaction.ready = true;
					library.logic.transaction.applyUnconfirmed(multisigTransaction, multisigSender, done);
				});

				describe('sender db rows', function () {

					var accountRow;

					before('get mem_account, mem_account2multisignature and mem_account2u_multisignature rows', function () {
						return localCommon.getAccountFromDb(library, multisigAccount.address).then(function (res) {
							accountRow = res;
						});
					});

					it('should have no rows in mem_accounts2multisignatures', function () {
						expect(accountRow.mem_accounts2multisignatures).to.eql([]);
					});

					it('should have multimin field set to 0 on mem_accounts', function () {
						expect(accountRow.mem_accounts.multimin).to.eql(0);
					});

					it('should have multilifetime field set to 0 on mem_accounts', function () {
						expect(accountRow.mem_accounts.multilifetime).to.eql(0);
					});

					it('should include rows in mem_accounts2u_multisignatures', function () {
						var signKeysInDb = _.map(accountRow.mem_accounts2u_multisignatures, function (row) {
							return row.dependentId;
						});
						expect(signKeysInDb).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should set u_multimin field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.u_multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should set u_multilifetime field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.u_multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});
				});

				describe('sender account', function () {

					var account;

					before('get multisignature account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.not.exist;
							account = res;
							done();
						});
					});

					it('should have u_multisignatures field set on account', function () {
						expect(account.u_multisignatures).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should have multimin field set on account', function () {
						expect(account.u_multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should have multilifetime field set on account', function () {
						expect(account.u_multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});
				});

				describe('with another multisig transaction', function () {

					var multisigTransaction2;
					var signer3 = randomUtil.account();
					var signer4 = randomUtil.account();

					before('process multisignature transaction', function (done) {
						var keysgroup = [
							'+' + signer3.publicKey,
							'+' + signer4.publicKey
						];
						multisigTransaction2 = lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
						var sign3 = lisk.multisignature.signTransaction(multisigTransaction2, signer3.password);
						var sign4 = lisk.multisignature.signTransaction(multisigTransaction2, signer4.password);
						multisigTransaction2.signatures = [sign3, sign4];
						library.logic.transaction.process(multisigTransaction2, multisigSender, done);
					});

					describe('from the same account', function () {

						before('get multisignature account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								multisigSender = res;
								done();
							});
						});

						it('should verify transaction', function (done) {
							library.logic.transaction.verify(multisigTransaction2, multisigSender, done);
						});
					});
				});
			});
		});
	});

	describe('with LISK sent to multisignature account', function () {

		var multisigAccount;

		before('send funds to multisignature account', function (done) {
			multisigAccount = randomUtil.account();
			var sendTransaction = lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, accountFixtures.genesis.password);
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('from multisignature account', function () {

			var multisigSender;

			before('get multisignature account', function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('after forging block with multisignature transaction', function () {

				var multisigTransaction;
				var signer1 = randomUtil.account();
				var signer2 = randomUtil.account();

				before('forge block with multisignature transaction', function (done) {
					var keysgroup = [
						'+' + signer1.publicKey,
						'+' + signer2.publicKey
					];

					multisigTransaction = lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
					var sign1 = lisk.multisignature.signTransaction(multisigTransaction, signer1.password);
					var sign2 = lisk.multisignature.signTransaction(multisigTransaction, signer2.password);

					multisigTransaction.signatures = [sign1, sign2];
					multisigTransaction.ready = true;
					localCommon.addTransactionsAndForge(library, [multisigTransaction], done);
				});

				describe('sender db rows', function () {
					var accountRow;

					before('get mem_account, mem_account2multisignature and mem_account2u_multisignature rows', function () {
						return localCommon.getAccountFromDb(library, multisigAccount.address).then(function (res) {
							accountRow = res;
						});
					});

					it('should include rows in mem_accounts2multisignatures', function () {
						var signKeysInDb = _.map(accountRow.mem_accounts2multisignatures, function (row) {
							return row.dependentId;
						});
						expect(signKeysInDb).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should set multimin field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should set multilifetime field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});

					it('should include rows in mem_accounts2u_multisignatures', function () {
						var signKeysInDb = _.map(accountRow.mem_accounts2u_multisignatures, function (row) {
							return row.dependentId;
						});
						expect(signKeysInDb).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should set u_multimin field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.u_multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should set u_multilifetime field set on mem_accounts', function () {
						expect(accountRow.mem_accounts.u_multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});
				});

				describe('sender account', function () {

					var account;

					before('get multisignature account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.not.exist;
							account = res;
							done();
						});
					});

					it('should have multisignatures field set on account', function () {
						expect(account.multisignatures).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should have multimin field set on account', function () {
						expect(account.multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should have multilifetime field set on account', function () {
						expect(account.multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});

					it('should have u_multisignatures field set on account', function () {
						expect(account.u_multisignatures).to.include(signer1.publicKey, signer2.publicKey);
					});

					it('should have u_multimin field set on account', function () {
						expect(account.u_multimin).to.eql(multisigTransaction.asset.multisignature.min);
					});

					it('should have u_multilifetime field set on account', function () {
						expect(account.u_multilifetime).to.eql(multisigTransaction.asset.multisignature.lifetime);
					});
				});

				describe('after deleting block', function () {

					before('delete last block', function (done) {
						var last_block = library.modules.blocks.lastBlock.get();
						library.modules.blocks.chain.deleteLastBlock(done);
					});

					describe('sender db rows', function () {
						var accountRow;

						before('get mem_account, mem_account2multisignature and mem_account2u_multisignature rows', function () {
							return localCommon.getAccountFromDb(library, multisigAccount.address).then(function (res) {
								accountRow = res;
							});
						});

						it('should have no rows in mem_accounts2multisignatures', function () {
							expect(accountRow.mem_accounts2multisignatures).to.eql([]);
						});

						it('should have multimin field set to 0 on mem_accounts', function () {
							expect(accountRow.mem_accounts.multimin).to.eql(0);
						});

						it('should have multilifetime field set to 0 on mem_accounts', function () {
							expect(accountRow.mem_accounts.multilifetime).to.eql(0);
						});

						it('should have no rows in mem_accounts2u_multisignatures', function () {
							expect(accountRow.mem_accounts2u_multisignatures).to.eql([]);
						});

						it('should have u_multimin field set to 0 on mem_accounts', function () {
							expect(accountRow.mem_accounts.u_multimin).to.eql(0);
						});

						it('should have multilifetime field to 0 on mem_accounts', function () {
							expect(accountRow.mem_accounts.u_multilifetime).to.eql(0);
						});
					});

					describe('sender account', function () {

						var account;

						before('get multisignature account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.not.exist;
								account = res;
								done();
							});
						});

						it('should set multisignatures field to null on account', function () {
							expect(account.multisignatures).to.eql(null);
						});

						it('should set multimin field to 0 on account', function () {
							expect(account.multimin).to.eql(0);
						});

						it('should set multilifetime field to 0 on account', function () {
							expect(account.multilifetime).to.eql(0);
						});

						it('should set u_multisignatures field to null on account', function () {
							expect(account.u_multisignatures).to.eql(null);
						});

						it('should set u_multimin field to null on account', function () {
							expect(account.u_multimin).to.eql(0);
						});

						it('should set u_multilifetime field to null on account', function () {
							expect(account.u_multilifetime).to.eql(0);
						});
					});
				});
			});
		});
	});
});
