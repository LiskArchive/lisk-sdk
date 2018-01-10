'use strict';

var crypto = require('crypto');
var lisk = require('lisk-js');
var chai = require('chai');
var should = chai.should();
var application = require('../../../common/application');
var clearDatabaseTable = require('../../../common/DBSandbox').clearDatabaseTable;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var sinon = require('sinon');

var previousBlock;

function createBlock (blocksModule, blockLogic, secret, timestamp, transactions) {
	var keypair = blockLogic.scope.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
	blocksModule.lastBlock.set(previousBlock);
	var newBlock = blockLogic.create({
		keypair: keypair,
		timestamp: timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions: transactions
	});
	newBlock.id = blockLogic.getId(newBlock);
	newBlock.height = previousBlock ? previousBlock.height + 1 : 1;
	return newBlock;
}

describe('blocks/chain', function () {

	var blocksModule, blocksChainModule, blockLogic, logger, genesisBlock, db;

	before(function (done) {
		// Force rewards start at 150-th block
		application.init({sandbox: {name: 'lisk_test_blocks_chain'}, waitForGenesisBlock: true}, function (err, scope) {
			db = scope.db;
			blocksModule = scope.modules.blocks;
			blocksChainModule = scope.modules.blocks.chain;
			blockLogic = scope.logic.block;
			logger = scope.logger;
			genesisBlock = scope.genesisblock.block;
			blocksModule.onBind(scope.modules);
			blocksChainModule.onBind(scope.modules);

			previousBlock = genesisBlock;

			done();
		});
	});

	after(function (done) {
		application.cleanup(done);
	});


	describe('constructor', function () {

		describe('library', function () {

			it('should assign logger');

			it('should assign db');

			it('should assign genesisblock');

			it('should assign bus');

			it('should assign balanceSequence');

			describe('should assign logic', function () {

				it('should assign block');

				it('should assign transaction');
			});
		});

		it('should set self to this');

		it('should call library.logger.trace"');

		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."');

		it('should return self');
	});

	describe('saveGenesisBlock', function () {

		it('should call library.db.query');

		it('should call library.db.blocks.getGenesisBlockId');

		it('should call library.db.query with { id: library.genesisblock.block.id }');

		describe('when db query fails', function () {

			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#saveGenesisBlock error"');
		});

		describe('when db query succeeds', function () {

			describe('when genesis block does not exist', function () {

				it('should call self.saveBlock');

				it('should call self.saveBlock with library.genesisblock.block');

				describe('when self.saveBlock fails', function () {

					it('should call callback with error');
				});
			});

			it('should call callback with error = undefined');

			it('should call callback with result = undefined');
		});
	});

	describe('saveBlock', function () {

		it('should call library.db.transaction');

		it('should call library.logic.block.dbSave');

		it('should call library.logic.block.dbSave with block');

		describe('when library.db.transaction callback throws', function () {

			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#saveBlock error"');
		});

		describe('when library.db.transaction callback does not throw', function () {

			it('should call __private.afterSave');

			it('should call __private.afterSave with block');

			it('should call __private.afterSave with callback');
		});
	});

	describe('__private', function () {

		describe('afterSave', function () {

			it('should call library.bus.message');

			it('should call library.bus.message with "transactionsSaved"');

			it('should call library.bus.message with block.transactions');

			it('should call library.logic.transaction.afterSave for every block.transaction');

			describe('when library.logic.transaction.afterSave fails', function () {

				it('should call callback with error');
			});

			describe('when library.logic.transaction.afterSave succeeds', function () {

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});

		describe('promiseTransactions', function () {

			describe('when block.transactions is empty', function () {

				it('should return t');
			});

			describe('for every block.transaction', function () {

				it('should call library.logic.transaction.dbSave');

				it('should call library.logic.transaction.dbSave with transaction');

				it('should call t.nonce');
			});
		});
	});

	describe('deleteBlock', function () {

		it('should call library.db.none');

		it('should call library.db.blocks.deleteBlock');

		it('should call library.db.none with {id: blockId}');

		describe('when library.db.none fails', function () {

			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#deleteBlock error"');
		});

		describe('when library.db.none succeeds', function () {

			it('should call callback');

			it('should call callback with error = undefined');

			it('should call callback with result = undefined');
		});
	});

	describe('deleteAfterBlock', function () {

		it('should call library.db.query');

		it('should call library.db.query with sql.deleteAfterBlock');

		it('should call library.db.query with {id: blockId}');

		describe('when library.db.query fails', function () {

			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#deleteAfterBlock error"');
		});

		describe('when library.db.query succeeds', function () {

			it('should call callback with error = null');

			it('should call callback with result = res');
		});
	});

	describe('applyGenesisBlock', function () {

		it('should sort transactions after type');

		it('should call modules.blocks.utils.getBlockProgressLogger');

		it('should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length');

		it('should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length / 100');

		it('should call modules.blocks.utils.getBlockProgressLogger with "Genesis block loading"');

		describe('for every block.transactions', function () {

			it('should call modules.accounts.setAccountAndGet');

			it('should call modules.accounts.setAccountAndGet with {publicKey: transaction.senderPublicKey}');

			describe('when modules.accounts.setAccountAndGet fails', function () {
				
				describe('error object', function () {

					it('should assign message');

					it('should assign transaction');

					it('should assign block');
				});

				it('should call process.exit with 0');
			});

			describe('when modules.accounts.setAccountAndGet succeeds', function () {

				it('should call __private.applyTransaction');

				it('should call __private.applyTransaction with block');

				it('should call __private.applyTransaction with transaction');

				it('should call __private.applyTransaction with sender');

				it('should call __private.applyTransaction with callback');

				it('should call tracker.applyNext');
			});

			describe('after loop through block.transactions', function () {

				it('should set genesis block as last block');

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});
	});

	describe('__private', function () {

		describe('applyTransaction', function () {

			it('should call modules.transactions.applyUnconfirmed');

			it('should call modules.transactions.applyUnconfirmed with transaction');

			it('should call modules.transactions.applyUnconfirmed with sender');

			it('should call modules.transactions.applyUnconfirmed with callback');

			describe('when modules.transactions.applyUnconfirmed fails', function () {

				describe('error object', function () {

					it('should assign message');

					it('should assign transaction');

					it('should assign block');
				});

				it('should call callback with error object');
			});

			describe('when modules.transactions.applyUnconfirmed succeeds', function () {

				it('should call modules.transactions.apply with sender');

				it('should call modules.transactions.apply with transaction');

				it('should call modules.transactions.apply with block');

				it('should call modules.transactions.apply with callback');

				describe('when error is defined in the callback', function () {

					describe('result object', function () {

						it('should assign message');

						it('should assign transaction');

						it('should assign block');
					});

					it('should call callback with result object');
				});

				it('should call callback');
			});
		});
	});

	describe('applyBlock', function () {

		var secret = 'lend crime turkey diary muscle donkey arena street industry innocent network lunar';
		var block;
		var transactions;

		beforeEach(function () {
			transactions = [];
			var account = randomUtil.account();
			var transaction = lisk.transaction.createTransaction(
				account.address,
				randomUtil.number(100000000, 1000000000),
				accountFixtures.genesis.password
			);
			transaction.senderId = accountFixtures.genesis.address;
			transactions.push(transaction);
		});

		afterEach(function () {
			previousBlock = block;
		});

		it('should apply a valid with success', function (done) {
			block = createBlock(blocksModule, blockLogic, secret, 32578370, transactions);

			blocksChainModule.applyBlock(block, true, function (err) {

				if(err) {
					return done(err);
				}

				blocksModule.shared.getBlocks({id: block.id}, function (err, data) {
					data.should.have.lengthOf(1);
					data[0].id.should.be.equal(block.id);
					done(err);
				});
			});
		});

		// TODO: Need to enable it after making block part of the single transaction  
		it.skip('should apply block in a single transaction', function (done) {
			block = createBlock(blocksModule, blockLogic, secret, 32578370, transactions);

			db.$config.options.query = function (event) {

				if (!(event.ctx && event.ctx.isTX && event.ctx.txLevel === 0 && event.ctx.tag === 'Chain:applyBlock')) {
					return done('Some query executed outside transaction context: ' + event.query, event);
				}
			};

			var connect = sinon.stub();
			var disconnect = sinon.stub();

			db.$config.options.connect = connect;
			db.$config.options.disconnect = disconnect;

			blocksChainModule.applyBlock(block, true, function (err) {
				if(err) {
					done(err);
				}

				connect.calledOnce.should.be.true;
				disconnect.calledOnce.should.be.true;

				delete db.$config.options.connect;
				delete db.$config.options.disconnect;
				delete db.$config.options.query;

				blocksModule.shared.getBlocks({id: block.id}, function (err, data) {
					done(err);
				});
			});
		});


		it('should call modules.blocks.isActive');

		it('should call modules.blocks.isActive with true');

		it('should call modules.transactions.undoUnconfirmedList');

		describe('when modules.transactions.undoUnconfirmedList fails', function () {

			it('should call logger.error with error');

			it('should return process.exit with 0');
		});

		describe('when modules.transactions.undoUnconfirmedList succeeds', function () {

			describe('for every block.transactions', function () {

				it('should call modules.accounts.setAccountAndGet');

				it('should call modules.accounts.setAccountAndGet with {publicKey: transaction.senderPublicKey}');

				it('should call modules.transactions.applyUnconfirmed');

				it('should call modules.transactions.applyUnconfirmed with transaction');

				it('should call modules.transactions.applyUnconfirmed with sender');

				describe('when modules.transactions.applyUnconfirmed fails', function () {

					it('should call library.logger.error with error');

					describe('for every block.transactions', function () {

						it('should call modules.accounts.getAccount');

						it('should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}');

						describe('when modules.accounts.getAccount fails', function () {

							it('should call callback with error');
						});

						describe('when modules.accounts.getAccount succeeds', function () {

							describe('and transaction.id was already applied', function () {

								it('should call library.logic.transaction.undoUnconfirmed');

								it('should call library.logic.transaction.undoUnconfirmed with transaction');

								it('should call library.logic.transaction.undoUnconfirmed with sender');
							});
						});
					});
				});

				describe('for every block.transactions', function () {

					it('should call modules.accounts.getAccount');

					it('should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}');

					describe('when modules.accounts.getAccount fails', function () {

						it('should call library.logger.error with error');

						it('should call process.exit with 0');
					});

					describe('when modules.accounts.getAccount succeeds', function () {

						it('should call modules.transactions.apply');

						it('should call modules.transactions.apply with transaction');

						it('should call modules.transactions.apply with block');

						it('should call modules.transactions.apply with sender');

						describe('when modules.transactions.apply fails', function () {

							it('should call library.logger.error with error');

							it('should call process.exit with 0');
						});

						describe('when modules.transactions.apply succeeds', function () {

							it ('should call modules.transactions.removeUnconfirmedTransaction');

							it ('should call modules.transactions.removeUnconfirmedTransaction with transaction.id');

							it('should call modules.blocks.lastBlock.set');

							it('should call modules.blocks.lastBlock.set with block');

							describe('when saveBlock is defined', function () {

								it('should call self.saveBlock with block');

								describe('when self.saveBlock fails', function () {

									it('should call logger.error with message');

									it('should call logger.error with "Block"');

									it('should call logger.error with block');

									it('should call process.exit with 0');
								});

								describe('when self.saveBlock succeeds', function () {

									it('should call library.logger.debug');
								});

								it('should call modules.transactions.applyUnconfirmedIds');

								it('should call modules.transactions.applyUnconfirmedIds with unconfirmedTransactionIds');

								describe('when modules.transactions.applyUnconfirmedIds fails', function () {

									describe('when error = "Snapshot finished"', function () {

										it('should call logger.info with error');

										it('should call process.emit with "SIGTERM"');
									});

									it('should call callback with error');
								});

								describe('when modules.transactions.applyUnconfirmedIds succeeds', function () {

									it('should return series callback with error = undefined');

									it('should return series callback with result = undefined');
								});

								it('should call modules.blocks.isActive.set with false');
							});
						});
					});
				});
			});
		});
	});

	describe('broadcastReducedBlock', function () {

		it('should call library.bus.message with "newBlock"');

		it('should call library.bus.message with reducedBlock');

		it('should call library.bus.message with broadcast');

		it('should call library.logger.debug with blockId');
	});

	describe('__private', function () {

		describe('popLastBlock', function () {

			describe('call library.balancesSequence.add', function () {

				it('should call modules.blocks.utils.loadBlocksPart');

				it('should call modules.blocks.utils.loadBlocksPart with { id: oldLastBlock.previousBlock }');

				describe('when modules.blocks.utils.loadBlocksPart fails', function () {

					it('should call callback with error');
				});

				describe('when modules.blocks.utils.loadBlocksPart succeeds', function () {

					describe('when previousBlock is null', function () {

						it('should call callback with "previousBlock is null"');
					});

					describe('for every oldLastBlock.transactions', function () {

						it('should call modules.accounts.getAccount');

						it('should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}');

						describe('when modules.accounts.getAccount fails', function () {

							it('should call library.logger.error with error');

							it('should call library.logger.error "Failed to undo transactions"');

							it('should call process.exit with 0');
						});

						describe('when modules.accounts.getAccount succeeds', function () {

							it('should call modules.transactions.undo');

							it('should call modules.transactions.undo with transaction');

							it('should call modules.transactions.undo with oldLastBlock');

							it('should call modules.transactions.undo with sender');

							it('should call modules.transactions.undoUnconfirmed');

							it('should call modules.transactions.undoUnconfirmed with transaction');

							it('should call self.deleteBlock');

							it('should call self.deleteBlock with oldLastBlock.id');

							describe('when self.deleteBlock fails', function () {

								it('should call library.logger.error with error');

								it('should call library.logger.error with "Failed to delete block"');

								it('should call process.exit with 0');
							});

							describe('when self.deleteBlock succeeds', function () {

								it('should call callback');

								it('should call callback with error = null');

								it('should call callback with result = previousBlock');
							});
						});
					});
				});
			});
		});
	});

	describe('deleteLastBlock', function () {

		it('should call modules.blocks.lastBlock.get');

		it('should call logger.warn lastBlock');

		describe('when lastBlock.height = 1', function () {

			it('should call callback with error "Cannot delete genesis block');
		});

		it('should call __private.popLastBlock');

		it('should call __private.popLastBlock with lastBlock');

		describe('when __private.popLastBlock fails', function () {

			it('should call logger.error with "Error deleting last block"');

			it('should call logger.error with lastBlock');

			it('should call callback with error');

			it('should call callback with lastBlock');
		});
		describe('when __private.popLastBlock succeeds', function () {

			it('should replace the lastBlock with the previous one');

			it('should call callback with error = null');

			it('should call callback with result = lastBlock');
		});
	});

	describe('recoverChain', function () {

		it('should call logger.warn with warning');

		it('should call self.deleteLastBlock');

		describe('when self.deleteLastBlock fails', function () {

			it('should call logger.error with "Recovery failed"');

			it('should return callback with error');
		});

		describe('when self.deleteLastBlock succeeds', function () {

			it('should call logger.info with newLastBlock.id');

			it('should call logger.info with "Recovery complete, new last block"');

			it('should call callback with error = null');
		});
	});

	describe('onBind', function () {

		it('should call logger.trace with "Blocks->Chain: Shared modules bind."');

		it('should set __private.loaded = true');

		describe('modules', function () {

			it('should assign accounts');

			it('should assign blocks');

			it('should assign transactions');
		});
	});
});
