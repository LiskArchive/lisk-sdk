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

describe('rounds', () => {
	describe('round 1', () => {
		describe('when forging a block with 1 TRANSFER transaction to random account.', () => {
			it.todo('should have a different ID than the last block');
			it.todo('should have version = 1');
			it.todo('should have height greater than 1.');
			it.todo('should contain all expected transactions');
			describe('Account(s) state(s)', () => {
				it.todo('should be updated');
				it.todo(
					'should have the same delegates with highest weight used for generating the delegate list for the same round',
				);
				it.todo('should have the same delegate list for the same round');
				it.todo('should match expected states for accounts table states');
				it.todo('should have valid balances against blockchain balances');
			});
		});

		describe('when forging a block with 25 TRANSFER transactions to random accounts', () => {
			it.todo('should have different ID than last block ID');
			it.todo('should have block version = 1');
			it.todo('should have height greater than 1');
			it.todo('should contain all expected transactions');
			describe('Account(s) state(s)', () => {
				it.todo('should be updated');
				it.todo(
					'delegates with highest weight used for generating list should be the same for same round',
				);
				it.todo('should have the same delegates list for the same round');
				it.todo('should match expected states for accounts table states');
				it.todo('should have valid balances against blockchain balances');
			});
		});

		describe('when forging 97 blocks with 1 TRANSFER transaction each to random account', () => {
			it.todo('should have different ID than last block ID');
			it.todo('should have block version = 1');
			it.todo('should have height greater than 1');
			it.todo('should contain all expected transactions');
			describe('Account(s) state(s)', () => {
				it.todo('should be updated');
				it.todo(
					'delegates with highest weight used for generating list should be the same for same round',
				);
				it.todo('should have the same delegate list for the same round');
				it.todo('should match accounts table states with expected states');
				it.todo('should have valid balances against blockchain balances');
			});
		});

		describe('when forging a block with 1 TRANSFER transaction to random account (last block of round)', () => {
			it.todo('should have different ID than the last block ID');
			it.todo('should have block version = 1');
			it.todo('should have height greater than 1');
			it.todo('should contain all expected transactions');
			describe('Account(s) state(s)', () => {
				it.todo('should be updated');
				it.todo(
					'delegates with highest weight used for generating list should be the same for same round',
				);
				it.todo('should have the same delegates list for the same round');
				it.todo('should have accounts table states match expected states');
				it.todo('should have valid balances against blockchain balances');
			});
		});

		describe('when round 1 is finished', () => {
			it.todo(
				'should have the last block height equal to the active delegates count',
			);

			it.todo(
				'should calculate rewards for round 1 correctly - all should be the same (calculated, rounds_rewards, mem_accounts)',
			);

			it.todo(
				'should generate a different delegate list than one generated at the beginning of round 1',
			);
		});

		describe('when last block of round 1 is deleted and block contains 1 TRANSFER transaction', () => {
			it.todo(
				'should add back transactions from deleted block to the transaction pool',
			);

			it.todo(
				'should have empty round rewards (rewards for round 1 deleted from rounds_rewards table)',
			);

			it.todo(
				'should have equal mem_accounts table to the one generated before last block of round deletion',
			);

			it.todo(
				'should have equal delegates list to the one generated at the beginning of round 1',
			);
		});

		describe('when deleting last block of round twice in a row', () => {
			it.todo('should be able to delete last block of round again');

			it.todo(
				'should have equal mem_accounts table to the one generated before last block of round deletion',
			);

			it.todo(
				'should have equal delegates list to the one generated at the beginning of round 1',
			);
		});

		describe('round rollback when forger of last block of round is unvoted', () => {
			it.todo(
				'should have last block height = 99 after deleting one more block',
			);

			it.todo(
				'should add back transactions from deleted block to transaction pool',
			);

			it.todo(
				'should have expected forger of last block of the round to have proper votes',
			);

			describe('new block', () => {
				it.todo('should have different ID than last block ID');
				it.todo('should have block version = 1');
				it.todo('should have height greater than 1');
				it.todo('should contain all expected transactions');
				describe('Account(s) state(s) (mem_accounts table)', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different',
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round',
					);
					it.todo('should have the same delegates list for the same round');
					it.todo('should match accounts table states to the expected states');
					it.todo('should have valid balances against blockchain balances');
				});
			});

			describe('after forging 1 block', () => {
				it.todo(
					'should unvote expected forger of last block of round (block data)',
				);

				it.todo(
					'should still have proper votes for the expected forget of the last block of the round',
				);
			});

			describe('new block []', () => {
				it.todo('should have different ID than the last block ID');
				it.todo('should have block version  = 1');
				it.todo('should have height greater than 1');
				it.todo('should contain all expected transactions');
				describe('Account(s) state(s) (mem_accounts table)', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different',
					);
					it.todo(
						'should have the delegates with the highest weight  used for generating the list to be the same for the same round',
					);
					it.todo('should have the same delegates list for the same round');
					it.todo('should match accounts table states with expected states');
					it.todo('should have valid balances against blockchain balances');
				});
			});

			describe('after round finish', () => {
				it.todo(
					'should have different delegates list than the one generated at the beginning of round 1',
				);

				it.todo(
					'should have vote = 0 for the forget of the last block of the previous round',
				);
			});

			describe('after last block of round is deleted', () => {
				it.todo(
					'should have a delegates list equal to the one generated at the beginning of round 1',
				);

				it.todo(
					'should have expected forger of the last block of the round to have proper votes again',
				);
			});
		});

		describe('round rollback when forger of last block of round is replaced in last block of round', () => {
			describe('new block - transfer', () => {
				it.todo('should have different ID than the last block ID');
				it.todo('should have block version = 1');
				it.todo('should have height greater than 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different',
					);
					it.todo(
						'should have delegates with highest weight used for generating list to be the same for the same round',
					);
					it.todo('should have delegates list to be the same for same round');
					it.todo('should have accounts table states to match expected states');
					it.todo('should have valid balances against blockchain balances');
				});
			});

			describe('new block - delegate', () => {
				it.todo('should have different ID than the last block ID');
				it.todo('should have block version = 1');
				it.todo('should have height greater than 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different',
					);
					it.todo(
						'should have delegates with highest weight used for generating the list to be the same for the same round',
					);
					it.todo(
						'should have the same delegates list to be the same for the same round',
					);
					it.todo('should match accounts table states with expected states');
					it.todo('should have valid balances against blockchain balances');
				});
			});

			describe('new block - vote', () => {
				it.todo('should have different ID than the last block ID');
				it.todo('should have version = 1');
				it.todo('should have height greater than 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different',
					);
					it.todo(
						'should have delegates with highest weight used for generating the list to be the same for the same round',
					);
					it.todo('should have the the delegates list for the same round');
					it.todo('should match accounts table states to the expected states');
					it.todo('should have valid balances against blockchain balances');
				});
			});

			describe('after round finish', () => {
				it.todo('should have last block height = 101');

				it.todo(
					'should unvote the expected forger of the last block of the round and vote the new delegate, after finishing the round (block data)',
				);

				it.todo(
					'should compute a different delegates list than the one generated at the beginning of round 1',
				);

				it.todo('should not include in the list the unvoted delegate');

				it.todo(
					'should include the delegate who replaced the unvoiced one in the list',
				);

				it.todo(
					'should compute vote = 0 for the forget of the last block of the previous round',
				);

				it.todo(
					'should compute proper votes for the delegate who replaced last block forger',
				);
			});

			describe('after last block of round is deleted', () => {
				it.todo(
					'should have the same delegates list to the one generated at the beginning of round 1',
				);

				it.todo('should have last block with height = 100');

				it.todo(
					'should have proper votes again for the expected forger of the last block of the round',
				);

				it.todo(
					'should have a delegate who replaced last block forger with vote, producedBlocks and missedBlocks = 0',
				);
			});
		});
	});

	describe('round 2', () => {
		describe('rounds rewards consistency', () => {
			describe('should forge 49 blocks with 1 TRANSFER transaction each to random account', () => {
				describe('new block', () => {
					it.todo('should have different ID than the last block');
					it.todo('should have version = 1');
					it.todo('should have height greater than 1');
					it.todo('should contain all expected transactions');
					describe('Account(s) state(s) (mem_accounts table)', () => {
						it.todo(
							'if block contains at least one transaction states before and after block should be different',
						);
						it.todo(
							'should have the same delegates with highest weight used for generating the list for the same round',
						);
						it.todo('should have the same delegates list for the same round');
						it.todo('should match accounts table states with expected states');
						it.todo('should have valid balances against blockchain balances');
					});
				});
			});

			describe('before rewards start', () => {
				it.todo('should have last block height = 149');

				it.todo(
					'should have the block just before rewards started to have reward = 0',
				);
			});

			describe('after rewards start', () => {
				describe('new block', () => {
					it.todo('should have different ID than the last block');
					it.todo('should have block version = 1');
					it.todo('should have height greater than 1');
					it.todo('should contain all expected transactions');
					describe('Account(s) state(s) (mem_accounts table)', () => {
						it.todo(
							'if block contains at least one transaction states before and after block should be different',
						);
						it.todo(
							'should have the same delegates with highest weight use for generating the list for the same round',
						);
						it.todo('should have the same delegates list for the same round');
						it.todo('should match accounts table states with expected states');
						it.todo('should have valid balances against blockchain balances');
					});
				});
			});

			describe('after finish round', () => {
				it.todo(
					'should calculate rewards for round 2 correctly - all should be the same (native, rounds_rewards)',
				);
			});
		});
	});

	describe('rollback more than 1 round of blocks', () => {
		it.todo('last block height should be at height 101');

		it.todo(
			'should fail when try to delete one more block (last block of round 1)',
		);

		it.todo('last block height should be still at height 101');
	});

	describe('deleting last block of round twice in a row - no transactions during round', () => {
		it.todo('should be able to delete last block of round');

		it.todo('should be able to delete last block of round again');
	});
});
