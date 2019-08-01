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

describe('block_version', () => {
	describe('when forge first round of blocks (101 blocks) with version 0', () => {
		it.todo('should have latest height of 101');

		it.todo('should have blocks with version = 0 on round 1');
	});

	describe('when forge second round of blocks (101 blocks) with version 1', () => {
		it.todo('should have latest height of 202');

		it.todo('should have blocks with version = 1 on round 2');
	});

	describe('when forge third round of blocks (101 blocks) with version 2', () => {
		it.todo('should have latest height of 303');

		it.todo('should have blocks with version = 2 on round 3');
	});

	describe('when when there are no exceptions for blocks versions', () => {
		it.todo('should fail when rebuilding');
	});

	describe('when there are proper exceptions for blocks versions', () => {
		it.todo('should rebuild successfully');
	});
});
