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
describe('integration test (blocks) - receiveBlockFromNetwork()', () => {
	describe('receiveBlockFromNetwork (empty transactions)', () => {
		it.todo('should add a valid block block to chain');

		describe('when a block causes a fork 3', () => {
			describe('validate block slot', () => {
				it.todo(
					'should not add block to chain when generator is not a delegate'
				);

				it.todo(
					'should not add block to chain when block generator has incorrect slot'
				);
			});
		});

		describe('when a block causes a fork 1', () => {
			beforeEach('forge 300 blocks');

			describe('when received block timestamp is greater than previous block', () => {
				it.todo('should reject received block');
				it.todo('should generate valid fork stats');
			});

			describe('when received block timestamp is lower than previous block', () => {
				it.todo('should reject received block and delete last two blocks');
				it.todo('should generate valid fork stats');
			});

			describe('when block height is mutated', () => {
				describe('when received block is from previous round (101 blocks back)', () => {
					it.todo('should reject received block');
					it.todo('should generate valid fork stats');
				});

				describe('when received block is from same round and BLOCK_SLOT_WINDOW - 1 slots in the past', () => {
					it.todo('should reject received block');
					it.todo('should generate valid fork stats');
				});

				describe('when received block is from same round and greater than BLOCK_SLOT_WINDOW slots in the past', () => {
					it.todo('should reject received block');
					it.todo('should generate valid fork stats');
				});

				describe('when received block is from a future slot', () => {
					it.todo('should reject received block');
					it.todo('should generate valid fork stats');
				});
			});
		});

		describe('when a block causes a fork 5', () => {
			describe('with 5 blocks forged', () => {
				describe('when timestamp is greater than last block', () => {
					it.todo('should reject received block');
					it.todo('should generate valid fork stats');

					describe('when delegate slot is invalid', () => {
						it.todo('should reject received block');
						it.todo('should generate valid fork stats');
					});
				});

				describe('when timestamp is lower than last block', () => {
					describe('when block slot is invalid', () => {
						it.todo('should reject received block when blockslot is invalid');
						it.todo('should generate valid fork stats');
					});

					describe('when blockslot and generator publicKey is valid', () => {
						it.todo('should replace last block with received block');
						it.todo('should generate valid fork stats');
					});

					describe('when generator publicKey and timestamp is different', () => {
						describe('when timestamp is inside slot window', () => {
							it.todo('should reject received block and delete last block');
							it.todo('should generate valid fork stats');
						});

						describe('when timestamp is outside slot window', () => {
							it.todo(
								'should reject received block when blockslot outside window'
							);
							it.todo('should generate valid fork stats');
						});
					});

					describe('when last block skipped a slot', () => {
						it.todo(
							'should delete skipped block and save received block (with lower slot)'
						);
						it.todo('should generate valid fork stats');
					});

					describe('with 100 blocks forged', () => {
						describe('after new round', () => {
							it.todo(
								'should delete last block and save received block (from previous round)'
							);
							it.todo('should generate valid fork stats');
						});
					});
				});

				describe('discard blocks', () => {
					describe('when block is already processed', () => {
						it.todo('should reject received block');
					});

					describe('when block does not match blockchain', () => {
						it.todo('should reject received block');
					});
				});
			});
		});
	});
});
