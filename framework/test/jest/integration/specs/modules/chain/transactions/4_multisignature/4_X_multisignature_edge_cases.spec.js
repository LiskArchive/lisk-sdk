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

describe('integration test - multi signature edge cases', () => {
	describe('try to register more dapps than balance will allow from a multisignature account', () => {
		it.todo('all transactions should have been added to the pool');

		it.todo(
			'once account balance is not enough transactions should be removed from the queue'
		);

		it.todo('invalid transaction should not be confirmed');

		it.todo('valid transactions should be confirmed');
	});
});
