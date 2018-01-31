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

describe('blocks/utils', () => {
	describe('Utils', () => {
		describe('library', () => {
			it('should assign logger');

			it('should assign db');

			it('should assign dbSequence');

			it('should assign genesisblock');

			describe('should assign logic', () => {
				it('should assign block');

				it('should assign transaction');
			});
		});

		it('should set self to this');

		it(
			'should call library.logger.trace with "Blocks->Utils: Submodule initialized."'
		);

		it('should return self');
	});

	describe('readDbRows', () => {
		it('should loop through all given rows');

		it('should call library.logic.block.dbRead with every row');

		describe('when block with id does not exist', () => {
			it('should not return the block');
		});

		describe('when block with id exists', () => {
			describe('and block indices are duplicated', () => {
				it('should not return duplicated blocks');
			});

			describe('and block indices are unique', () => {
				describe('and there are no transactions in the block', () => {
					it('should return the block containing transactions = {}');
				});

				describe('and there are transactions in the block', () => {
					it('should return the block containing transactions');
				});
			});
		});
	});

	describe('loadBlocksPart', () => {
		describe('when there is no error when loading block array', () => {
			it('should be normalized');

			it('should call callback with error = undefined');

			it('should call callback with blocks as result');
		});

		describe('when error is defined', () => {
			it('should call callback with the error object');

			it('should call callback with blocks as result');
		});
	});

	describe('loadLastBlock', () => {
		it('should call library.dbSequence.add');

		it('should call library.db.query to load the last block');

		describe('when db query fails', () => {
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadLastBlock error');
		});

		describe('when db.query succeeds', () => {
			describe('sorting the block.transactions array', () => {
				describe('when block.id equals genesis.block.id', () => {
					describe('and transactionType equals VOTE', () => {
						it('should move it to the end of the block array');
					});
				});

				describe('when transactionType equals SIGNATURE', () => {
					it('should move it to the end of the block.transactions array');
				});
			});

			it('should call modules.blocks.lastBlock.set with block');

			it('should call callback with error = null');

			it('should call callback with result containing the block');
		});
	});

	describe('getIdSequence', () => {
		it('should call modules.blocks.lastBlock.get');

		it('should call library.db.query');

		it('should call library.db.query with sql.getIdSequence');

		it(
			'should call library.db.query with {height: height, limit: 5, delegates: constants.activeDelegates}'
		);

		describe('when db query fails', () => {
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#getIdSequence error');
		});

		describe('when db query succeeds', () => {
			describe('and returns no results', () => {
				it('should call callback with an error');
			});

			it(
				'should add the genesis block to the end of the block array, if it does not contain it already'
			);

			it(
				'should add the last block to the beginning of the block array, if it does not contain it already'
			);

			it('should call callback with error = null');

			describe('result object', () => {
				it('should assign firstHeight to the height of the last block');

				it('should assign ids to a string of the block ids');
			});

			it('should call callback with result object');
		});
	});

	describe('loadBlocksData', () => {
		describe('when 3 parameters are passed to loadBlocksData', () => {
			it('should call third parameter');
		});

		describe('when 2 parameters are passed to loadBlocksData', () => {
			it('should call second parameter');
		});

		describe('when filter.id and filter.lastId are defined', () => {
			it('should call callback with Invalid Filter error');
		});

		describe('when filter.lastId is undefined and filter.id is defined', () => {
			it('should set params.id to filter.id');
		});

		describe('when filter.id is undefined and filter.lastId is defined', () => {
			it('should set params.lastId to filter.lastId');
		});

		it('should call library.dbSequence.add');

		it('should call library.db.query');

		it('should call library.db.blocks.getHeightByLastId');

		describe('when filter.lastId exists', () => {
			it('should call library.db.query with {lastId: filter.lastId}');
		});

		describe('when filter.lastId does not exist', () => {
			it('should call library.db.query with {lastId: null}');
		});

		describe('when db query fails', () => {
			it('should call logger.error with error stack');

			it('should call callback with the Blocks#loadBlockData error');
		});

		describe('when db query succeeds', () => {
			describe('and does not return results', () => {
				it('should set height to 0');
			});

			describe('and returns results', () => {
				it('should set height to rows[0].height');
			});

			it('should set params.limit to realLimit');

			it('should set params.height to height');

			it('should call library.db.query');

			it('should call library.db.query with sql.loadBlocksData with filter');

			it('should call library.db.query with params)');

			describe('when db query succeeds', () => {
				it('should call callback with error = null');

				it('should call callback with result containing the rows');
			});
		});
	});

	describe('getBlockProgressLogger', () => {
		describe('BlockProgressLogger', () => {
			it('should set this.target to transactionsCount');

			it(
				'should set this.step to Math.floor(transactionsCount / logsFrequency);'
			);

			it('should set this.applied to 0');

			describe('reset function', () => {
				it('should set this.applied to 0');
			});

			describe('applyNext function', () => {
				describe('when this.applied >= this.target', () => {
					it('should throw error');
				});

				it('should increment this.applied');

				describe('when this.applied = 1', () => {
					it('should call this.log');
				});

				describe('when this.applied = this.target', () => {
					it('should call this.log');
				});

				describe('when this.applied %this.step = 1', () => {
					it('should call this.log');
				});
			});

			describe('log function', () => {
				it('should call library.logger.info with msg');

				it('should call library.logger.info with message');
			});
		});

		it('should return a new instance of BlockProgressLogger');
	});

	describe('onBind', () => {
		it(
			'should call library.logger.trace with "Blocks->Utils: Shared modules bind."'
		);

		it('should create a modules object { blocks: scope.blocks }');

		it('should set __private.loaded to true');
	});
});
