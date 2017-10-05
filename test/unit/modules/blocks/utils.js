'use strict';

describe('blocks/utils', function () {

	describe('Utils', function () {

		describe('library', function () {

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
		
		it('should call library.logger.trace with "Blocks->Utils: Submodule initialized."');

		it('should return self');
	});

	describe('readDbRows', function () {

		it('should loop through all given rows');

		
		
		describe('for every row in rows', function () {
			
			it('should call library.logic.block.dbRead with current row');
			
			describe('when block exists', function () {

				describe('and block.id is not already in the blocks array', function () {

					describe('and is genesis block', function () {

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

		it('should call library.dbSequence.add');

		it('should call library.db.query to load the last block');

		describe('when db query fails', function () {

			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadLastBlock error');
		});

		describe('when db.query succeeds', function () {

			describe('sorting the block.transactions array', function () {

				describe('when block.id equals genesis.block.id', function () {

					describe('and transactionType equals VOTE', function () {

						it('should move it to the end of the block array');
					});
				});

				describe('when transactionType equals SIGNATURE', function () {

					it('should move it to the end of the block.transactions array');
				});
			});

			it('should call modules.blocks.lastBlock.set');
			
			it('should call modules.blocks.lastBlock.set with block');

			it('should return callback with error = null');

			it('should return callback with result = block');
		});
	});

	describe('getIdSequence', function () {

		it('should call modules.blocks.lastBlock.get');

		it('should call library.db.query');

		it('should call library.db.query with sql.getIdSequence');

		it('should call library.db.query with {height: height, limit: 5, delegates: constants.activeDelegates}');

		describe('when db query fails', function () {

			it('should call logger.error with error stack');

			it('should call callback with the Blocks#getIdSequence error');
		});

		describe('when db query succeeds', function () {

			describe('and returns no results', function () {

				it('should call callback with an error');
			});

			it('should add the genesis block to the end of the block array, if it does not contain it already');

			it('should add the last block to the beginning of the block array, if it does not contain it already');

			it('should return callback with error = null');

			describe('result object', function () {

				it('should assign firstHeight to the height of the last block');

				it('should assign ids to a string of the block ids');
			});

			it('should return callback with result object');
		});
	});

	describe('loadBlocksData', function () {

		describe('when 3 parameters are passed to loadBlocksData', function () {

			it('should call third parameter');
		});

		describe('when 2 parameters are passed to loadBlocksData', function () {

			it('should call second parameter');
		});

		describe('when filter.id and filter.lastId are defined',function () {

			it('should return callback with Invalid Filter error');
		});

		describe('when filter.lastId is undefined and filter.id is defined', function () {

			it('should set params.id to filter.id');
		});

		describe('when filter.id is undefined and filter.lastId is defined', function () {

			it('should set params.lastId to filter.lastId');
		});

		it('should call library.dbSequence.add');

		it('should call library.db.query');

		it('should call library.db.query with sql.getHeightByLastId');

		describe('when filter.lastId exists', function () {

		   it('should call library.db.query with {lastId: filter.lastId}');
		});

		describe('when filter.lastId does not exist', function () {

		   it('should call library.db.query with {lastId: null}');
		});

		describe('when db query fails', function () {

			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadBlockData error');
		});

		describe('when db query succeeds', function () {

			describe('and does not return results', function () {

				it('should set height to 0');
			});

			describe('and returns results', function () {

				it('should set height to rows[0].height');
			});

			it('should set params.limit to realLimit');

			it('should set params.height to height');

			it('should call library.db.query');

			it('should call library.db.query with sql.loadBlocksData with filter');

			it('should call library.db.query with params)');

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

					it('should throw error');
				});

				it('should increment this.applied');

				describe('when this.applied = 1', function () {

					it('should call log');
				});

				describe('when this.applied = this.target', function () {

					it('should call log');
				});

				describe('when this.applied %this.step = 1', function () {

					it('should call log');
				});
			});

			describe('log function', function () {

				it('should call library.logger.info with msg');

				it('should call library.logger.info with message');
			});
		});

		it('should return a new instance of BlockProgressLogger');
	});

	describe('onBind', function () {

		it('should call library.logger.trace with "Blocks->Utils: Shared modules bind."');

		it('should create a modules object { blocks: scope.blocks }');

		it('should set __private.loaded to true');
	});
});
