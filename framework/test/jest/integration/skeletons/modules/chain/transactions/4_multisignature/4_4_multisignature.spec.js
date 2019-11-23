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

describe('integration test (type 4) - double multisignature registrations', () => {
	it.todo('should be ok to add a multisig registration to the pool');

	it.todo(
		'should be ok adding the same transaction with different timestamp to the pool',
	);

	describe('after forging one block', () => {
		it.todo('should include the first transaction to arrive');

		it.todo('should not include the last transaction to arrive');

		it.todo(
			'should fail when adding a multisig registration for the same account to the pool',
		);
	});
});
