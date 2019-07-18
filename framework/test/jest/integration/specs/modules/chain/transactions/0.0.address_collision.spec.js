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

describe('integration test (type 0) - address collision', () => {
	it.todo('both passphrases should have the same address');

	describe('when two passphrases collide into the same address', () => {
		it.todo('adding to pool transfer should be ok for passphrase one');

		it.todo('adding to pool transfer should be ok for passphrase two');

		describe('after forging one block', () => {
			it.todo('first transaction to arrive should be included');

			it.todo('last transaction to arrive should not be included');

			it.todo(
				'publicKey from the first passphrase should be cemented and not the second one'
			);
		});
	});
});
