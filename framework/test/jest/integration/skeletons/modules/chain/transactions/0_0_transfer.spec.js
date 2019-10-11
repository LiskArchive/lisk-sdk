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

describe('integration test (type 0) - double transfers', () => {
	describe('executing 30 times', () => {
		it.todo('should ok adding a transfer to the pool');

		it.todo(
			'should be ok adding to the pool the same transfer trs with different timestamp',
		);

		describe('after forging one block', () => {
			it.todo('should include the first transfer transaction to arrive');

			it.todo('should not include the last transfer transaction to arrive');

			it.todo(
				'should fail adding to the pool a transfer transaction for the same account',
			);
		});
	});
});
