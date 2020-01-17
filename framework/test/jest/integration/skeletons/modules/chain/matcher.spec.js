/*
 * Copyright © 2019 Lisk Foundation
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

describe('matcher', () => {
	describe('when receiving transactions from a peer', () => {
		it.todo(
			'should not include a disallowed transaction in the transaction pool',
		);

		it.todo('should include an allowed transaction in the transaction pool');
	});

	describe('when receiving a block from another peer', () => {
		it.todo(
			'should reject the block if it contains disallowed transactions for the given block context',
		);

		it.todo(
			'should accept the block if it contains allowed transactions for the given block context',
		);
	});

	describe('when forging a new block', () => {
		describe('when transaction pool is full and current context (last block height) at forging time, no longer matches the transaction matcher', () => {
			it.todo(
				'should not include the transaction in a new block if it is not allowed anymore',
			);
		});

		it.todo('should include allowed transactions in the block');
	});
});
