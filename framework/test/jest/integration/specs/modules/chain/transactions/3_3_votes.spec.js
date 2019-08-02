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

describe('integration test (type 3) - voting with duplicate submissions', () => {
	describe('executing 30 times', () => {
		it.todo('should be ok adding an upvoting transaction to the pool');

		it.todo(
			'should be ok adding to the pool an upvoting transaction for the same delegate from eh same account but with different id',
		);

		describe('after forging one block', () => {
			it.todo('should include the first upvoting transaction to arrive');

			it.todo('should not include the last upvoting transaction to arrive');

			it.todo(
				'should fail adding to the pool an upvoting transaction for the same delegate from the same account',
			);

			it.todo(
				'should be ok adding to the pool a downvoting transaction for the same delegate from the same account',
			);

			it.todo(
				'should be ok adding to the pool a down voting transaction for the same delegate from the same account but with different id',
			);

			describe('after forging a second block', () => {
				it.todo('should include the first downvoting transaction to arrive');

				it.todo('should not include the last downvoting transaction to arrive');

				it.todo(
					'should fail adding to the pool a downvoting transaction for the same delegate from the same account',
				);
			});
		});
	});
});
