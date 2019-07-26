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

describe('address collision with type 0', () => {
	// This should be unit test
	it.todo('should generate the same address for both passphrases');

	describe('when two passphrases collide into the same address', () => {
		it.todo('should be ok to add transfer to the pool for passphrase one');

		it.todo('should be ok to add transfer to the pool for passphrase two');
	});

	describe('when after forging one block', () => {
		it.todo('should include the first transaction to arrive');

		it.todo('should not include the last transaction to arrive');

		it.todo(
			'should cement the public key from the first passphrase and not the second one'
		);
	});
});
