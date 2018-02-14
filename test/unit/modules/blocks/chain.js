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
	var busStub;
	var modulesStub;

	beforeEach(() => {
		// Logic

		dbStub = {
			blocks: {
				getGenesisBlockId: sinonSandbox.stub(),
				deleteBlock: sinonSandbox.stub(),
				deleteAfterBlock: sinonSandbox.stub(),
			},
			tx: sinonSandbox.stub(),
		};
		blockStub = sinonSandbox.stub();
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};
		busStub = {
			message: sinonSandbox.stub(),
		};
		transactionStub = {
			afterSave: sinonSandbox.stub().callsArgWith(1, null, true),
		};
		blocksChainModule = new BlocksChain(
			loggerStub,
			blockStub,
			transactionStub,
			dbStub,
			modulesLoader.scope.genesisblock,
			busStub,
			modulesLoader.scope.balancesSequence
		);

		library = BlocksChain.__get__('library');
		__private = BlocksChain.__get__('__private');
		// Module

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

	afterEach(() => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.genesisblock).to.eql(modulesLoader.scope.genesisblock);
			expect(library.bus).to.eql(busStub);
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
		var saveBlockTemp;
		describe('library.db.blocks.getGenesisBlockId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.getGenesisBlockId.rejects('getGenesisBlockId-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains(
						'getGenesisBlockId-ERR'
					);
				});

				it('should throws error', done => {
					blocksChainModule.saveGenesisBlock(err => {
						expect(err).to.equal('Blocks#saveGenesisBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				describe('if returns empty row (genesis block is not in database)', () => {
					beforeEach(() => {
						library.db.blocks.getGenesisBlockId.resolves([]);
						saveBlockTemp = blocksChainModule.saveBlock;
					});
					afterEach(() => {
						blocksChainModule.saveBlock = saveBlockTemp;
					});

					describe('self.saveBlock', () => {
						beforeEach(() => {
							blocksChainModule.saveBlock = sinonSandbox.stub();
						});

						describe('when fails', () => {
							beforeEach(() => {
								blocksChainModule.saveBlock.callsArgWith(1, 'saveBlock-ERR', null);
							});

							it('should return error', done => {
								blocksChainModule.saveGenesisBlock(err => {
									expect(err).to.equal('saveBlock-ERR');
									done();
								});
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								blocksChainModule.saveBlock.callsArgWith(1, null, true);
							});

							it('should return cb', done => {
								blocksChainModule.saveGenesisBlock(cb => {
									expect(cb).to.be.null;
									done();
								});
							});
						});
					});
				});

				describe('if returns row', () => {
					beforeEach(() => {
						library.db.blocks.getGenesisBlockId.resolves([{ id: 1 }]);
					});

					it('should return cb', done => {
						blocksChainModule.saveGenesisBlock(err => {
							expect(err).to.be.undefined;
							done();
						});
					});
				});
			});
		});
	});

	describe('saveBlock', () => {
		var afterSaveTemp;
		beforeEach(() => {
			afterSaveTemp = __private.afterSave;
		});

		afterEach(() => {
			__private.afterSave = afterSaveTemp;
		});

		describe('when tx param is passed', () => {
			var txStub;
			beforeEach(() => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
			});
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						txStub.batch.rejects('txbatch-ERR');
					});

					it('should throw error', done => {
						var block = { id: 1,
						transactions: [
							{ id: 1, type: 0 }, { id: 2, type: 1 },
						] };
						blocksChainModule.saveBlock(block, err => {
							expect(err).to.equal('Blocks#saveBlock error');
							done();
						}, txStub);
					});
				});

				describe('when succeeds', () => {
					beforeEach(() => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox.stub().callsArgWith(1, null, true);
					});

					it('should call __private.afterSave', done => {
						var block = { id: 1,
						transactions: [
							{ id: 1, type: 0 }, { id: 2, type: 1 },
						] };
						blocksChainModule.saveBlock(block, () => {
							expect(__private.afterSave.calledOnce).to.be.true;
							done();
						}, txStub);
					});
				});
			});
		});

		describe('when tx param is not passed', () => {
			var txStub;
			beforeEach(() => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
				library.db.tx.callsArgWith(1, txStub);
			});
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						txStub.batch.rejects('txbatch-ERR');
					});

					it('should throw error', done => {
						var block = { id: 1,
						transactions: [
							{ id: 1, type: 0 }, { id: 2, type: 1 },
						] };
						blocksChainModule.saveBlock(block, err => {
							expect(err).to.equal('Blocks#saveBlock error');
							done();
						});
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox.stub().callsArgWith(1, null, true);
					});

					it('should call __private.afterSave', done => {
						var block = { id: 1,
						transactions: [
							{ id: 1, type: 0 }, { id: 2, type: 1 },
						] };
						blocksChainModule.saveBlock(block, () => {
							expect(__private.afterSave.calledOnce).to.be.true;
							done();
						});
					});
				});
			});
		});
	});

	describe('__private.afterSave', () => {
		afterEach(() => {
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('transactionsSaved');
			expect(library.bus.message.args[0][1]).to.deep.equal([{ id: 1, type: 0 }, { id: 2, type: 1 }]);
		});

		it('should call afterSave for all transactions', done => {
			var block = { id: 1,
				transactions: [
					{ id: 1, type: 0 }, { id: 2, type: 1 },
				] };
			__private.afterSave(block, () => {
				expect(library.logic.transaction.afterSave.callCount).to.equal(2);
				done();
			});
		});
	});

	describe('deleteBlock', () => {
		describe('library.db.blocks.deleteBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.deleteBlock.rejects('deleteBlock-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteBlock-ERR'
					);
				});

				it('should return error', done => {
					blocksChainModule.deleteBlock(1, err => {
						expect(err).to.equal('Blocks#deleteBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					library.db.blocks.deleteBlock.resolves(true);
				});

				it('should return immediate', done => {
					blocksChainModule.deleteBlock(1, () => {
						done();
					});
				});
			});
		});
	});

	describe('deleteAfterBlock', () => {
		describe('library.db.blocks.deleteAfterBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					library.db.blocks.deleteAfterBlock.rejects('deleteAfterBlock-ERR');
				});

				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteAfterBlock-ERR'
					);
				});

				it('should return error', done => {
					blocksChainModule.deleteAfterBlock(1, err => {
						expect(err).to.equal('Blocks#deleteAfterBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					library.db.blocks.deleteAfterBlock.resolves(true);
				});

				it('should return immediate', done => {
					blocksChainModule.deleteAfterBlock(1, (err, res) => {
						expect(err).to.be.null;
						expect(res).to.be.true;
						done();
					});
				});
			});
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
