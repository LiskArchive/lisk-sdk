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
	describe('forge first round of blocks (101 blocks) with version 0', () => {
		it.todo('blockchain should be at height 101');

		it.todo('blocks of round 1 should have version = 0');
	});

	describe('forge second round of blocks (101 blocks) with version 1', () => {
		it.todo('blockchain should be at height 202');

		it.todo('blocks of round 2 should have version = 1');
	});

	describe('forge third round of blocks (101 blocks) with version 2', () => {
		it.todo('blockchain should be at height 303');

		it.todo('blocks of round 3 should have version = 2');
	});

	describe('when there are no exceptions for blocks versions', () => {
		it.todo('rebuilding should fail');
	});

	describe('when there are proper exceptions for blocks versions', () => {
		it.todo('rebuilding should succeed');
	});
});
