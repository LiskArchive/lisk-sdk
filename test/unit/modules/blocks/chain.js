'use strict';

describe('blocks/chain', function () {

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

		it('should call library.db.query with sql.getGenesisBlockId');

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

		it('should call library.db.none with sql.deleteBlock');

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

			it('should call modules.accounts.getSender');

			it('should call modules.accounts.getSender with {publicKey: transaction.senderPublicKey}');

			describe('when modules.accounts.getSender fails', function () {
				
				describe('error object', function () {

					it('should assign message');

					it('should assign transaction');

					it('should assign block');
				});

				it('should call process.exit with 0');
			});

			describe('when modules.accounts.getSender succeeds', function () {

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

	});

	describe('applyBlock', function () {

		it('should call modules.blocks.isActive');

		it('should call modules.blocks.isActive with true');
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
