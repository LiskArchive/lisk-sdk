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
		it.todo('adding to pool upvoting transaction should be ok');

		it.todo(
			'adding to pool upvoting transaction for same delegate from same account with different id should be ok'
		);

		describe('after forging one block', () => {
			it.todo('first upvoting transaction to arrive should be included');

			it.todo('last upvoting transaction to arrive should not be included');

			it.todo(
				'adding to pool upvoting transaction to same delegate from same account should fail'
			);

			it.todo(
				'adding to pool downvoting transaction to same delegate from same account should be ok'
			);

			it.todo(
				'adding to pool downvoting transaction to same delegate from same account with different id should be ok'
			);

			describe('after forging a second block', () => {
				it.todo('first downvoting transaction to arrive should be included');

				it.todo('last downvoting transaction to arrive should not be included');

				it.todo(
					'adding to pool downvoting transaction to same delegate from same account should fail'
				);
			});
		});
	});
});
