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

describe('integration test (type 5) - dapp registrations with repeated values', () => {
	it.todo('adding to pool dapp transaction 1 should be ok');

	it.todo(
		'adding to pool dapp transaction 2 with same data than 1 but different id should be ok'
	);

	it.todo('adding to pool dapp transaction 3 should be ok');

	it.todo(
		'adding to pool dapp transaction 4 with same name than 3 should be ok'
	);

	it.todo('adding to pool dapp transaction 5 should be ok');

	it.todo(
		'adding to pool dapp transaction 6 with same link than 5 should be ok'
	);

	describe('after forging one block', () => {
		it.todo('first dapp transactions to arrive should be included');

		it.todo('last dapp transactions to arrive should not be included');

		it.todo('adding to pool already registered dapp should fail');

		it.todo('adding to pool already registered dapp name should fail');

		it.todo('adding to pool already registered dapp link should fail');
	});
});
