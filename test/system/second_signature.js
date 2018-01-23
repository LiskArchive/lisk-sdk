var node = require('../node.js');
var async = require('async');
var slots = require('../../helpers/slots.js');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var Promise = require('bluebird');
var _  = require('lodash');
var common = require('./common.js');

var genesisBlock = require('./../genesisBlock.json');
var application = require('./../common/application');

describe('signature', function () {

	var library;
	var keypairs;
	var db;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_signature'}}, function (scope) {
			library = scope;
			db = library.db;
			keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	afterEach(function (done) {
		db.task(function (t) {
			return t.batch([
				db.none('DELETE FROM blocks WHERE "height" > 1;'),
				db.none('DELETE FROM forks_stat;')
			]);
		}).then(function () {
			library.modules.blocks.lastBlock.set(genesisBlock);
			done();
		});
	});

	describe('with funds inside account', function (done) {

		var signatureAccount;

		beforeEach('send funds to signature account', function (done) {
			signatureAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(signatureAccount.address, 1000000000*100, node.gAccount.password);
			common.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with signature transaction in unconfirmed state', function () {

			var signatureTransaction;

			beforeEach(function (done) {
				signatureTransaction = node.lisk.signature.createSignature(signatureAccount.password, signatureAccount.secondPassword);
				common.addTransactionToUnconfirmedQueue(library, signatureTransaction, done);
			});

			describe('when receiving block with same transaction', function () {

				beforeEach(function (done) {
					common.createValidBlock(library, [signatureTransaction], function (err, block) {
						expect(err).to.not.exist;
						debugger;
						library.modules.blocks.process.onReceiveBlock(block);
						done();
					});
				});

				describe('unconfirmed state', function () {

					it('should update unconfirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.u_secondSignature).to.equal(1);
								seqCb();
								done();
							});
						});
					});
				});

				describe('confirmed state', function () {

					it('should update confirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.secondSignature).to.equal(1);
								expect(account.mem_accounts.secondPublicKey.toString('hex')).to.equal(signatureTransaction.asset.signature.publicKey);
								seqCb();
								done();
							});
						});
					});
				});
			});

			describe('when receiving block with signature transaction with different Id', function () {

				var signatureTransaction2;
				var username2;

				beforeEach(function (done) {
					username2 = node.randomUsername().toLowerCase();
					signatureTransaction2 = node.lisk.signature.createSignature(signatureAccount.password, node.randomPassword());
					signatureTransaction2.senderId = signatureAccount.address;
					common.createValidBlock(library, [signatureTransaction2], function (err, block) {
						expect(err).to.not.exist;
						library.modules.blocks.process.onReceiveBlock(block);
						done();
					});
				});

				describe('unconfirmed state', function () {

					it('should update unconfirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.u_secondSignature).to.equal(1);
								seqCb();
								done();
							});
						});
					});
				});

				describe('confirmed state', function () {

					it('should update confirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.secondSignature).to.equal(1);
								expect(account.mem_accounts.secondPublicKey.toString('hex')).to.equal(signatureTransaction2.asset.signature.publicKey);
								seqCb();
								done();
							});
						});
					});
				});
			});

			describe('when receiving block with multiple signature transaction with different Id for same account', function () {

				var signatureTransaction2;
				var signatureTransaction3;
				var username2;
				var blockId;

				beforeEach(function (done) {
					username2 = node.randomUsername().toLowerCase();
					signatureTransaction2 = node.lisk.signature.createSignature(signatureAccount.password, node.randomPassword());
					signatureTransaction2.senderId = signatureAccount.address;

					signatureTransaction3 = node.lisk.signature.createSignature(signatureAccount.password, node.randomPassword());
					signatureTransaction3.senderId = signatureAccount.address;
					common.createValidBlock(library, [signatureTransaction2, signatureTransaction3], function (err, block) {
						blockId = block.id;
						expect(err).to.not.exist;
						library.modules.blocks.process.onReceiveBlock(block);
						done();
					});
				});

				describe('should reject block', function () {

					it('should not save block to the database', function (done) {
						common.getBlocks(library, function (err, ids) {
							expect(ids).to.not.include(blockId);
							expect(ids).to.have.length(2);
							done();
						});
					});
				});

				describe('unconfirmed state', function () {

					it('should not update unconfirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.u_secondSignature).to.equal(0);
								seqCb();
								done();
							});
						});
					});
				});

				describe('confirmed state', function () {

					it('should not update confirmed columns related to signature', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, signatureAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.secondSignature).to.equal(0);
								expect(account.mem_accounts.secondPublicKey).to.equal(null);
								seqCb();
								done();
							});
						});
					});
				});
			});
		});
	});
});
