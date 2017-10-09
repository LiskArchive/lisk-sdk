'use strict';/*eslint*/

var node = require('./../node.js');


var ed = require('../../helpers/ed');
var bignum = require('../../helpers/bignum.js');
var crypto = require('crypto');
var async = require('async');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;
var _  = require('lodash');
var transactionTypes = require('../../helpers/transactionTypes');
var slots = require('../../helpers/slots');

var modulesLoader = require('../common/initModule').modulesLoader;
var Transaction = require('../../logic/transaction.js');
var Rounds = require('../../modules/rounds.js');
var AccountLogic = require('../../logic/account.js');
var AccountModule = require('../../modules/accounts.js');

var Vote = require('../../logic/vote.js');
var Transfer = require('../../logic/transfer.js');
var Delegate = require('../../logic/delegate.js');
var Signature = require('../../logic/signature.js');
var Multisignature = require('../../logic/multisignature.js');

var genesisBlock = require('../../genesisBlock.json');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var senderHash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var gAccount = _.cloneDeep(node.gAccount);
gAccount.u_balance = '1000000000000';
gAccount.balance = '1000000000000';


describe('multisignature', function () {

	var rounds;
	var transaction;
	var multisignature;
	var accounts;
	var account;

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope,cb);
			},
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, function (err, __account) {
					account = __account;
					cb(err, account);
				});
			},
			transaction: ['accountLogic', function (result, cb) {
				var ed = require('../../helpers/ed');
				// Not all properties are set correctly, only setting the required properties
				new Transaction(modulesLoader.db, ed, modulesLoader.schema, {block: genesisBlock},
					account, modulesLoader.logger, cb);
			}]
		}, function (err, result) {
			transaction = result.transaction;
			transaction.bindModules(result);
			rounds = result.rounds;

			done();
		});
	});

	describe('with bounded dependencies', function () {

		function getAccountsModule (account, transaction, done) {
			modulesLoader.initModuleWithDb(AccountModule, function (err, __accountModule) {
				accounts = __accountModule;
				done(err, accounts);
			},{
				logic: {
					account: account,
					transaction: transaction
				}
			});
		}

		function attachMultisignatureAsset (transaction, account, accounts, rounds, done) {
			multisignature  = new Multisignature(
				modulesLoader.scope.schema, 
				modulesLoader.scope.network,
				transaction,
				modulesLoader.logger
			);

			multisignature.bind(accounts, rounds);
			transaction.attachAssetType(transactionTypes.MULTI, multisignature);
			done();
		}

		function attachTransferAsset (transaction, account, accounts, rounds, done) {
			var transfer = new Transfer();
			transfer.bind(accounts, rounds);
			transaction.attachAssetType(transactionTypes.SEND, transfer);
			done();
		};

		beforeEach(function (done) {
			async.series([function (cb) {
				getAccountsModule(account, transaction, cb);
			}, function (cb) {
				attachMultisignatureAsset(transaction, account, accounts, rounds, cb); 
			}, function (cb) {
				attachTransferAsset(transaction, account, accounts, rounds, cb);
			}], function (err, res) {
				done(err);
			});
		});

		describe('with LISK sent to multisig account', function () {

			var multisigAccount;
			var dummyBlock = {
				height: 10,
			};

			beforeEach(function (done) {
				multisigAccount = node.randomAccount();

				var sendTrs = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, gAccount.password);

				async.series([
					function (cb) {
						transaction.process(sendTrs, gAccount, cb);
					},
					function (cb) {
						transaction.verify(sendTrs, gAccount, cb);
					},
					function (cb) {
						transaction.applyUnconfirmed(sendTrs, gAccount, cb);
					},
					function (cb) {
						transaction.apply(sendTrs, dummyBlock, gAccount, cb);
					}
				], function (err) {
					expect(err).to.not.exist;
					done();
				});
			});

			describe('from multisig account', function () {

				var multisigSender;

				beforeEach(function (done) {
					account.get({
						address: multisigAccount.address
					}, function (err, acc) {
						multisigSender = acc;
						done();
					});
				});

				describe('applyUnconfirm multisig transaction', function () {

					var multisigTrs;
					var signer1 = node.randomAccount();
					var signer2 = node.randomAccount();

					beforeEach(function (done) {
						var keysgroup = [
							'+' + signer1.publicKey,
							'+' + signer2.publicKey
						];

						multisigTrs = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
						var sign1 = node.lisk.multisignature.signTransaction(multisigTrs, signer1.password);
						var sign2 = node.lisk.multisignature.signTransaction(multisigTrs, signer2.password);

						multisigTrs.signatures = [sign1, sign2];

						async.series([
							function (cb) {
								transaction.process(multisigTrs, multisigSender, cb);
							}, function (cb) {
								transaction.verify(multisigTrs, multisigSender, cb);
							}, function (cb) {
								transaction.applyUnconfirmed(multisigTrs, multisigSender, cb);
							}
						], function (err) {
							expect(err).to.not.exist;
							done();
						});
					});

					describe('from the same account', function () {

						var multisigTrs2;
						var signer3 = node.randomAccount();
						var signer4 = node.randomAccount();

						beforeEach(function (done) {
							account.get({
								address: multisigAccount.address
							}, function (err, acc) {
								multisigSender = acc;
								done();
							});
						});

						describe('should verify another multisiganture transaction', function () {

							beforeEach(function (done) {
								var keysgroup = [
									'+' + signer3.publicKey,
									'+' + signer4.publicKey
								];

								multisigTrs2 = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
								var sign3 = node.lisk.multisignature.signTransaction(multisigTrs2, signer3.password);
								var sign4 = node.lisk.multisignature.signTransaction(multisigTrs2, signer4.password);
								multisigTrs2.signatures = [sign3, sign4];
								transaction.process(multisigTrs2, multisigSender, done);
							});

							it('should verify transaction', function (done) {
								transaction.verify(multisigTrs2, multisigSender, done);
							});
						});
					});
				});
			});
		});
	});
});
