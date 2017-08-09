var TransactionPool  = require('../../../logic/transactionPool.js');
var TransactionLogic = require('../../../logic/transaction.js');
var DelegateModule   = require('../../../modules/delegates.js');

var TransferLogic = require('../../../logic/transfer.js');

var transactionTypes = require('../../../helpers/transactionTypes');
var AccountModule    = require('../../../modules/accounts.js');
var BlocksModule     = require('../../../modules/blocks.js');
var AccountLogic     = require('../../../logic/account.js');
var Rounds           = require('../../../modules/rounds.js');
var modulesLoader    = require('../../common/initModule').modulesLoader;
var async            = require('async');
var expect           = require('chai').expect;
var node             = require('../../node');



describe('transactionPool', function () {
	var txPool;

	before(function (done) {
		// Init transaction logic
		async.auto({
			rounds          : function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope, cb);
			},
			accountLogic    : function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			blockModule     : ['accountLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(BlocksModule, cb, {
					logic: { /* dependencies not included */ },
				});
			}],
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					account: result.accountLogic
				});
			}],
			delegateModule  : ['transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(DelegateModule, cb, {
					logic: {
						transaction: result.transactionLogic
					}
				});
			}],
			// transactionModule: ['transactionLogic', function (result, cb) {
			//   modulesLoader.initModuleWithDb(TransactionModule, cb, {
			//     transaction: result.transactionLogic
			//   });
			// }]
		}, function (err, result) {
			modulesLoader.initModuleWithDb(AccountModule, function (err, __accountModule) {
				expect(err).to.not.exist;

				var account  = __accountModule;
				var accountLogic = result.accountLogic;

				// for correctly initializing setting blocks module
				result.blockModule.lastBlock.set({ height: 10 });

				result.delegateModule.onBind({
					accounts: __accountModule,
					// transactions: result.transactionModule,
					blocks  : result.blockModule
				});
				var sendLogic = result.transactionLogic.attachAssetType(transactionTypes.SEND, new TransferLogic());
				sendLogic.bind(account, /* rounds */ null);
				//
				// result.transactionModule.onBind({
				//   accounts: __accountModule,
				//   // transactions: result.transactionModule,
				//   //loader:
				// });

				account.onBind({
					delegates: result.delegateModule,
					accounts : account,
					// transactions: result.transactionModule
				});

				var accountModuleDependencies = result;
				txPool                    = new TransactionPool(
					modulesLoader.scope.config.broadcasts.broadcastInterval,
					modulesLoader.scope.config.broadcasts.releaseLimit,
					result.transactionLogic,
					modulesLoader.scope.bus, // bus
					modulesLoader.logger// logger
				);
				txPool.bind(account, null, modulesLoader.scope.loader);
				done();
			}, {
				logic: {
					account    : result.accountLogic,
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
			const tx    = node.lisk.transaction.createTransaction(account.address, 100000000000, node.gAccount.password);
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