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

describe('validateOwnChain', () => {
	describe('given forge 3 rounds (303 blocks) with version = 0', () => {
		it.todo('should have largest height of 303');

		describe('when increase block version = 1 and exceptions for height = 101', () => {
			it.todo('should not present any error during chain validation');

			it.todo('should have a largest height of 101');

			it.todo('should have remaining blocks with version = 0');
		});

		describe('when forge 5 more blocks', () => {
			it.todo('should have a largest height of 106');

			it.todo('should have the last 5 blocks with version = 1');
		});
	});
});
