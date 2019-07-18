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

		describe('increase block version = 1 and exceptions for height = 101', () => {
			it.todo('there should be no error during chain validation');

			it.todo('blockchain should be at height 101');

			it.todo('remaining blocks have version = 0');

			describe('forge 5 more blocks', () => {
				it.todo('blockchain should be at height 106');

				it.todo('last 5 blocks should have version = 1');
			});
		});
	});
});
