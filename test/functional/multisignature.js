var node = require('../node.js');
var async = require('async');
var slots = require('../../helpers/slots.js');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var _  = require('lodash');

var modulesLoader = require('../common/initModule.js').modulesLoader;
var DBSandbox = require('../common/globalBefore').DBSandbox;

describe('multisignature', function () {

	var library;
	var db;
	var dbSandbox;
	var SandBox;

	before(function (done) {
		dbSandbox = new DBSandbox(modulesLoader.scope.config.db, 'lisk_test_multisignatures');
		dbSandbox.create(function (err, __db) {
			modulesLoader.db = __db;

			node.initApplication(function (err, scope) {
				library = scope;
				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);

				setTimeout(function () {
					var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');
					loadDelegates(function (err) {
						done(err);
					});
				}, 4000);
			}, {db: __db});
		});	
	});

	function forge (cb) {
		function getNextForger (offset, cb) {
			offset = !offset ? 1 : offset;
			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp);
			library.modules.delegates.generateDelegateList(last_block.height, null, function (err, delegateList) {
				var nextForger = delegateList[(slot + offset) % slots.delegates];
				return cb(nextForger);
			});
		}

		var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');
		var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

		node.async.waterfall([ 
			transactionPool.fillPool,
			function (cb) {
				getNextForger(null, function (delegatePublicKey) {
					cb(null, delegatePublicKey);
				});
			},
			function (delegate, seriesCb) {
				var last_block = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber(last_block.timestamp) + 1;
				var keypair = keypairs[delegate];
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
					if (err) { return seriesCb(err); }
					last_block = library.modules.blocks.lastBlock.get();
					return seriesCb(err);
				});
			}
		], function (err) {
			cb(err);
		});
	}

	function addTransaction (transaction, cb) {
		// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
		// See: modules.transport.__private.receiveTransaction
		library.balancesSequence.add(function (sequenceCb) {
			library.modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
				if (err) {
					return setImmediate(sequenceCb, err.toString());
				} else {
					return setImmediate(sequenceCb, null, transaction.id);
				}
			});
		}, cb);
	}

	function addTransactionsAndForge (transactions, cb) {
		node.async.waterfall([
			function addTransactions (waterCb) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					addTransaction(transaction, eachSeriesCb);
				}, waterCb);
			},
			function (waterCb) {
				setTimeout(function () {
					forge(waterCb);
				}, 800);
			}
		], function (err) {
			cb(err);
		});
	}



	describe('with LISK sent to multisig account', function () {

		var multisigAccount;

		before(function (done) {
			multisigAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, node.gAccount.password);
			addTransactionsAndForge([sendTransaction], done);
		});

		describe('from multisig account', function () {

			var multisigSender;

			before(function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('applyUnconfirm transaction', function () {
				var multisigTransaction;
				var signer1 = node.randomAccount();
				var signer2 = node.randomAccount();

				before(function (done) {
					var keysgroup = [
						'+' + signer1.publicKey,
						'+' + signer2.publicKey
					];

					multisigTransaction = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
					var sign1 = node.lisk.multisignature.signTransaction(multisigTransaction, signer1.password);
					var sign2 = node.lisk.multisignature.signTransaction(multisigTransaction, signer2.password);

					multisigTransaction.signatures = [sign1, sign2];
					multisigTransaction.ready = true;
					library.logic.transaction.applyUnconfirmed(multisigTransaction, multisigSender, done);
				});

				describe('sender account', function () {

					var account;

					before(function (done) {
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
					var signer3 = node.randomAccount();
					var signer4 = node.randomAccount();

					before(function (done) {
						var keysgroup = [
							'+' + signer3.publicKey,
							'+' + signer4.publicKey
						];

						multisigTransaction2 = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
						var sign3 = node.lisk.multisignature.signTransaction(multisigTransaction2, signer3.password);
						var sign4 = node.lisk.multisignature.signTransaction(multisigTransaction2, signer4.password);
						multisigTransaction2.signatures = [sign3, sign4];
						library.logic.transaction.process(multisigTransaction2, multisigSender, done);
					});

					describe('from the same account', function () {

						before(function (done) {
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

	describe('with LISK sent to multisig account', function () {

		var multisigAccount;

		before(function (done) {
			multisigAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, node.gAccount.password);
			addTransactionsAndForge([sendTransaction], done);
		});

		describe('from multisig account', function () {

			var multisigSender;

			before(function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('after forging Block with multisig transaction', function () {

				var multisigTransaction;
				var signer1 = node.randomAccount();
				var signer2 = node.randomAccount();

				before(function (done) {
					var keysgroup = [
						'+' + signer1.publicKey,
						'+' + signer2.publicKey
					];

					multisigTransaction = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
					var sign1 = node.lisk.multisignature.signTransaction(multisigTransaction, signer1.password);
					var sign2 = node.lisk.multisignature.signTransaction(multisigTransaction, signer2.password);

					multisigTransaction.signatures = [sign1, sign2];
					multisigTransaction.ready = true;
					addTransactionsAndForge([multisigTransaction], done);
				});

				describe('sender account', function () {

					var account;

					before(function (done) {
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
				});

				describe('after deleting block', function () {

					before(function (done) {
						var last_block = library.modules.blocks.lastBlock.get();
						library.modules.blocks.chain.deleteLastBlock(done);
					});

					describe('sender account', function () {

						var account;

						before(function (done) {
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
