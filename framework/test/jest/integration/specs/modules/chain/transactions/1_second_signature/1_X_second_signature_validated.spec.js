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

describe('checking validated second signature registrations against other transaction types', () => {
	it.todo('should be ok adding to the pool a second signature registration');

	describe('when after forging one block', () => {
		it.todo('should include the transaction');

		it.todo(
			'should fail adding to the pool a second signature registration for the same account',
		);
	});

	describe('when adding transactions excluding signature, dapp, in_transfer, out_transfer from the same account to the pool', () => {
		it.todo('should fail without second signature');

		it.todo(
			'should fail registering second signature without matching passphrase',
		);

		it.todo('should be ok with correct second signature');
	});
});
