'use strict';

var node = require('../../node');

var chai = require('chai');
var expect = require('chai').expect;
var async = require('async');

var transactionTypes = require('../../../helpers/transactionTypes.js');
var constants = require('../../../helpers/constants.js');
var ws = require('../../common/wsCommunication');
var modulesLoader = require('../../common/initModule').modulesLoader;
var _ = require('lodash');

var AccountLogic = require('../../../logic/account.js');
var TransactionLogic = require('../../../logic/transaction.js');
var DelegateModule = require('../../../modules/delegates.js');
var AccountModule = require('../../../modules/accounts.js');
var TransactionModule = require('../../../modules/transactions.js');
var LoaderModule = require('../../../modules/loader.js');

var VoteLogic = require('../../../logic/vote.js');
var TransferLogic = require('../../../logic/transfer.js');
var DelegateLogic = require('../../../logic/delegate.js');
var SignatureLogic = require('../../../logic/signature.js');
var MultisignatureLogic = require('../../../logic/multisignature.js');
var DappLogic = require('../../../logic/dapp.js');
var InTransferLogic = require('../../../logic/inTransfer.js');
var OutTransferLogic = require('../../../logic/outTransfer.js');

describe('transactions', function () {

	var transactionsModule;

	var voteTrs;
	var signatureTrs;
	var transferTrs;
	var delegateTrs;
	var multiTrs;
	var inTransferTrs;
	var outTransferTrs;
	var dappTrs;

	var voteAccount = node.randomAccount();
	var delegateAccount = node.randomAccount();
	var multiAccount1 = node.randomAccount();
	var multiAccount2 = node.randomAccount();
	var multiAccount3 = node.randomAccount();
	var transferAccount = node.randomAccount();
	var signatureAccount = node.randomAccount();
	var inTansferAccount = node.randomAccount();
	var dappAccount = node.randomAccount();

	function attachAllAssets (transactionLogic, delegatesModule, accountsModule) {
		var sendLogic = transactionLogic.attachAssetType(transactionTypes.SEND, new TransferLogic());
		sendLogic.bind(accountsModule);
		expect(sendLogic).to.be.an.instanceof(TransferLogic);

		var voteLogic = transactionLogic.attachAssetType(transactionTypes.VOTE, new VoteLogic(modulesLoader.logger, modulesLoader.scope.schema));
		voteLogic.bind(delegatesModule);
		expect(voteLogic).to.be.an.instanceof(VoteLogic);

		var delegateLogic = transactionLogic.attachAssetType(transactionTypes.DELEGATE, new DelegateLogic(modulesLoader.scope.schema));
		delegateLogic.bind(accountsModule);
		expect(delegateLogic).to.be.an.instanceof(DelegateLogic);

		var signatureLogic = transactionLogic.attachAssetType(transactionTypes.SIGNATURE, new SignatureLogic(modulesLoader.logger, modulesLoader.scope.schema));
		signatureLogic.bind(accountsModule);
		expect(signatureLogic).to.be.an.instanceof(SignatureLogic);

		var multiLogic = transactionLogic.attachAssetType(transactionTypes.MULTI, new MultisignatureLogic(modulesLoader.scope.schema, modulesLoader.scope.network, transactionLogic, modulesLoader.logger));
		multiLogic.bind(accountsModule);
		expect(multiLogic).to.be.an.instanceof(MultisignatureLogic);

		var dappLogic = transactionLogic.attachAssetType(transactionTypes.DAPP, new DappLogic(modulesLoader.db, modulesLoader.logger, modulesLoader.scope.schema, modulesLoader.scope.network));
		expect(dappLogic).to.be.an.instanceof(DappLogic);

		var inTransferLogic = transactionLogic.attachAssetType(transactionTypes.IN_TRANSFER, new InTransferLogic(modulesLoader.db, modulesLoader.scope.schema));
		inTransferLogic.bind(accountsModule, /* sharedApi */ null);
		expect(inTransferLogic).to.be.an.instanceof(InTransferLogic);

		var outTransfer = transactionLogic.attachAssetType(transactionTypes.OUT_TRANSFER, new OutTransferLogic(modulesLoader.db, modulesLoader.scope.schema, modulesLoader.logger));
		outTransfer.bind(accountsModule, /* sharedApi */ null);
		expect(outTransfer).to.be.an.instanceof(OutTransferLogic);
		return transactionLogic;
	}


	function postTransaction (transaction, done) {
		ws.call('postTransactions', {
			transaction: transaction
		}, done, true);
	}

	function postSignature (transaction, signature, done) {
		ws.call('postSignatures', {
			signature: {
				transaction: transaction.id,
				signature: signature
			}
		}, done);
	}

	before(function (done) {
		async.auto({
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					account: result.accountLogic
				});
			}],
			loaderModule: ['transactionLogic', 'accountLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(LoaderModule, cb, {
					logic: {
						transaction: result.transaction,
						account: result.account,
						//peers
					}
				});
			}],
			delegateModule: ['transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(DelegateModule, cb, {
					logic: {
						transaction: result.transactionLogic
					}
				});
			}],
			accountsModule: ['accountLogic', 'transactionLogic', function (result, cb) {
				modulesLoader.initModule(AccountModule, {
					logic: {
						account: result.accountLogic,
						transaction: result.transactionLogic
					}
				}, cb);
			}]
		}, function (err, result){
			expect(err).to.not.exist;
			modulesLoader.initModuleWithDb(TransactionModule, function (err, __transactionModule) {
				expect(err).to.not.exist;

				transactionsModule = __transactionModule;

				result.accountsModule.onBind({
					delegates: result.delegateModule,
					accounts: result.accountsModule,
					transactions: transactionsModule,
				});

				result.delegateModule.onBind({
					accounts: result.accountsModule,
					transactions: transactionsModule,
				});

				__transactionModule.onBind({
					accounts: result.accountsModule,
					transactions: transactionsModule,
					loader: result.loaderModule
				});

				attachAllAssets(result.transactionLogic, result.delegateModule, result.accountsModule);
				done();
			});
		});
	});

	before(function (done) {
		// Transfer LSK to all accounts.
		async.each([voteAccount, multiAccount1, multiAccount2, multiAccount3, delegateAccount, transferAccount, signatureAccount, inTansferAccount, dappAccount], function (account, eachCb) {

			var transferTrs = node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password);
			postTransaction(transferTrs, eachCb);
		}, function (err) {
			expect(err).to.not.exist;
			node.onNewBlock(done);
		});
	});

	var transactionsByType;

	before(function (done) {
		var dappName = node.randomApplicationName();

		function mergeResponseAndTransaction (transaction, cb) {
			return function (err, res) {
				return cb(err, _.merge({
					transaction: transaction
				}, res));
			};
		}

		async.auto({
			[transactionTypes.SEND]: function (cb) {
				var data = 'extra information';
				var transferTrs = node.lisk.transaction.createTransaction(node.gAccount.address, 112340000, transferAccount.password, null, data);
				postTransaction(transferTrs, mergeResponseAndTransaction(transferTrs, cb));
			},
			[transactionTypes.SIGNATURE]: function (cb) {
				var signatureTrs = node.lisk.signature.createSignature(signatureAccount.password, signatureAccount.secondPassword);
				postTransaction(signatureTrs, mergeResponseAndTransaction(signatureTrs, cb));
			},
			[transactionTypes.DELEGATE]: function (cb) {
				var delegateTrs = node.lisk.delegate.createDelegate(delegateAccount.password, delegateAccount.username);
				postTransaction(delegateTrs, mergeResponseAndTransaction(delegateTrs, cb));
			},
			[transactionTypes.VOTE]: function (cb) {
				var votes = [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f', 
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a'
				];
				var voteTrs = node.lisk.vote.createVote(voteAccount.password, votes);
				postTransaction(voteTrs, mergeResponseAndTransaction(voteTrs, cb));
			},
			[transactionTypes.MULTI]: function (cb) {
				var lifetime = 1;
				var min = 2;
				var keysgroup = [
					'+' + multiAccount2.publicKey,
					'+' + multiAccount3.publicKey
				];

				var multiTrs = node.lisk.multisignature.createMultisignature(multiAccount1.password, null, keysgroup, lifetime, min);
				postTransaction(multiTrs, mergeResponseAndTransaction(multiTrs, function (err, res) {
					var signature1 = node.lisk.multisignature.signTransaction(multiTrs, multiAccount2.password);
					var signature2 = node.lisk.multisignature.signTransaction(multiTrs, multiAccount3.password);
					async.each([signature1, signature2], function (signature, eachCb) {
						postSignature(multiTrs, signature, eachCb);
					}, function (err1) {
						cb(err || err1, res);
					});
				}));
			},
			[transactionTypes.DAPP]: function (cb) {
				var options = {
					type: 1,
					name: dappName,
					category: 2,
					link: 'http://www.lisk.io/' + dappName + '.zip',
				};
				var dappTrs = node.lisk.dapp.createDapp(dappAccount.password, null, options);
				postTransaction(dappTrs, mergeResponseAndTransaction(dappTrs, function (err, res) {
					node.onNewBlock(function (err1) {
						cb(err || err1, res);
					});
				}));
			}
			/**
			 *  Need to construct outTransfer using liskJs, commented code is for inTransfer
				[transactionTypes.IN_TRANSFER]: [String(transactionTypes.DAPP), function (res, cb) {
					var dappId = res[transactionTypes.DAPP].transactionId;
					var inTransferTrs = node.lisk.transfer.createTransfer(transferAccount.password, null, dappId);
					addTransaction(inTransferTrs, mergeResponseAndTransaction(inTransferTrs, function (err, res) {
						node.onNewBlock(function (err1) {
							cb(err, res);
						});
					}));
				}]
			**/
		}, function (err, res) {
			expect(err).to.not.exist;
			transactionsByType = res;
			Object.keys(transactionsByType).forEach(function (value) {
				expect(transactionsByType[value].success).to.equal(true);
			});
			node.onNewBlock(done);
		});
	});

	describe('Transaction#shared', function () {

		describe('getTransaction', function (done) {

			function getTransactionById (id, done) {
				transactionsModule.shared.getTransaction({
					body: {
						id: id
					}
				}, done);
			}

			it('should return error for invalid schema type', function (done) {
				transactionsModule.shared.getTransaction({}, function (err, res) {
					expect(err).to.equal('Expected type object but found type undefined');
					done();
				});
			});

			it('should get transaction for send transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.SEND].transactionId;
				var trs = transactionsByType[transactionTypes.SEND].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.recipientId).to.equal(trs.recipientId);
					expect(res.transaction.timestamp).to.equal(trs.timestamp);
					expect(res.transaction.asset).to.eql(trs.asset);
					expect(res.transaction.senderPublicKey).to.equal(trs.senderPublicKey);
					expect(res.transaction.signature).to.equal(trs.signature);
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.type).to.equal(transactionTypes.SEND);
					done();
				});
			});

			it('should get transaction with singature asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.SIGNATURE].transactionId;
				var trs = transactionsByType[transactionTypes.SIGNATURE].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.signature.publicKey).to.equal(trs.asset.signature.publicKey);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.type).to.equal(transactionTypes.SIGNATURE);
					done();
				});
			});

			it('should get transaction with delegate asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.DELEGATE].transactionId;
				var trs = transactionsByType[transactionTypes.DELEGATE].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.username).to.equal(trs.asset.username);
					expect(res.transaction.asset.publicKey).to.equal(trs.asset.publicKey);
					expect(res.transaction.asset.address).to.equal(trs.asset.address);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.type).to.equal(transactionTypes.DELEGATE);
					done();
				});
			});

			it('should get transaction with vote asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.VOTE].transactionId;
				var trs = transactionsByType[transactionTypes.VOTE].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.votes).to.eql(trs.asset.votes);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.type).to.equal(transactionTypes.VOTE);
					done();
				});
			});

			it('should get transaction with MULTI asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.MULTI].transactionId;
				var trs = transactionsByType[transactionTypes.MULTI].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.multisignature.lifetime).to.equal(trs.asset.multisignature.lifetime);
					expect(res.transaction.asset.multisignature.min).to.equal(trs.asset.multisignature.min);
					expect(res.transaction.asset.multisignature.keysgroup).to.eql(trs.asset.multisignature.keysgroup);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.type).to.equal(transactionTypes.MULTI);
					done();
				});
			});

			it('should get transaction with DAPP asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.DAPP].transactionId;
				var trs = transactionsByType[transactionTypes.DAPP].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.asset.dapp.name).to.equal(trs.asset.dapp.name);
					expect(res.transaction.asset.dapp.category).to.equal(trs.asset.dapp.category);
					expect(res.transaction.asset.dapp.link).to.equal(trs.asset.dapp.link);
					expect(res.transaction.asset.dapp.type).to.equal(trs.asset.dapp.type);
					expect(res.transaction.type).to.equal(transactionTypes.DAPP);
					done();
				});
			});

			it.skip('should get transaction with intransfer asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.IN_TRANSFER].transactionId;
				var trs = transactionsByType[transactionTypes.IN_TRANSFER].transaction;

				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					expect(res.transaction.asset.inTransfer.dappId).to.equal(trs.asset.inTransfer.dappId);
					expect(res.transaction.type).to.equal(transactionTypes.IN_TRANSFER);
					done();
				});
			});

			it.skip('should get transaction with outtransfer asset for transaction id', function (done) {
				done();
			});
		});
	});
});
