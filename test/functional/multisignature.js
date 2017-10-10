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
		dbSandbox = new DBSandbox(modulesLoader.scope.config.db, 'lisk_test_accounts');
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
				}, 3000);
			}, {db: __db});
		});	
	});

	function forge (cb) {
		function getNextForger (offset, cb) {
			offset = !offset ? 1 : offset;

			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp);
			library.modules.delegates.generateDelegateList(last_block.height, function (err, delegateList) {
				return cb(delegateList[(slot + offset) % slots.delegates]);
			});
		}

		var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');
		var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

		node.async.auto({ 
			transactionPool: transactionPool.fillPool,
			getNextForger: function (cb) {
				getNextForger(1, function (delegatePublicKey) {
					cb(null, delegatePublicKey);
				});
			},
			processBlock: ['getNextForger', function (scope, seriesCb) {
				var last_block = library.modules.blocks.lastBlock.get();
				var delegate = scope.getNextForger;
				var slot = slots.getSlotNumber(last_block.timestamp) + 1;
				var keypair = keypairs[delegate];
				//node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
					if (err) { return seriesCb(err); }
					last_block = library.modules.blocks.lastBlock.get();
					//node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
					return seriesCb(err);
				});
			}]
		}, function (err) {
			cb(err);
		});
	}

	function addTransaction (transaction, cb) {
		//node.debug('	Add transaction ID: ' + transaction.id);
		// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
		// See: modules.transport.__private.receiveTransaction
		// Add transaction to processed_txs
		library.balancesSequence.add(function (sequenceCb) {
			debugger;
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
				}, 200);
			}
		], function (err) {
			cb(err);
		});
	}

	describe('with LISK sent to multisig account', function () {

		var multisigAccount;
		var dummyBlock = {
			height: 10,
		};

		beforeEach(function (done) {
			multisigAccount = node.randomAccount();

			var sendTrs = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, node.gAccount.password);

			addTransactionsAndForge([sendTrs], done);
		});

		describe('from multisig account', function () {

			var multisigSender;

			beforeEach(function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('with multisig transaction', function () {

				var multisigTrs;
				var signer1 = node.randomAccount();
				var signer2 = node.randomAccount();

				beforeEach(function () {
					var keysgroup = [
						'+' + signer1.publicKey,
						'+' + signer2.publicKey
					];

					multisigTrs = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
					var sign1 = node.lisk.multisignature.signTransaction(multisigTrs, signer1.password);
					var sign2 = node.lisk.multisignature.signTransaction(multisigTrs, signer2.password);

					multisigTrs.signatures = [sign1, sign2];
					multisigTrs.ready = true;
				});

				describe('applyUnconfirm transaction', function () {

					beforeEach(function (done) {
						library.logic.transaction.applyUnconfirmed(multisigTrs, multisigSender, done);
					});

					it('should have u_multisignatures field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.be.null;
							expect(res.u_multisignatures).to.include(signer1.publicKey, signer2.publicKey);
							done();
						});
					});

					it('should have u_multimin field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.be.null;
							expect(res.u_multimin).to.eql(multisigTrs.asset.multisignature.min);
							done();
						});
					});

					it('should have u_multilifetime field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.be.null;
							expect(res.u_multilifetime).to.eql(multisigTrs.asset.multisignature.lifetime);
							done();
						});
					});

					describe('with another multisig transaction', function () {

						var multisigTrs2;
						var signer3 = node.randomAccount();
						var signer4 = node.randomAccount();

						beforeEach(function (done) {
							var keysgroup = [
								'+' + signer3.publicKey,
								'+' + signer4.publicKey
							];

							multisigTrs2 = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 4, 2);
							var sign3 = node.lisk.multisignature.signTransaction(multisigTrs2, signer3.password);
							var sign4 = node.lisk.multisignature.signTransaction(multisigTrs2, signer4.password);
							multisigTrs2.signatures = [sign3, sign4];
							library.logic.transaction.process(multisigTrs2, multisigSender, done);
						});

						describe('from the same account', function () {

							beforeEach(function (done) {
								library.logic.account.get({address: multisigAccount.address}, function (err, res) {
									multisigSender = res;
									done();
								});
							});

							it('should verify transaction', function (done) {
								library.logic.transaction.verify(multisigTrs2, multisigSender, done);
							});
						});
					});
				});

				describe('after forging Block with multisig transaction', function () {

					beforeEach(function (done) {
						addTransactionsAndForge([multisigTrs], done);
					});

					it('should have multisignatures field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.not.exist;
							expect(res.multisignatures).to.include(signer1.publicKey, signer2.publicKey);
							done();
						});
					});


					it('should have multimin field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.be.null;
							expect(res.multimin).to.eql(multisigTrs.asset.multisignature.min);
							done();
						});
					});

					it('should have multilifetime field set on account', function (done) {
						library.logic.account.get({address: multisigAccount.address}, function (err, res) {
							expect(err).to.be.null;
							expect(res.multilifetime).to.eql(multisigTrs.asset.multisignature.lifetime);
							done();
						});
					});

					describe('after deleting block', function () {

						beforeEach(function (done) {
							var last_block = library.modules.blocks.lastBlock.get();
							library.modules.blocks.chain.deleteLastBlock(done);
						});

						it('should set multisignatures field to null on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.not.exist;
								expect(res.multisignatures).to.eql(null);
								done();
							});
						});

						it('should set multimin field to 0 on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.eql(null);
								// Should be undefined ?
								expect(res.multimin).to.eql(0);
								done();
							});
						});

						it('should set multilifetime field to 0 on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.be.null;
								expect(res.multilifetime).to.eql(0);
								done();
							});
						});

						it('should set u_multisignatures field to null on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.be.null;
								expect(res.u_multisignatures).to.eql(null);
								done();
							});
						});

						it('should set u_multimin field to null on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.be.null;
								expect(res.u_multimin).to.eql(0);
								done();
							});
						});

						it('should set u_multilifetime field to null on account', function (done) {
							library.logic.account.get({address: multisigAccount.address}, function (err, res) {
								expect(err).to.be.null;
								expect(res.u_multilifetime).to.eql(0);
								done();
							});
						});
					});
				});
			});
		});
	});
});
