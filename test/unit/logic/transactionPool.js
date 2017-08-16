'use strict';/*eslint*/

var TransactionPool = require('../../../logic/transactionPool');
var TransactionLogic = require('../../../logic/transaction');
var DelegateModule = require('../../../modules/delegates');

var TransferLogic = require('../../../logic/transfer');

var transactionTypes = require('../../../helpers/transactionTypes');
var AccountModule = require('../../../modules/accounts');
var BlocksModule = require('../../../modules/blocks');
var AccountLogic = require('../../../logic/account');
var modulesLoader = require('../../common/initModule').modulesLoader;
var async = require('async');
var expect = require('chai').expect;
var node = require('../../node');

describe('transactionPool', function () {

	var txPool;

	before(function (done) {
		// Init transaction logic
		async.auto({
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			blockModule: ['accountLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(BlocksModule, cb, {
					logic: { /* dependencies not included */ },
				});
			}],
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					account: result.accountLogic
				});
			}],
			delegateModule: ['transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(DelegateModule, cb, {
					logic: {
						transaction: result.transactionLogic
					}
				});
			}],
		}, function (err, result) {
			modulesLoader.initModuleWithDb(AccountModule, function (err, __accountModule) {
				expect(err).to.not.exist;

				var account = __accountModule;
				var accountLogic = result.accountLogic;

				// For correctly initializing setting blocks module
				result.blockModule.lastBlock.set({ height: 10 });

				result.delegateModule.onBind({
					accounts: __accountModule,
					blocks: result.blockModule
				});
				var sendLogic = result.transactionLogic.attachAssetType(transactionTypes.SEND, new TransferLogic());
				sendLogic.bind(account);

				account.onBind({
					delegates: result.delegateModule,
					accounts: account,
				});

				var accountModuleDependencies = result;
				txPool = new TransactionPool(
					modulesLoader.scope.config.broadcasts.broadcastInterval,
					modulesLoader.scope.config.broadcasts.releaseLimit,
					result.transactionLogic,
					modulesLoader.scope.bus, // Bus
					modulesLoader.logger // Logger
				);
				txPool.bind(account, null, modulesLoader.scope.loader);
				done();
			}, {
				logic: {
					account: result.accountLogic,
					transaction: result.transactionLogic
				}
			});
		});
	});

	describe('receiveTransactions', function () {

		it('should do nothing for empty array', function (done) {
			txPool.receiveTransactions([], false, function (err, data) {
				expect(err).to.not.exist;
				expect(data).to.be.empty;
				done();
			});
		});

		it('should return error for invalid tx', function (done) {
			txPool.receiveTransactions([{ id: '123' }], false, function (err, data) {
				expect(err).to.exist;
				done();
			});
		});

		it('should process tx if valid and insert tx into queue', function (done) {
			var account = node.randomAccount();
			const tx = node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password);

			txPool.receiveTransactions([tx], false, function (err, data) {
				expect(err).to.not.exist;
				expect(txPool.transactionInPool(tx.id)).to.be.true;
				done();
			});
		});
	});

	describe('transactionInPool', function () {

		it('should return false for an unknown id', function () {
			expect(txPool.transactionInPool('11111')).to.be.false;
		});
	});
});
