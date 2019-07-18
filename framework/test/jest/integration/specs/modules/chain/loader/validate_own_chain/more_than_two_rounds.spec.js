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
	describe('forge 3 rounds (303 blocks) with version = 0', () => {
		it.todo('blockchain should be at height 303');

		it.todo('all blocks should have version = 0');

		// Setting exception to height 50 will cause chain to delete 303 - 50 = 253 blocks
		// which is more than 2 rounds (202 blocks) so system should be stopped with error
		describe('increase block version = 1 and exceptions for height = 50', () => {
			it.todo('should fail with error');
		});
	});
});
