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
		it.todo('should include all the transactions in the pool');

		it.todo(
			'should remove the transactions from the queue  if the account balance is not enough',
		);

		it.todo('should not confirm an invalid transaction');

		it.todo('should confirm a valid transaction');
	});
});
