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
	it.todo('should be ok adding a dap transaction 1 to the pool');

	it.todo(
		'should be ok adding to the pool a dap transaction 2 with the same data than 1 but different id',
	);

	it.todo('should be ok to add a dap transaction 3 to the pool');

	it.todo(
		'should be ok to add a dap transaction 4 with the same name as 3 to the pool',
	);

	it.todo('should be ok to add a dapp transaction 5 to the pool');

	it.todo(
		'should be ok to add a dapp transaction 6 with the same link than 5 to the pool',
	);

	describe('after forging one block', () => {
		it.todo('should include first dapp transactions to arrive in the block');

		it.todo(
			'should not include in the block the last dapp transactions to arrive',
		);

		it.todo('should fail when adding an already registered dapp to the pool');

		it.todo(
			'should fail when trying to add an already registered dapp name to the pool',
		);

		it.todo(
			'should fail when adding an already registered dapp link to the pool',
		);
	});
});
