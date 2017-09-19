'use strict';

describe('blocks/utils', function () {
	
	describe('Utils', function () {
		
		describe('library', function (){
			
			it('should assign logger');
			it('should assign db');
			it('should assign dbSequence');
			it('should assign genesisblock');
			describe('should assign logic',function () {
				
				it('should assign block');
				
				it('should assign transaction');
			});
		});
		
		it('should set self to this');
		
		it('should call library.logger.trace("Blocks->Utils: Submodule initialized.")');
		
		it('should return self');
	});
	
	describe('readDbRows', function () {
		
		it('should loop through all given rows');
		
		it('should call library.logic.block.dbRead with current row');

		describe('when block exists', function () {

			describe('and block is not already in list', function () {
				
				describe('and block is the genesis block', function () {
					
					it('should generate a fake signature for it');		
				});

				it('should push the block.id to order array');

				it('should add the block to block array');
			});
			
			it('should call library.logic.transaction.dbRead with current row');
			
			describe('and there are no transactions in the block', function () {
				
				it('should set transactions to an empty object');		
			});
			
			describe('and a transaction exists', function () {
				
				it('should be added to the block if it is not added yet');				
			});
		});
		
		it('should reorganize the block array');
		
		it('should return the block array');		
	});
	
	describe('loadBlocksPart', function () {
		
		describe('when there is no error when loading block array', function () {
			
			it('should be normalized');			
		});
		
		it('should return callback with the error object and blocks as params');
	});
	
	describe('loadLastBlock', function () {
		
		it('should call library.dbSequence.add with callback');
		
		it('should call library.db.query to load the last block');
		
		describe('when db query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadLastBlock error');
		});

		describe('when db.query succeeds', function () {
		
			it('should call modules.blocks.utils.readDbRows and set "block" to first item of return value');

			describe('sorting the block-transactions array', function () {

				describe('when block.id equals genesis.block.id', function () {
					
					describe('and transactionType equals VOTE', function () {

						it('should move it to the end of the block array');
					});
				});

				describe('when transactionType equals SIGNATURE', function () {

					it('should move it to the end of the block.transactions array');
				});
			});

			it('should call modules.blocks.lastBlock.set(block)');

			it('should return callback with error = null');

			it('should return callback with result containing the block');			
		});
	});
	
	describe('getIdSequence', function () {
		
		it('should set lastBlock to modules.blocks.lastBlock.get()');
		
		it('should call library.db.query to load the last block');
		
		describe('when db query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#getIdSequence error');
		});
		
		describe('when db query succeeds', function () {
			
			describe('and returns no results', function () {

				it('should call callback with an error');			
			});			
		});
		
		it('should add the genesis block to the end of the block array, if it does not contain it already');
		
		it('should add the last block to the beginning of the block array, if it does not contain it already');
		
		it('should push each block.id into the ids array');
		
		it ('should return callback with error = null');
		
		it('should return callback with result object');		
	});
	
	describe('loadBlocksData', function () {
		
		describe('when less than 3 parameters are passed to loadBlocksData()', function () {
			
			it('should set cb to the value of options');
			
			it('should set options to an empty object');			
		});
		
		it('should set options to an empty object if it is undefined');
		
		describe('when filter.id and filter.lastId are defined',function () {
			
			it('should return callback with Invalid Filter error');
		});
		
		describe('when filter.lastId is undefined and filter.id is not undefined', function () {
			
			it('should set params.id to filter.id');			
		});
		
		describe('when filter.id is undefined and filter.lastId is not undefined', function () {
			
			it('should set params.lastId to filter.lastId');			
		});
		
		it('should call library.dbSequence.add with callback');
		
		it('should call library.db.query(sql.getHeightByLastId, { lastId: filter.lastId || null })');
		
		describe('when db query fails', function () {
			
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadBlockData error');
		});
		
		describe('when db query succeeds', function () {
		
			describe('when rows.length is undefined', function () {

				it('should set height to 0');
			});

			describe('when rows.length is defined', function () {

				it('should set height to rows[0].height');
			});

			it('should set params.limit to realLimit');

			it('should set params.height to height');

			it('should call library.db.query(sql.loadBlocksData(filter), params)');
			
			describe('when db query succeeds', function () {
				
				it('should return callback with error = null');
				
				it('should return callback with result containing the rows');				
			});
		});
	});
	
	describe('getBlockProgressLogger', function () {
		
		describe('BlockProgressLogger', function () {
			
			it('should set this.target to transactionsCount');
			
			it('should set this.step to Math.floor(transactionsCount / logsFrequency);');
			
			it('should set this.applied to 0');
			
			describe('reset function', function () {
				
				it('should set this.applied to 0');				
			});
			
			describe('applyNext function', function () {
				
				describe('when this.applied >= this.target', function () {
					
					it('should throw new Error: "Cannot apply transaction over the limit: " + this.target');				
				});
				
				it('should increase this.applied by +1');
				
				describe('when this.applied = 1 or this.applied = this.target or this.applied %this.step = 1', function () {
					
					it('should execute this.log()');					
				});
			});
			
			describe('log function', function () {
				
				it('should call library.logger.info with correct parameters');				
			});
		});
		
		it('should return a new instance of BlockProgressLogger');		
	});
	
	describe('onBind', function () {
		
		it('should call library.logger.trace("Blocks->Utils: Shared modules bind.")');
		
		it('should create a modules object { blocks: scope.blocks }');
		
		it('should set __private.loaded to true');		
	});
});
