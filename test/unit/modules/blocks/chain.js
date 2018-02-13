/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var rewire = require('rewire');
var modulesLoader = require('../../../common/modules_loader');

var BlocksChain = rewire('../../../../modules/blocks/chain.js');


describe('blocks/chain', () => {
	var __private;
	var library;
	var modules;
	var blocksChainModule;
	var dbStub;
	var loggerStub;
	var blockStub;
	var transactionStub;
	var modulesStub;

	beforeEach(() => {
		//Logic
		dbStub = sinonSandbox.stub();
		blockStub = sinonSandbox.stub();
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		blocksChainModule = new BlocksChain(
			loggerStub,
			blockStub,
			transactionStub,
			dbStub,
			modulesLoader.scope.genesisblock,
			modulesLoader.scope.bus,
			modulesLoader.scope.balancesSequence
		);

		library = BlocksChain.__get__('library');
		__private = BlocksChain.__get__('__private');
		//Module
		var modulesAccountsStub = sinonSandbox.stub();
		var modulesBlocksStub = sinonSandbox.stub();
		var modulesRoundsStub = sinonSandbox.stub();
		var modulesTransactionsStub = sinonSandbox.stub();
		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			rounds: modulesRoundsStub,
			transactions: modulesTransactionsStub,
		};
		blocksChainModule.onBind(modulesStub);
		modules = BlocksChain.__get__('modules');
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.genesisblock).to.eql(modulesLoader.scope.genesisblock);
			expect(library.bus).to.eql(modulesLoader.scope.bus);
			expect(library.balancesSequence).to.eql(modulesLoader.scope.balancesSequence);
			expect(library.logic.block).to.eql(blockStub);
			expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."', () => {
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksChainModule).to.be.an('object');
			expect(blocksChainModule.saveGenesisBlock).to.be.a('function');
			expect(blocksChainModule.saveBlock).to.be.a('function');
			expect(blocksChainModule.deleteBlock).to.be.a('function');
			expect(blocksChainModule.deleteAfterBlock).to.be.a('function');
			expect(blocksChainModule.applyGenesisBlock).to.be.a('function');
			expect(blocksChainModule.applyBlock).to.be.a('function');
			expect(blocksChainModule.broadcastReducedBlock).to.be.a('function');
			expect(blocksChainModule.deleteLastBlock).to.be.a('function');
			expect(blocksChainModule.recoverChain).to.be.a('function');
			expect(blocksChainModule.onBind).to.be.a('function');
		});
	});

	describe('saveGenesisBlock', () => {
		it('should call library.db.query');

		it('should call library.db.blocks.getGenesisBlockId');

		it(
			'should call library.db.query with { id: library.genesisblock.block.id }'
		);

		describe('when db query fails', () => {
			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#saveGenesisBlock error"');
		});

		describe('when db query succeeds', () => {
			describe('when genesis block does not exist', () => {
				it('should call self.saveBlock');

				it('should call self.saveBlock with library.genesisblock.block');

				describe('when self.saveBlock fails', () => {
					it('should call callback with error');
				});
			});

			it('should call callback with error = undefined');

			it('should call callback with result = undefined');
		});
	});

	describe('saveBlock', () => {
		it('should call library.db.transaction');

		it('should call library.logic.block.dbSave');

		it('should call library.logic.block.dbSave with block');

		describe('when library.db.transaction callback throws', () => {
			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#saveBlock error"');
		});

		describe('when library.db.transaction callback does not throw', () => {
			it('should call __private.afterSave');

			it('should call __private.afterSave with block');

			it('should call __private.afterSave with callback');
		});
	});

	describe('__private', () => {
		describe('afterSave', () => {
			it('should call library.bus.message');

			it('should call library.bus.message with "transactionsSaved"');

			it('should call library.bus.message with block.transactions');

			it(
				'should call library.logic.transaction.afterSave for every block.transaction'
			);

			describe('when library.logic.transaction.afterSave fails', () => {
				it('should call callback with error');
			});

			describe('when library.logic.transaction.afterSave succeeds', () => {
				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});

		describe('promiseTransactions', () => {
			describe('when block.transactions is empty', () => {
				it('should return t');
			});

			describe('for every block.transaction', () => {
				it('should call library.logic.transaction.dbSave');

				it('should call library.logic.transaction.dbSave with transaction');

				it('should call t.nonce');
			});
		});
	});

	describe('deleteBlock', () => {
		it('should call library.db.none');

		it('should call library.db.blocks.deleteBlock');

		it('should call library.db.none with {id: blockId}');

		describe('when library.db.none fails', () => {
			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#deleteBlock error"');
		});

		describe('when library.db.none succeeds', () => {
			it('should call callback');

			it('should call callback with error = undefined');

			it('should call callback with result = undefined');
		});
	});

	describe('deleteAfterBlock', () => {
		it('should call library.db.query');

		it('should call library.db.query with sql.deleteAfterBlock');

		it('should call library.db.query with {id: blockId}');

		describe('when library.db.query fails', () => {
			it('should call logger.error');

			it('should call logger.error with err.stack');

			it('should call callback with "Blocks#deleteAfterBlock error"');
		});

		describe('when library.db.query succeeds', () => {
			it('should call callback with error = null');

			it('should call callback with result = res');
		});
	});

	describe('applyGenesisBlock', () => {
		it('should sort transactions after type');

		it('should call modules.blocks.utils.getBlockProgressLogger');

		it(
			'should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length'
		);

		it(
			'should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length / 100'
		);

		it(
			'should call modules.blocks.utils.getBlockProgressLogger with "Genesis block loading"'
		);

		describe('for every block.transactions', () => {
			it('should call modules.accounts.setAccountAndGet');

			it(
				'should call modules.accounts.setAccountAndGet with {publicKey: transaction.senderPublicKey}'
			);

			describe('when modules.accounts.setAccountAndGet fails', () => {
				describe('error object', () => {
					it('should assign message');

					it('should assign transaction');

					it('should assign block');
				});

				it('should call process.exit with 0');
			});

			describe('when modules.accounts.setAccountAndGet succeeds', () => {
				it('should call __private.applyTransaction');

				it('should call __private.applyTransaction with block');

				it('should call __private.applyTransaction with transaction');

				it('should call __private.applyTransaction with sender');

				it('should call __private.applyTransaction with callback');

				it('should call tracker.applyNext');
			});

			describe('after loop through block.transactions', () => {
				it('should set genesis block as last block');

				it('should call callback with error = undefined');

				it('should call callback with result = undefined');
			});
		});
	});

	describe('__private', () => {
		describe('applyTransaction', () => {
			it('should call modules.transactions.applyUnconfirmed');

			it('should call modules.transactions.applyUnconfirmed with transaction');

			it('should call modules.transactions.applyUnconfirmed with sender');

			it('should call modules.transactions.applyUnconfirmed with callback');

			describe('when modules.transactions.applyUnconfirmed fails', () => {
				describe('error object', () => {
					it('should assign message');

					it('should assign transaction');

					it('should assign block');
				});

				it('should call callback with error object');
			});

			describe('when modules.transactions.applyUnconfirmed succeeds', () => {
				it('should call modules.transactions.apply with sender');

				it('should call modules.transactions.apply with transaction');

				it('should call modules.transactions.apply with block');

				it('should call modules.transactions.apply with callback');

				describe('when error is defined in the callback', () => {
					describe('result object', () => {
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

	describe('applyBlock', () => {

		it('should apply a valid block successfully');


		it('should call modules.blocks.isActive');

		it('should call modules.blocks.isActive with true');

		it('should call modules.transactions.undoUnconfirmedList');

		describe('when modules.transactions.undoUnconfirmedList fails', () => {
			it('should call logger.error with error');

			it('should return process.exit with 0');
		});

		describe('when modules.transactions.undoUnconfirmedList succeeds', () => {
			describe('for every block.transactions', () => {
				it('should call modules.accounts.setAccountAndGet');

				it(
					'should call modules.accounts.setAccountAndGet with {publicKey: transaction.senderPublicKey}'
				);

				it('should call modules.transactions.applyUnconfirmed');

				it(
					'should call modules.transactions.applyUnconfirmed with transaction'
				);

				it('should call modules.transactions.applyUnconfirmed with sender');

				describe('when modules.transactions.applyUnconfirmed fails', () => {
					it('should call library.logger.error with error');

					describe('for every block.transactions', () => {
						it('should call modules.accounts.getAccount');

						it(
							'should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}'
						);

						describe('when modules.accounts.getAccount fails', () => {
							it('should call callback with error');
						});

						describe('when modules.accounts.getAccount succeeds', () => {
							describe('and transaction.id was already applied', () => {
								it('should call library.logic.transaction.undoUnconfirmed');

								it(
									'should call library.logic.transaction.undoUnconfirmed with transaction'
								);

								it(
									'should call library.logic.transaction.undoUnconfirmed with sender'
								);
							});
						});
					});
				});

				describe('for every block.transactions', () => {
					it('should call modules.accounts.getAccount');

					it(
						'should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}'
					);

					describe('when modules.accounts.getAccount fails', () => {
						it('should call library.logger.error with error');

						it('should call process.exit with 0');
					});

					describe('when modules.accounts.getAccount succeeds', () => {
						it('should call modules.transactions.apply');

						it('should call modules.transactions.apply with transaction');

						it('should call modules.transactions.apply with block');

						it('should call modules.transactions.apply with sender');

						describe('when modules.transactions.apply fails', () => {
							it('should call library.logger.error with error');

							it('should call process.exit with 0');
						});

						describe('when modules.transactions.apply succeeds', () => {
							it(
								'should call modules.transactions.removeUnconfirmedTransaction'
							);

							it(
								'should call modules.transactions.removeUnconfirmedTransaction with transaction.id'
							);

							it('should call modules.blocks.lastBlock.set');

							it('should call modules.blocks.lastBlock.set with block');

							describe('when saveBlock is defined', () => {
								it('should call self.saveBlock with block');

								describe('when self.saveBlock fails', () => {
									it('should call logger.error with message');

									it('should call logger.error with "Block"');

									it('should call logger.error with block');

									it('should call process.exit with 0');
								});

								describe('when self.saveBlock succeeds', () => {
									it('should call library.logger.debug');
								});

								it('should call modules.transactions.applyUnconfirmedIds');

								it(
									'should call modules.transactions.applyUnconfirmedIds with unconfirmedTransactionIds'
								);

								describe('when modules.transactions.applyUnconfirmedIds fails', () => {
									describe('when error = "Snapshot finished"', () => {
										it('should call logger.info with error');

										it('should call process.emit with "SIGTERM"');
									});

									it('should call callback with error');
								});

								describe('when modules.transactions.applyUnconfirmedIds succeeds', () => {
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

	describe('broadcastReducedBlock', () => {
		it('should call library.bus.message with "newBlock"');

		it('should call library.bus.message with reducedBlock');

		it('should call library.bus.message with broadcast');

		it('should call library.logger.debug with blockId');
	});

	describe('__private', () => {
		describe('popLastBlock', () => {
			describe('call library.balancesSequence.add', () => {
				it('should call modules.blocks.utils.loadBlocksPart');

				it(
					'should call modules.blocks.utils.loadBlocksPart with { id: oldLastBlock.previousBlock }'
				);

				describe('when modules.blocks.utils.loadBlocksPart fails', () => {
					it('should call callback with error');
				});

				describe('when modules.blocks.utils.loadBlocksPart succeeds', () => {
					describe('when previousBlock is null', () => {
						it('should call callback with "previousBlock is null"');
					});

					describe('for every oldLastBlock.transactions', () => {
						it('should call modules.accounts.getAccount');

						it(
							'should call modules.accounts.getAccount with {publicKey: transaction.senderPublicKey}'
						);

						describe('when modules.accounts.getAccount fails', () => {
							it('should call library.logger.error with error');

							it(
								'should call library.logger.error "Failed to undo transactions"'
							);

							it('should call process.exit with 0');
						});

						describe('when modules.accounts.getAccount succeeds', () => {
							it('should call modules.transactions.undo');

							it('should call modules.transactions.undo with transaction');

							it('should call modules.transactions.undo with oldLastBlock');

							it('should call modules.transactions.undo with sender');

							it('should call modules.transactions.undoUnconfirmed');

							it(
								'should call modules.transactions.undoUnconfirmed with transaction'
							);

							it('should call self.deleteBlock');

							it('should call self.deleteBlock with oldLastBlock.id');

							describe('when self.deleteBlock fails', () => {
								it('should call library.logger.error with error');

								it(
									'should call library.logger.error with "Failed to delete block"'
								);

								it('should call process.exit with 0');
							});

							describe('when self.deleteBlock succeeds', () => {
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

	describe('deleteLastBlock', () => {
		it('should call modules.blocks.lastBlock.get');

		it('should call logger.warn lastBlock');

		describe('when lastBlock.height = 1', () => {
			it('should call callback with error "Cannot delete genesis block');
		});

		it('should call __private.popLastBlock');

		it('should call __private.popLastBlock with lastBlock');

		describe('when __private.popLastBlock fails', () => {
			it('should call logger.error with "Error deleting last block"');

			it('should call logger.error with lastBlock');

			it('should call callback with error');

			it('should call callback with lastBlock');
		});
		describe('when __private.popLastBlock succeeds', () => {
			it('should replace the lastBlock with the previous one');

			it('should call callback with error = null');

			it('should call callback with result = lastBlock');
		});
	});

	describe('recoverChain', () => {
		it('should call logger.warn with warning');

		it('should call self.deleteLastBlock');

		describe('when self.deleteLastBlock fails', () => {
			it('should call logger.error with "Recovery failed"');

			it('should return callback with error');
		});

		describe('when self.deleteLastBlock succeeds', () => {
			it('should call logger.info with newLastBlock.id');

			it('should call logger.info with "Recovery complete, new last block"');

			it('should call callback with error = null');
		});
	});

	describe('onBind', () => {
		it('should call logger.trace with "Blocks->Chain: Shared modules bind."');

		it('should set __private.loaded = true');

		describe('modules', () => {
			it('should assign accounts');

			it('should assign blocks');

			it('should assign transactions');
		});
	});
});
