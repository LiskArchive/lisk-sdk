'use strict';

var node = require('../../node');

var chai = require('chai');
var expect = require('chai').expect;
var async = require('async');

var transactionTypes = require('../../../helpers/transactionTypes.js');
var constants = require('../../../helpers/constants.js');
var modulesLoader = require('../../common/initModule').modulesLoader;


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


	function attachAllAssets (transactionLogic, delegatesModule, roundsModule, accountsModule) {
		var sendLogic = transactionLogic.attachAssetType(transactionTypes.SEND, new TransferLogic());
		sendLogic.bind(accountsModule, /* rounds */ null);
		expect(sendLogic).to.be.an.instanceof(TransferLogic);

		var voteLogic = transactionLogic.attachAssetType(transactionTypes.VOTE, new VoteLogic(modulesLoader.logger, modulesLoader.scope.schema));
		voteLogic.bind(delegatesModule, /* rounds */ null);
		expect(voteLogic).to.be.an.instanceof(VoteLogic);

		var delegateLogic = transactionLogic.attachAssetType(transactionTypes.DELEGATE, new DelegateLogic(modulesLoader.scope.schema));
		delegateLogic.bind(accountsModule);
		expect(delegateLogic).to.be.an.instanceof(DelegateLogic);

		var signatureLogic = transactionLogic.attachAssetType(transactionTypes.SIGNATURE, new SignatureLogic(modulesLoader.logger, modulesLoader.scope.schema));
		signatureLogic.bind(accountsModule);
		expect(signatureLogic).to.be.an.instanceof(SignatureLogic);

		var multiLogic = transactionLogic.attachAssetType(transactionTypes.MULTI, new MultisignatureLogic(modulesLoader.scope.schema, modulesLoader.scope.network, transactionLogic, modulesLoader.logger));
		multiLogic.bind(/* rounds */ null, delegatesModule);
		expect(multiLogic).to.be.an.instanceof(MultisignatureLogic);

		var dappLogic = transactionLogic.attachAssetType(transactionTypes.DAPP, new DappLogic(modulesLoader.db, modulesLoader.logger, modulesLoader.scope.schema, modulesLoader.scope.network));
		expect(dappLogic).to.be.an.instanceof(DappLogic);

		var inTransferLogic = transactionLogic.attachAssetType(transactionTypes.IN_TRANSFER, new InTransferLogic(modulesLoader.db, modulesLoader.scope.schema));
		inTransferLogic.bind(accountsModule, /* rounds */ null, /* sharedApi */ null);
		expect(inTransferLogic).to.be.an.instanceof(InTransferLogic);

		var outTransfer = transactionLogic.attachAssetType(transactionTypes.OUT_TRANSFER, new OutTransferLogic(modulesLoader.db, modulesLoader.scope.schema, modulesLoader.logger));
		outTransfer.bind(accountsModule, /* rounds */ null, /* sharedApi */ null);
		expect(outTransfer).to.be.an.instanceof(OutTransferLogic);
		return transactionLogic;
	}

	function addTransactions (transactions, done) {
		async.each(transactions, function (trs, cb) {
			node.post('/peer/transactions', {
				transaction: trs 
			}, cb);
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

				attachAllAssets(result.transactionLogic, result.delegateModule, /*rounds*/null, result.accountsModule);
				done();
			});
		});
	});

	before(function (done) {
		// transfer lsk to all acounts;
		var transactions = [];
		async.each([voteAccount, multiAccount1, multiAccount2, multiAccount3, delegateAccount, transferAccount, signatureAccount, inTansferAccount, dappAccount], function (account, eachCb) {

			var params = {
				secret : node.gAccount.password,
				amount : 100000000000,
				recipientId : account.address,
			};
			putTransfer(params, eachCb);
		}, function (err) {
			expect(err).to.not.exist;
			node.onNewBlock(done);
		});
	});

	function putDelegate (params, done) {
		node.put('/api/delegates', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transaction.id,
				params: params
			});
		});	
	}

	function putVote (params, done) {
		node.put('/api/accounts/delegates', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transaction.id,
				params: params
			});

		});
	}

	function putSignature (params, done) {
		node.put('/api/signatures', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transaction.id,
				params: params
			});
		});	
	}

	function putTransfer (params, done) {
		node.put('/api/transactions', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transactionId,
				params: params
			});
		});
	}

	function putMulti (params, done) {
		node.put('/api/multisignatures', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transactionId,
				params: params
			});
		});
	}

	function putSignMulti (params, done) {
		node.post('/api/multisignatures/sign', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transactionId,
				params: params
			});
		});
	}

	function putDapp (params, done) {
		node.put('/api/dapps', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transaction.id,
				params: params
			});
		});
	}

	function putInTransfer (params, done) {
		node.put('/api/dapps/transaction', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transactionId,
				params: params
			});
		});
	}

	function putOutTransfer (params, done) {
		node.put('/api/dapps/withdrawal', params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done(err, {
				id: res.body.transactionId,
				params: params
			});
		});
	}

	var transactionsByType;

	before(function (done) {
		var dappName = node.randomApplicationName();
		async.auto({
			[transactionTypes.SEND]: function (cb) {
				var params = {
					secret : transferAccount.password,
					amount : 112340000,
					data: 'dummy data',
					recipientId : node.gAccount.address,
				};
				putTransfer(params, cb);
			},
			[transactionTypes.SIGNATURE]: function (cb) {
				var params = {
					secret: signatureAccount.password,
					secondSecret: signatureAccount.secondPassword
				};
				putSignature(params, cb);
			},
			[transactionTypes.DELEGATE]: function (cb) {
				var params = {
					secret: delegateAccount.password,
					username: delegateAccount.username
				};
				putDelegate(params, cb);
			},
			[transactionTypes.VOTE]: function (cb) {
				var votes = [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f', 
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a'
				];
				var params = {
					delegates: votes,
					secret: delegateAccount.password
				};
				putVote(params, cb);
			},
			[transactionTypes.MULTI]: function (cb) {
				var params = {
					secret: multiAccount1.password,
					lifetime: 1,
					min: 2,
					keysgroup: [
						'+' + multiAccount2.publicKey,
						'+' + multiAccount3.publicKey
					]
				};
				putMulti(params, function (err, res) {
					// sign multi transaction;
					async.each([multiAccount2.password, multiAccount3.password], function (password, cb) {
						putSignMulti({
							secret: password,
							transactionId: res.id
						}, cb);
					}, function (done) {
						cb(err, res);
					});
				});
			},
			[transactionTypes.DAPP]: function (cb) {
				var params = {
					secret: dappAccount.password,
					type: 1,
					name: dappName,
					category: 2,
					link: 'http://www.lisk.io/' + dappName + '.zip',
				};
				putDapp(params, function (err, __transactionId) {
					expect(err).to.not.exist;
					node.onNewBlock(function (err) {
						cb(err, __transactionId);
					});
				});
			},
			[transactionTypes.IN_TRANSFER]: [String(transactionTypes.DAPP), function (res, cb) {
				var params = {
					secret: transferAccount.password,
					amount: 112340000,
					dappId: res[transactionTypes.DAPP].id,
				};
				putInTransfer(params, cb);
			}],
			[transactionTypes.OUT_TRANSFER]: [String(transactionTypes.IN_TRANSFER), function (res, cb) {
				var params = {
					secret: transferAccount.password,
					amount: 112320000,
					dappId: res[transactionTypes.DAPP].id,
					transactionId: res[transactionTypes.IN_TRANSFER].id,
					recipientId: dappAccount.address
				};
				putOutTransfer(params, cb);
			}]
		}, function (err, res) {
			expect(err).to.not.exist;
			transactionsByType = res;
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
				var trsId = transactionsByType[transactionTypes.SEND].id;
				var trsParams = transactionsByType[transactionTypes.SEND].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.amount).to.equal(trsParams.amount);
					expect(res.transaction.recipientId).to.equal(trsParams.recipientId);
					expect(res.transaction.id).to.equal(trsId);

					expect(res.transaction.type).to.equal(transactionTypes.SEND);
					expect(res.transaction.fee).to.equal(constants.fees.send + constants.fees.data);
					expect(res.transaction.senderPublicKey).to.equal(transferAccount.publicKey);
					expect(res.transaction.recipientPublicKey).to.equal(node.gAccount.publicKey);
					expect(res.transaction.asset.data).to.eql(trsParams.data);
					done();
				});
			});

			it('should get transaction with singature asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.SIGNATURE].id;
				var trsParams = transactionsByType[transactionTypes.SIGNATURE].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(0);
					expect(res.transaction.asset.signature.publicKey).to.equal(signatureAccount.secondPublicKey);

					expect(res.transaction.type).to.equal(transactionTypes.SIGNATURE);
					expect(res.transaction.fee).to.equal(constants.fees.secondsignature);
					done();
				});
			});

			it('should get transaction with vote asset for transaction id', function (done) {

				var trsId = transactionsByType[transactionTypes.VOTE].id;
				var trsParams = transactionsByType[transactionTypes.VOTE].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(0);
					expect(res.transaction.asset.votes).to.eql(trsParams.delegates);

					expect(res.transaction.type).to.equal(transactionTypes.VOTE);
					expect(res.transaction.fee).to.equal(constants.fees.vote);
					done();
				});
			});

			it('should get transaction with MULTI asset for transaction id', function (done) {

				var trsId = transactionsByType[transactionTypes.MULTI].id;
				var trsParams = transactionsByType[transactionTypes.MULTI].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(0);
					expect(res.transaction.asset.multisignature.lifetime).to.equal(trsParams.lifetime);
					expect(res.transaction.asset.multisignature.min).to.equal(trsParams.min);
					expect(res.transaction.asset.multisignature.keysgroup).to.eql(trsParams.keysgroup);

					expect(res.transaction.type).to.equal(transactionTypes.MULTI);
					expect(res.transaction.fee).to.equal((1 + trsParams.keysgroup.length) * constants.fees.multisignature);
					done();
				});
			});

			it('should get transaction with DAPP asset for transaction id', function (done) {

				var trsId = transactionsByType[transactionTypes.DAPP].id;
				var trsParams = transactionsByType[transactionTypes.DAPP].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(0);

					expect(res.transaction.asset.dapp.name).to.equal(trsParams.name);
					expect(res.transaction.asset.dapp.category).to.equal(trsParams.category);
					expect(res.transaction.asset.dapp.link).to.equal(trsParams.link);
					expect(res.transaction.asset.dapp.type).to.equal(trsParams.type);

					expect(res.transaction.type).to.equal(transactionTypes.DAPP);
					expect(res.transaction.fee).to.equal(constants.fees.dapp);
					done();
				});
			});

			it('should get transaction with intransfer asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.IN_TRANSFER].id;
				var trsParams = transactionsByType[transactionTypes.IN_TRANSFER].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(trsParams.amount);

					expect(res.transaction.asset.inTransfer.dappId).to.equal(transactionsByType[transactionTypes.DAPP].id);
					expect(res.transaction.type).to.equal(transactionTypes.IN_TRANSFER);
					expect(res.transaction.fee).to.equal(constants.fees.send);
					done();
				});
			});

			it('should get transaction with outtransfer asset for transaction id', function (done) {
				var trsId = transactionsByType[transactionTypes.OUT_TRANSFER].id;
				var trsParams = transactionsByType[transactionTypes.OUT_TRANSFER].params;
				getTransactionById(trsId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trsId);
					expect(res.transaction.amount).to.equal(trsParams.amount);

					expect(res.transaction.asset.outTransfer.dappId).to.equal(transactionsByType[transactionTypes.DAPP].id);
					expect(res.transaction.asset.outTransfer.transactionId).to.equal(trsParams.transactionId);
					expect(res.transaction.type).to.equal(transactionTypes.OUT_TRANSFER);
					expect(res.transaction.fee).to.equal(constants.fees.send);
					done();
				});
			});
		});
	});
});
