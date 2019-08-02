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

describe('validateOwnChain', () => {
	describe('given forge 101 blocks with version = 0', () => {
		it.todo('should have largest height of 101');

		it.todo('should have all blocks with version = 0');

		describe('when increase block version = 1 and exceptions for height = 5', () => {
			it.todo('should there be no error during chain validation');

			it.todo('should be at height 5 now');
		});

		describe('when forge 5 more blocks', () => {
			it.todo('largest height should be 10');

			it.todo('should have the first five blocks with version = 0');

			it.todo('should have the last five blocks with version = 1');
		});
	});
});
