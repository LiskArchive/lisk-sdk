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

describe('integration test (type 4) - checking registered multisignature transaction against other transaction types', () => {
	it.todo('adding to pool multisignature registration should be ok');

	describe('after forging one block', () => {
		it.todo('should include the transaction');

		it.todo(
			'should fail when adding a multisig registration for the same account to the pool',
		);

		describe('adding to pool other transaction types from the same account', () => {
			describe('mulisignature transactions', () => {
				it.todo('should be ok');
			});
		});
	});
});
