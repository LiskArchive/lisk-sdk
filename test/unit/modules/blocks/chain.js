'use strict';

describe('blocks/chain', function () {
	
	describe('Chain', function () {
		
		describe('library', function () {
			
			it('should assign logger');
			
			it('should assign db');
			
			it('should assign genesisblock');
			
			it('should assign bus');
			
			it('should assign balanceSequence');
			
			describe('should assign logic',function () {
				
				it('should assign block');
				
				it('should assign transaction');
			});
		});
		
		it('should set self to this');
		
		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."');
		
		it('should return self');		
	});
	
	describe('saveGenesisBlock', function () {
		
		it('should call library.db.query');
		
		it('should call library.db.query with sql.getGenesisBlockId');
		
		it('should call library.db.query with { id: library.genesisblock.block.id }');
		
		describe('when db query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with "Blocks#saveGenesisBlock error"');
		});
		
		describe('when db query succeeds', function () {
			
			describe('and blockId is undefined', function () {
				
				it('should call self.saveBlock');
				
				it('should call self.saveBlock with library.genesisblock.block');
				
				describe('self.saveBlock callback', function () {
					
					it('should call callback with error');
				});
			});
			
			describe('and blockId is defined', function () {
				
				it('should call callback');
			});
		});
	});
	
	describe('saveBlock', function () {
		
		describe('call library.db.tx', function () {
			
			it('should call __private.promiseTransactions with t');
			
			it('should call __private.promiseTransactions with block');
			
			it('should call __private.promiseTransactions with promises');
			
			it('should call t.batch with promises');
		});
		
		describe('when library.db.tx fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with Blocks#saveBlock error');
		});
		
		describe('when library.db.tx succeeds', function () {
			
			it('should return __private.afterSave');
			
			it('should return __private.afterSave with block');
			
			it('should return __private.afterSave with callback');
		});
	});
	
	describe('__private', function () {
		describe('afterSave', function () {
		
			it('should call library.bus.message with "transactionsSaved"');
			
			it('should call library.bus.message with block.transactions');
			
			it('should call async.eachSeries with block.transactions');
			
			describe('loop through block.transactions', function () {
				
				it('should return library.logic.transaction.afterSave with each transaction');
				
				it('should return library.logic.transaction.afterSave with callback');
			});
			
			describe('after loop through block.transactions', function () {
				
				it('should call callback with error');
			});
		});
		
		//TODO
		describe('promiseTransactions', function () {
			
			describe('when block.transactions is empty', function () {
				
				it('should return t');
			});
			
			/*describe('transactionIterator', function () {
					 
				it('should set transaction.blockId to block.id');
			
				it('should return library.logic.transaction.dbSave(transaction)');
			});
			
			describe('promiseGrouper', function () {
				
				describe('when promise and promise.table are defined', function () {
					
					it('should return promise.table');
				});
				
				describe('when promise.table or promise are undefined', function () {
					
					it('should throw "Invalid promise" error');
				});
			});
			
			describe('typeIterator', function () {
				
				describe('loop through type', function () {
					describe('when  promise and promise.values are defined', function () {
						it('should set values to values.concat(promise.values)');
					});
					
					describe('when promise.values or promise are undefined', function () {
					
						it('should throw "Invalid promise" error');
					});
				});
				
				it('should set inserts to a new instance of Inserts');
					
				it('should call t.none(inserts.template(), inserts)');
			});*/
			
			it('should call _.flatMap with block.transactions');
			
			it('should call _.flatMap with transactionIterator');

			it('should loop through promises');

			it('should call typeIterator with each promise');

			it('should return t');
		});
	});
	
	describe('deleteBlock', function () {
		
		it('should call library.db.none with sql.deleteBlock');
		
		it('should call library.db.none with {id: blockId}');
		
		describe('when library.db.none fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#deleteBlock error');
		});
		
		describe('when library.db.none succeeds', function () {
				
			it('should return callback');
		});
	});
	
	describe('deleteAfterBlock', function () {
		
		it('should call library.db.query with sql.deleteAfterBlock');
		
		it('should call library.db.query with {id: blockId}');
		
		describe('when library.db.query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#deleteAfterBlock error');
		});
		
		describe('when library.db.query succeeds', function () {
			
			it('should return callback with error = null');
				
			it('should return callback with result');
		});
	});
	
	describe('applyGenesisBlock', function () {
		
		it('should sort transactions after type');
		
		it('should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length');
		
		it('should call modules.blocks.utils.getBlockProgressLogger with block.transactions.length / 100');
		
		it('should call modules.blocks.utils.getBlockProgressLogger with "Genesis block loading"');
		
		describe('looping through block.transactions', function () {
			
			describe('call modules.accounts.setAccountAndGet with public key object', function () {
				
				describe('when error is defined', function () {
					
					describe('result object', function () {
					
						it('should assign message');

						it('should assign transaction');

						it('should assign block');
					});
				
					it('should return callback with result object');
				});

				it('should apply transaction');

				it('should update block progress tracker');
			});
			
			describe('after loop through block.transactions', function () {
				
				describe('when error is defined', function () {
					
					it('should kill the node');
				});
				
				describe('when error is undefined', function () {
					
					it('should set genesis block as last block');
					
					it('should call callback');
				});
			});
		});
	});
	
	describe('__private', function () {
		describe('applyTransaction', function () {
			
			it('should call modules.transactions.applyUnconfirmed with transaction');
			
			it('should call modules.transactions.applyUnconfirmed with sender');
			
			it('should call modules.transactions.applyUnconfirmed with callback');
			
			describe('when error is defined in the callback', function () {
				
				describe('result object', function () {
					
					it('should assign message');
					
					it('should assign transaction');
					
					it('should assign block');
				});
				
				it('should return callback with result object');
			});
			
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
				
				it('should return callback with result object');
			});
			
			it('should call callback');
		});
	});
	
	describe('applyBlock', function () {
		
		it('should set modules.blocks.isActive to true');
		
		it('should call async.series');
		
		describe('execute following functions one after another', function () {
			
			describe('undoUnconfirmedList', function () {
				
				describe('call modules.transactions.undoUnconfirmedList', function () {
					
					describe('when error is defined', function () {
						
						it('should call logger.error with error');
						
						it('should return process.exit(0)');
					});
					
					describe('when error is undefined', function () {
						
						it('should set unconfirmedTransactionIds to ids');
						
						it('should call series callback');
					});
				});
			});
				
			describe('applyUnconfirmed', function () {
				
				it('should call async.eachSeries with block.transactions');

				describe('loop through block.transactions', function () {

					describe('call modules.accounts.setAccountAndGet with publickey object', function () {
						
						it('should call modules.transactions.applyUnconfirmed with transaction');
						
						it('should call modules.transactions.applyUnconfirmed with sender');

						describe('call modules.transactions.applyUnconfirmed', function () {

							describe('when error is defined', function () {

								it('should extend error message with transaction.id');

								it('should call logger.error with error');

								it('should call logger.error with "Transaction" and transaction');

								it('should call eachSeries callback with error');
							});
							
							// TODO private or not?
							it('should set appliedTransactions[transaction.id] to transaction');
							
							describe('when the transaction is in the node queue', function () {
								
								it('should be removed');
							});

							it('should call eachSeries callback');
						});
					});
					
					describe('after loop through block.transactions', function () {

						describe('when error is defined', function () {
							
							it('should call async.eachSeries with block.transactions');
							
							describe('loop through block.transaction', function () {
								
								describe('modules.accounts.getAccountAndGet with publickey object', function () {

									describe('when error is defined', function () {

										it('should call eachSeries callback with error');
									});

									describe('when appliedTransactions array contains transaction.id', function () {

										it('should call library.logic.transaction.undoUnconfirmed with transaction');
										
										it('should call library.logic.transaction.undoUnconfirmed with sender');
										
										it('should call library.logic.transaction.undoUnconfirmed with eachSeries callback');
									});

									describe('when transaction has not been applied', function () {

										it('should call eachSeries callback');
									});
								});
								
								describe('second callback', function () {
									
									it('should call series callback with error');
								});
							});
						});
						
						describe('if error is undefined', function () {
							
							it('should call series callback');
						});
					});
				});
			});
		
			describe('applyConfirmed', function () {
				
				it('should call async.eachSeries with block.transactions');

				describe('loop through block.transactions', function () {
						
					describe('call modules.accounts.getAccount with publickey object', function () {
						
						describe('when error is defined', function () {

							it('should extend error message with transaction.id');

							it('should call logger.error with error');

							it('should call logger.error with "Transaction" and transaction');

							it('should call process.exit(0)');
						});
						
						it('should call modules.transactions.apply with transaction');
						
						it('should call modules.transactions.apply with block');
						
						it('should call modules.transactions.apply with sender');

						describe('callback of modules.transactions.apply', function () {
							
							describe('when error is defined', function () {

								it('should extend error message with transaction.id');

								it('should call logger.error with error');

								it('should call logger.error with "Transaction" and transaction');

								it('should call process.exit(0)');
							});

							it('should call modules.transactions.removeUnconfirmedTransaction with transaction.id');

							it('should call eachSeries callback');
						});
					});

					describe('after loop through block.transactions', function () {
						
						it('should call series callback with error');
					});
				});
			});
		
			describe('saveBlock', function () {
				
				it('should set modules.blocks.lastBlock to block');		
				
				describe('when saveBlock is defined', function () {
					
					describe('call self.saveBlock with block', function () {
						
						describe('when error is defined', function () {
							
							it('should call logger.error with message');

							it('should call logger.error with "Block" and block');

							it('should call process.exit(0)');
						});
						
						it('should call library.logger.debug with message including block.transactions.length');
						
						it('should return series callback');
					});			
				});
				
				describe('when saveBlock is not defined', function () {
					
					it('should return series callback');
				});
			});
		
			describe('applyUnconfirmedIds', function () {
				
				describe('call modules.transactions.applyUnconfirmedIds with unconfirmedTransactionIds', function () {
					
					it('should return series callback with error');
				});
			});
		
			describe('after executing all functions of async.series', function () {
				
				it('should set modules.blocks.isActive to false');
				
				it('should nullify large objects');
				
				describe('when error equals "Snapshot finished"', function () {
					
					it('should call logger.info with error');

					it('should call process.emit("SIGTERM")');
				});
				
				it('should call callback with error');
			});
		});
	});
	
	describe('broadcastReducedBlock', function () {
		
		it('should execute library.bus.message with "newBlock"');
		
		it('should execute library.bus.message with reducedBlock');
		
		it('should execute library.bus.message with broadcast');
		
		it('should execute library.logger.debug with blockId');
	});
	
	describe('__private', function () {
		describe('popLastBlock', function () {
			
			describe('call library.balancesSequence.add', function () {
				
				describe('call modules.blocks.utils.loadBlocksPart with { id: oldLastBlock.previousBlock }', function () {
				
					describe('when error is defined', function () {
						
						it('should return callback with error');
					});
					
					describe('when previousBlock is empty', function () {
						
						it('should return callback with error');
					});
					
					describe('loop through reversed oldLastBlock.transactions', function () {
							
						describe('execute following functions one after another', function () {

							describe('first function', function () {

								describe('call modules.accounts.getAccount with publickey object', function () {

									describe('when error is defined', function () {

										it('should call callback with error');

										it('should call modules.transactions.undo with transaction, oldLastBlock, sender, cb as parameters');
									});
								});
							});

							describe('second function', function () {

								it('should undo unconfirmed transactions');
							});

							describe('third function', function () {

								it('should call callback');
							});

							describe('after executing all functions of async.series', function () {

								it('should call callback');
							});
						});
						
						describe('after loop through oldLastBlock.transactions', function () {
							
							describe('when error is defined', function () {
								
								it('should call logger.error with error');
								
								it('should return process.exit(0)');
							});
							
							it('should call self.deleteBlock with oldLastBlock.id');
							
							describe('calling self.deleteBlock', function () {
								
								describe('when error is defined', function () {
									
									it('should call library.logger.error with error');
									
									it('should call process.exit(0)');
								});
								
								it('should call callback with error = null');
								
								it('should call callback with previousBlock');
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
		
		describe('when lastBlock.height equals 1', function () {
			
			it('should return callback with error "Cannot delete genesis block');
		});
		
		describe('call __private.popLastBlock with lastBlock', function () {
			
			describe('when error is defined', function () {
				
				it('should call logger.error lastBlock');
			});
			
			describe('when error is undefined', function () {
				
				it('should replace the lastBlock with the previous one');
			});
			
			it('should call callback with error');
			
			it('should call callback with lastBlock');
		});
	});
	
	describe('recoverChain', function () {
		
		it('should call logger.warn with warning');
		
		describe('calling self.deleteLastBlock', function () {
			
			describe('when error is defined', function () {
				
				it('should call logger.error with error');
			});
			
			describe('when error is undefined', function () {
				
				it('should call logger.info with newLastBlock.id');
			});
			
			it('should call callback with error');
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