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
		
		it('should call library.logger.trace("Blocks->Chain: Submodule initialized.")');
		
		it('should return self');		
	});
	
	describe('saveGenesisBlock', function () {
		
		it('should call library.db.query with right parameters');
		
		describe('when db query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#saveGenesisBlock error');
		});
		
		describe('when db query succeeds', function () {
			
			describe('and blockId is undefined', function () {
				
				describe('and the genesis block is saved in the database', function () {
					
					it('should call callback');
				});
			});
			
			describe('and blockId is defined', function () {
				
				it('should call callback');
			});
		});
	});
	
	describe('saveBlock', function () {
		
		describe('call library.db.tx with a callback', function () {
			
			it('should set promise to library.logic.block.dbSave(block)');
			
			it('should set inserts to a new instance of Inserts');
			
			it('should set promises to [t.none(inserts.template(), promise.values)])');
			
			it('should set t to __private.promiseTransactions(t, block, promises)');
			
			it('should execute t.batch(promises)');
		});
		
		describe('when library.db.tx fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#saveBlock error');
		});
		
		describe('when library.db.tx succeeds', function () {
			
			it('should return __private.afterSave(block, cb)');
		});
	});
	
	describe('__private', function () {
		describe('afterSave', function () {
		
			it('should call library.bus.message("transactionsSaved", block.transactions)');

			it('should call async.eachSeries with block.transactions');

			describe('when async.eachSeries failes', function () {

				it('should call callback with the error');
			});

			describe('when async.eachSeries succeeds', function () {

				it('should call library.logic.transaction.afterSave(transaction, cb)');
			});
		});
		
		describe('promiseTransactions', function () {
			
			describe('when block.transactions is empty', function () {
				
				it('should return t');
			});
			
			describe('transactionIterator', function () {
					 
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
			});
			
			it('should set promises to _.flatMap(block.transactions, transactionIterator)');

			it('should loop through promises');

			it('should call typeIterator with each promise');

			it('should return t');
		});
	});
	
	describe('deleteBlock', function () {
		
		it('should call library.db.none(sql.deleteBlock, {id: blockId})');
		
		describe('when library.db.none fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#deleteBlock error');
		});
		
		describe('when library.db.none succeeds', function () {
			
			it('should return callback with error = null');
				
			it('should return callback with result');
		});
	});
	
	describe('deleteAfterBlock', function () {
		
		it('should call library.db.query(sql.deleteAfterBlock, {id: blockId})');
		
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
		
		describe('looping through block.transactions', function () {
			
			describe('call modules.accounts.setAccountAndGet with public key object and callback', function () {
				
				describe('when err is defined', function () {

					it('should return callback with error assigned to message');

					it('should return callback with transaction assigned to transaction');

					it('should return callback with block assigned to block');
				});

				it('should apply transaction');

				it('should update block progeress tracker');
			});
			
			describe('error callback', function () {
				
				describe('when err is defined', function () {
					
					it('should kill the node');
				});
				
				describe('when err is undefined', function () {
					
					it('should set genesis block as last block');
					
					it('should call callback');
				});
			});
		});
	});
	
	describe('__private', function () {
		describe('applyTransaction', function () {
			
			it('should call modules.transactions.applyUnconfirmed with transaction, sender and callback');
			
			describe('when error is defined in the callback', function () {
				
				it('should return callback with error assigned to message');

				it('should return callback with transaction assigned to transaction');

				it('should return callback with block assigned to block');
			});
			
			it('should call modules.transactions.apply with transaction, block, sender and callback');
			
			describe('when error is defined in the callback', function () {
				
				it('should return callback with error message assigned to message');

				it('should return callback with transaction assigned to transaction');

				it('should return callback with block assigned to block');
			});
			
			it('should call callback');
		});
	});
	
	describe('applyBlock', function () {
		
		it('should set modules.blocks.isActive to true');
		
		describe('execute following functions one after another', function () {
			
			describe('undoUnconfirmedList', function () {
				
				describe('call modules.transactions.undoUnconfirmedList with callback', function () {
					
					describe('when err is defined', function () {
						
						it('should call logger.error with error');
						
						it('should return process.exit(0)');
					});
					
					describe('when err is undefined', function () {
						
						it('should set unconfirmedTransactionIds to ids');
						
						it('should call series callback');
					});
				});
			});
				
			describe('applyUnconfirmed', function () {

				describe('loop through block.transactions', function () {

					describe('first callback', function () {

						describe('call modules.accounts.setAccountAndGet with publickey object', function () {

							describe('call modules.transactions.applyUnconfirmed with transaction and sender', function () {

								describe('when err is defined', function () {

									it('should extend error message with transaction.id');

									it('should call logger.error with error');

									it('should call logger.error with message and transaction');

									it('should call eachSeries callback');
								});

								it('should set appliedTransactions[transaction.id] to transaction');

								it('should set index to transaction');

								it('should remove the transaction from the node queue, if it was present');

								it('should call eachSeries callback');
							});
						});
					});

					describe('second callback', function () {

						describe('when err is defined', function () {
							describe('loop through block.transaction', function () {

								describe('first callback', function () {
									describe('modules.accounts.getAccountAndGet with publickey object', function () {
										
										describe('when err is defined', function () {
											
											it('should call eachSeries callback with error');
										});
										
										describe('when transaction has been applied', function () {
											
											it('should call library.logic.transaction.undoUnconfirmed with transaction, sender ans eachSeries callback');
										});
										
										describe('when transaction has not been applied', function () {

											it('should call eachSeries callback');
										});
									});
								});
								
								describe('second callback', function () {
									
									it('should call series callback with error');
								});
							});
						});
						
						describe('if err is undefined', function () {
							
							it('should call series callback');
						});
					});
				});
			});
		
			describe('applyConfirmed', function () {
				
				describe('loop through block.transactions', function () {
					
					describe('first callback', function () {
						
						describe('call modules.accounts.getAccount with publickey object', function () {

							describe('when err is defined', function () {

								it('should extend error message with transaction.id');

								it('should call logger.error with error');

								it('should call logger.error with message and transaction');

								it('should call process.exit(0)');
							});

							describe('apply transaction', function () {

								describe('when err is defined', function () {

									it('should extend error message with transaction.id');

									it('should call logger.error with error');

									it('should call logger.error with message and transaction');

									it('should call process.exit(0)');
								});

								it('should call modules.transactions.removeUnconfirmedTransaction(transaction.id)');

								it('should return eachSeries callback');
							});
						});
					});

					describe('second callback', function () {
						
						it('should call series callback with error');
					});
				});
			});
		
			describe('saveBlock', function () {
				
				it('should set modules.blocks.lastBlock to block');		
				
				describe('when saveBlock is defined', function () {
					
					describe('call self.saveBlock with block', function () {
						describe('when err is defined', function () {
							
							it('should call logger.error with message');

							it('should call logger.error with message and block');

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
					
					it('should return series callback with err');
				});
			});
		
			describe('call Callback of async.series', function () {
				
				it('should set modules.blocks.isActive to false');
				
				it('should set appliedTransactions, unconfirmedTransactionIds and block to 0');
				
				describe('when err equals "Snapshot finished"', function () {
					it('should call logger.info with err');

					it('should call process.emit("SIGTERM")');
				});
				
				it('should call callback with error');
			});
		});
	});
	
	describe('broadcastReducedBlock', function () {
		
		it('should execute library.bus.message("newBlock", reducedBlock, broadcast');
		
		it('should execute library.logger.debug(["reducedBlock", blockId, "broadcasted correctly"].join(" "))');
	});
	
	//TODO: finish popLastBlock
	describe('__private', function () {
		describe('popLastBlock', function () {
			
			describe('call library.balancesSequence.add with a callback', function () {
				
				describe('call modules.blocks.utils.loadBlocksPart with { id: oldLastBlock.previousBlock } and a callback', function () {
				
					describe('when err is defined or previousBlock is empty', function () {
						
						it('should return callback with error');
					});
					
					it('should set previousBlock to previousBlock[0]');
					
					describe('loop through reversed oldLastBlock.transactions', function () {
						
						describe('first callback', function () {
							
							describe('execute following functions one after another', function () {
								
								describe('first function', function () {
									
									describe('call modules.accounts.getAccount with publickey object', function () {

										describe('when err is defined', function () {

											it('should call callback with err');

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
								
								describe('callback function', function () {
									
									it('should call callback');
								});
							});
						});
						
						describe('second callback', function () {
							
							describe('when err is defined', function () {
								
								it('should call logger.error with message and err');
								
								it('should return process.exit(0)');
							});
						});
					});
				});
			});
		});
	});
	
	describe('deleteLastBlock', function () {
		
		it('should call logger.warn with warning and lastBlock');
		
		describe('when lastBlock.height equals 1', function () {
			
			it('should return callback with error "Cannot delete genesis block');
		});
		
		describe('call __private.popLastBlock with lastBlock and callback', function () {
			describe('when err is defined', function () {
				
				it('should call logger.error with error and lastBlock');
			});
			
			describe('when err is undefined', function () {
				
				it('should replace the lastBlock with the previous one');
			});
			
			it('should call callback with err and lastBlock');
		});
	});
	
	describe('recoverChain', function () {
		
		it('should call logger.warn with warning');
		
		describe('self.deleteLastBlock with callback', function () {
			
			describe('when err is defined', function () {
				
				it('should call logger.error with error');
			});
			
			describe('when err is undefined', function () {
				
				it('should call logger.info with info and newLastBlock.id');
			});
			
			it('should call callback with err');
		});
	});
	
	describe('onBind', function () {

		it('should call logger.trace with the message');

		it('should set __private.loaded = true');

		describe('modules', function () {

			it('should assign accounts');
			
			it('should assign blocks');

			it('should assign transactions');
		});
	});
});