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
		describe('forge block with 1 TRANSFER transaction to random account', () => {
			describe('new block', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});
		});

		describe('forge block with 25 TRANSFER transactions to random accounts', () => {
			describe('new block', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});
		});

		describe('should forge 97 blocks with 1 TRANSFER transaction each to random account', () => {
			describe('new block', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});
		});

		describe('forge block with 1 TRANSFER transaction to random account (last block of round)', () => {
			describe('new block', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});
		});

		describe('after round 1 is finished', () => {
			it.todo('last block height should equal active delegates count');

			it.todo(
				'should calculate rewards for round 1 correctly - all should be the same (calculated, rounds_rewards, mem_accounts)'
			);

			it.todo(
				'should generate a different delegate list than one generated at the beginning of round 1'
			);
		});

		describe('delete last block of round 1, block contains 1 transaction type SEND', () => {
			it.todo(
				'transactions from deleted block should be added back to transaction pool'
			);

			it.todo(
				'round rewards should be empty (rewards for round 1 deleted from rounds_rewards table)'
			);

			it.todo(
				'mem_accounts table should be equal to one generated before last block of round deletion'
			);

			it.todo(
				'delegates list should be equal to one generated at the beginning of round 1'
			);
		});

		describe('deleting last block of round twice in a row', () => {
			it.todo('should be able to delete last block of round again');

			it.todo(
				'mem_accounts table should be equal to one generated before last block of round deletion'
			);

			it.todo(
				'delegates list should be equal to one generated at the beginning of round 1'
			);
		});

		describe('round rollback when forger of last block of round is unvoted', () => {
			it.todo(
				'last block height should be at height 99 after deleting one more block'
			);

			it.todo(
				'transactions from deleted block should be added back to transaction pool'
			);

			it.todo(
				'expected forger of last block of round should have proper votes'
			);

			describe('new block', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});

			describe('after forging 1 block', () => {
				it.todo(
					'should unvote expected forger of last block of round (block data)'
				);

				it.todo(
					'expected forger of last block of round should still have proper votes'
				);
			});

			describe('new block []', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});

			describe('after round finish', () => {
				it.todo(
					'delegates list should be different than one generated at the beginning of round 1'
				);

				it.todo('forger of last block of previous round should have vote = 0');
			});

			describe('after last block of round is deleted', () => {
				it.todo(
					'delegates list should be equal to one generated at the beginning of round 1'
				);

				it.todo(
					'expected forger of last block of round should have proper votes again'
				);
			});
		});

		describe('round rollback when forger of last block of round is replaced in last block of round', () => {
			describe('new block - transfer', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});

			describe('new block - delegate', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});

			describe('new block - vote', () => {
				it.todo('ID should be different than last block ID');
				it.todo('block version should be 1');
				it.todo('height should be greather by 1');
				it.todo('should contain all expected transactions');
				describe('mem_accounts table', () => {
					it.todo(
						'if block contains at least one transaction states before and after block should be different'
					);
					it.todo(
						'delegates with highest weight used for generating list should be the same for same round'
					);
					it.todo('delegates list should be the same for same round');
					it.todo('accounts table states should match expected states');
					it.todo('balances should be valid against blockchain balances');
				});
			});

			describe('after round finish', () => {
				it.todo('last block height should be at height 101');

				it.todo(
					'after finishing round, should unvote expected forger of last block of round and vote new delegate (block data)'
				);

				it.todo(
					'delegates list should be different than one generated at the beginning of round 1'
				);

				it.todo('unvoted delegate should not be on list');

				it.todo('delegate who replaced unvoted one should be on list');

				it.todo('forger of last block of previous round should have vote = 0');

				it.todo(
					'delegate who replaced last block forger should have proper votes'
				);
			});

			describe('after last block of round is deleted', () => {
				it.todo(
					'delegates list should be equal to one generated at the beginning of round 1'
				);

				it.todo('last block height should be at height 100');

				it.todo(
					'expected forger of last block of round should have proper votes again'
				);

				it.todo(
					'delegate who replaced last block forger should have vote, producedBlocks, missedBlocks = 0'
				);
			});
		});
	});

	describe('round 2', () => {
		describe('rounds rewards consistency', () => {
			describe('should forge 49 blocks with 1 TRANSFER transaction each to random account', () => {
				describe('new block', () => {
					it.todo('ID should be different than last block ID');
					it.todo('block version should be 1');
					it.todo('height should be greather by 1');
					it.todo('should contain all expected transactions');
					describe('mem_accounts table', () => {
						it.todo(
							'if block contains at least one transaction states before and after block should be different'
						);
						it.todo(
							'delegates with highest weight used for generating list should be the same for same round'
						);
						it.todo('delegates list should be the same for same round');
						it.todo('accounts table states should match expected states');
						it.todo('balances should be valid against blockchain balances');
					});
				});
			});

			describe('before rewards start', () => {
				it.todo('last block height should be at height 149');

				it.todo('block just before rewards start should have reward = 0');
			});

			describe('after rewards start', () => {
				describe('new block', () => {
					it.todo('ID should be different than last block ID');
					it.todo('block version should be 1');
					it.todo('height should be greather by 1');
					it.todo('should contain all expected transactions');
					describe('mem_accounts table', () => {
						it.todo(
							'if block contains at least one transaction states before and after block should be different'
						);
						it.todo(
							'delegates with highest weight used for generating list should be the same for same round'
						);
						it.todo('delegates list should be the same for same round');
						it.todo('accounts table states should match expected states');
						it.todo('balances should be valid against blockchain balances');
					});
				});
			});

			describe('after finish round', () => {
				it.todo(
					'should calculate rewards for round 2 correctly - all should be the same (native, rounds_rewards)'
				);
			});
		});
	});

	describe('rollback more than 1 round of blocks', () => {
		it.todo('last block height should be at height 101');

		it.todo(
			'should fail when try to delete one more block (last block of round 1)'
		);

		it.todo('last block height should be still at height 101');
	});

	describe('deleting last block of round twice in a row - no transactions during round', () => {
		it.todo('should be able to delete last block of round');

		it.todo('should be able to delete last block of round again');
	});
});
