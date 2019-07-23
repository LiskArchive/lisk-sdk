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

describe('integration test (type 1) - checking validated second signature registrations against other transaction types', () => {
	it.todo('should be ok adding to the pool a second signature registration');

	describe('after forging one block', () => {
		it.todo('should include the transaction');

		it.todo(
			'should fail adding to the pool a second signature registration for the same account'
		);

		describe('adding to pool other transaction types from the same account', () => {
			describe('transactions excluding signature, dapp, in_transfer, out_transfer', () => {
				it.todo('should fail without second signature');
				it.todo(
					'should fail registering second signature without matching passphrase'
				);
				it.todo('should be ok with correct second signature');
			});
		});
	});
});
