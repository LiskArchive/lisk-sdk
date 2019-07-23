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

describe('expire transactions', () => {
	describe('from unconfirmed queue', () => {
		it.todo('should be able to add transaction to unconfirmed queue');

		it.todo(
			'should remove the transaction from the queue once expire transaction interval has passed'
		);
	});

	describe('multi-signature', () => {
		it.todo(
			'should be able to add multi-signature transaction to unconfirmed queue'
		);

		it.todo(
			'once multi-signature transaction is expired it should be removed from queue'
		);

		it.todo('multi-signature account balance should exists with the balance');
	});
});
