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

describe('integration test (type 1) - double second signature registrations', () => {
	it.todo('adding to pool second signature registration should be ok');

	it.todo(
		'adding to pool same second signature registration with different timestamp should be ok'
	);

	describe('after forging one block', () => {
		it.todo('first transaction to arrive should be included');

		it.todo('last transaction to arrive should not be included');

		it.todo(
			'adding to pool second signature registration for same account should fail'
		);
	});
});
