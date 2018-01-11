'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var lisk = require('lisk-js');

var test = require('../../../test');
var _  = test._;
var accountFixtures = require('../../../fixtures/accounts');

var application = require('../../../common/application');
var randomUtil = require('../../../common/utils/random');

var localCommon = require('../common');

describe('blocks/chain', function () {
	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_block_chain'}}, function (err, scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	describe('deleteLastBlock', function () {

		describe('errors', function () {

			it('should fail when try to delete genesis block', function (done) {
				library.modules.blocks.chain.deleteLastBlock(function (err, res) {
					expect(err).to.equal('Cannot delete genesis block');
					done();
				});
			});
		});

		describe('single transaction scenarios: create transaction, forge, delete block, forge again', function () {

			var testAccount;
			var testAccountData;
			var testAccountDataAfterBlock;
			var testReceipt;
			var testReceiptData;
			var fieldsToCompare;

			function createAccountWithFunds (done) {
				testAccount = randomUtil.account();
				var sendTransaction = lisk.transaction.createTransaction(testAccount.address, 100000000*100, accountFixtures.genesis.password);
				localCommon.addTransactionsAndForge(library, [sendTransaction], done);
			}

			describe('(type 0) transfer funds', function () {

				before('create account with funds', function (done) {
					createAccountWithFunds(done);
					fieldsToCompare = ['balance', 'u_balance', 'blockId', 'virgin', 'publicKey'];
				});

				it('should validate account data from sender', function (done) {
					library.logic.account.get({address: testAccount.address}, fieldsToCompare, function (err, res) {
						testAccountData = res;
						expect(res.virgin).to.equal(1);
						expect(res.publicKey).to.be.null;
						done();
					});
				});

				it('should create a transaction and forge a block', function (done) {
					testReceipt = randomUtil.account();
					var transferTransaction = lisk.transaction.createTransaction(testReceipt.address, 10000000, testAccount.password);
					localCommon.addTransactionsAndForge(library, [transferTransaction], done);
				});

				it('should validate account data from sender', function (done) {
					library.logic.account.get({address: testAccount.address}, fieldsToCompare, function (err, res) {
						testAccountDataAfterBlock = res;
						expect(res.virgin).to.equal(0);
						expect(res.publicKey).to.not.be.null;
						done();
					});
				});

				it('should get account data from receipt', function (done) {
					library.logic.account.get({address: testReceipt.address}, fieldsToCompare, function (err, res) {
						testReceiptData = res;
						expect(res.virgin).to.equal(1);
						expect(res.publicKey).to.be.null;
						done();
					});
				});

				it('should delete last block', function (done) {
					library.modules.blocks.chain.deleteLastBlock(function (err, res) {
						expect(err).to.not.exist;
						done();
					});
				});

				it('should validate account data from sender', function (done) {
					library.logic.account.get({address: testAccount.address}, fieldsToCompare, function (err, res) {
						expect(res.balance).to.equal(testAccountData.balance);
						expect(res.u_balance).to.equal(testAccountData.u_balance);
						// FIXME: incorrect blockId
						// CHECKME: publicKey should be null
						// CHECKME: virgin should be 1 (account without outgoing transaction)
						done();
					});
				});

				it('should get account data from receipt', function (done) {
					library.logic.account.get({address: testReceipt.address}, fieldsToCompare, function (err, res) {
						expect(res.balance).to.equal('0');
						expect(res.u_balance).to.equal('0');
						// CHECKME: virgin should be 1
						// FIXME: incorrect blockId or it should not exists this address into mem_accounts
						done();
					});
				});

				it('should forge a block with pool transaction', function (done) {
					localCommon.addTransactionsAndForge(library, [], done);
				});

				it('should validate account data from sender', function (done) {
					library.logic.account.get({address: testAccount.address}, fieldsToCompare, function (err, res) {
						expect(res.balance).to.equal(testAccountDataAfterBlock.balance);
						expect(res.u_balance).to.equal(testAccountDataAfterBlock.u_balance);
						expect(res.publicKey).to.equal(testAccountDataAfterBlock.publicKey);
						expect(res.virgin).to.equal(0);
						// TODO blockId is ok because timestamp is not been included in signature and is no new tx
						done();
					});
				});

				it('should get account data from receipt', function (done) {
					library.logic.account.get({address: testReceipt.address}, fieldsToCompare, function (err, res) {
						expect(res.balance).to.equal(testReceiptData.balance);
						expect(res.u_balance).to.equal(testReceiptData.u_balance);
						// FIXME: virgin should be 1 (account without outgoing transaction)
						// TODO blockId is ok because timestamp is not been included in signature and is no new tx
						done();
					});
				});
			});
		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', function () {

		});
	});
});