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
	describe('forge 101 blocks with version = 0', () => {
		it.todo('blockchain should be at height 101');

		it.todo('all blocks should have version = 0');

		describe('increase block version = 1 and exceptions for height = 5', () => {
			it.todo('there should be no error during chain validation');

			it.todo('should be at height 5 now');

			describe('forge 5 more blocks', () => {
				it.todo('blockchain should be at height 10');

				it.todo('first 5 blocks should have version = 0');

				it.todo('last 5 blocks should have version = 1');
			});
		});
	});
});
