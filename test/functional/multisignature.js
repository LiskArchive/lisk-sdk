var node = require('../node.js');
var async = require('async');
var slots = require('../../helpers/slots.js');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var Promise = require('bluebird');
var _  = require('lodash');

var application = require('./../common/application');

describe('multisignature', function () {

	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_multisignatures'}}, function (scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	function forge (cb) {
		function getNextForger (offset, cb) {
			offset = !offset ? 1 : offset;
			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp);
			library.modules.delegates.generateDelegateList(last_block.height, null, function (err, delegateList) {
				if (err) { return cb (err); }
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
				node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
					if (err) { return seriesCb(err); }
					last_block = library.modules.blocks.lastBlock.get();
					node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
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

	function getAccountFromDb (address) {
		return Promise.all([
			library.db.query('SELECT * FROM mem_accounts where address = \'' + address + '\''),
			library.db.query('SELECT * FROM mem_accounts2multisignatures where "accountId" = \'' + address + '\''),
			library.db.query('SELECT * FROM mem_accounts2u_multisignatures where "accountId" = \'' + address + '\'')
		]).then(function (res) {
			// Get the first row if resultant array is not empty
			return {
				mem_accounts: res[0].length > 0 ? res[0][0] : res[0],
				mem_accounts2multisignatures: res[1],
				mem_accounts2u_multisignatures: res[2]
			};
		});
	}

	describe('with LISK sent to multisig account', function () {

		var multisigAccount;

		before('send funds to multisig account', function (done) {
			multisigAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, node.gAccount.password);
			addTransactionsAndForge([sendTransaction], done);
		});

		describe('from multisig account', function () {

			var multisigSender;

			before('get multisignature account', function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('applyUnconfirm transaction', function () {
				var multisigTransaction;
				var signer1 = node.randomAccount();
				var signer2 = node.randomAccount();

				before('applyUnconfirm multisignature transaction', function (done) {
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

				describe('sender db rows', function () {
					var accountRow;

					before('get mem_account, mem_account2multisignature and mem_account2u_multisignature rows', function () {
						return getAccountFromDb(multisigAccount.address).then(function (res) {
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
					var signer3 = node.randomAccount();
					var signer4 = node.randomAccount();

					before('process multisignature transaction', function (done) {
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

	describe('with LISK sent to multisig account', function () {

		var multisigAccount;

		before('send funds to multisig account', function (done) {
			multisigAccount = node.randomAccount();
			var sendTransaction = node.lisk.transaction.createTransaction(multisigAccount.address, 1000000000*100, node.gAccount.password);
			addTransactionsAndForge([sendTransaction], done);
		});

		describe('from multisig account', function () {

			var multisigSender;

			before('get multisignature account', function (done) {
				library.logic.account.get({address: multisigAccount.address}, function (err, res) {
					multisigSender = res;
					done();
				});
			});

			describe('after forging Block with multisig transaction', function () {

				var multisigTransaction;
				var signer1 = node.randomAccount();
				var signer2 = node.randomAccount();

				before('forge block with multisignature transaction', function (done) {
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

				describe('sender db rows', function () {
					var accountRow;

					before('get mem_account, mem_account2multisignature and mem_account2u_multisignature rows', function () {
						return getAccountFromDb(multisigAccount.address).then(function (res) {
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
							return getAccountFromDb(multisigAccount.address).then(function (res) {
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
