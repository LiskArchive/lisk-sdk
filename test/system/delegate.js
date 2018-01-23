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

describe('delegate', function () {

	var library;
	var keypairs;
	var db;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_delegate'}}, function (scope) {
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

		var delegateAccount;

		beforeEach('send funds to delegate account', function (done) {
			delegateAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(delegateAccount.address, 1000000000*100, node.gAccount.password);
			common.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with delegate transaction in unconfirmed state', function () {

			var delegateTransaction;
			var username;

			beforeEach(function (done) {
				username = node.randomUsername().toLowerCase();

				delegateTransaction = node.lisk.delegate.createDelegate(delegateAccount.password, username);
				common.addTransactionToUnconfirmedQueue(library, delegateTransaction, done);
			});

			describe('when receiving block with same transaction', function () {

				beforeEach(function (done) {
					common.createValidBlock(library, [delegateTransaction], function (err, block) {
						expect(err).to.not.exist;
						library.modules.blocks.process.onReceiveBlock(block);
						done();
					});
				});

				describe('unconfirmed state', function () {

					it('should update unconfirmed columns related to delegate', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, delegateAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.u_username).to.equal(username);
								expect(account.mem_accounts.u_isDelegate).to.equal(1);
								seqCb();
								done();
							});
						});
					});
				});

				describe('confirmed state', function () {

					it('should update confirmed columns related to delegate', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, delegateAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.username).to.equal(username);
								expect(account.mem_accounts.isDelegate).to.equal(1);
								seqCb();
								done();
							});
						});
					});
				});
			});

			describe('when receiving block with delegate transaction with different Id', function () {

				var delegateTransaction2;
				var username2;

				beforeEach(function (done) {

					username2 = node.randomUsername().toLowerCase();
					delegateTransaction2 = node.lisk.delegate.createDelegate(delegateAccount.password, username2);
					delegateTransaction2.senderId = delegateAccount.address;
					common.createValidBlock(library, [delegateTransaction2], function (err, block) {
						expect(err).to.not.exist;
						library.modules.blocks.process.onReceiveBlock(block);
						done();
					});
				});

				describe('unconfirmed state', function () {

					it('should update unconfirmed columns related to delegate', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, delegateAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.u_username).to.equal(username2);
								expect(account.mem_accounts.u_isDelegate).to.equal(1);
								seqCb();
								done();
							});
						});
					});
				});

				describe('confirmed state', function () {

					it('should update confirmed columns related to delegate', function (done) {
						library.sequence.add(function (seqCb) {
							common.getAccountFromDb(library, delegateAccount.address).then(function (account) {
								expect(account).to.exist;
								expect(account.mem_accounts.username).to.equal(username2);
								expect(account.mem_accounts.isDelegate).to.equal(1);
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
