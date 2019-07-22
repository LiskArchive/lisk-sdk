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

describe('integration test (blocks) - process', () => {
	describe('loadBlocksWithOffset() - no errors', () => {
		it.todo('should load block 2 from db: block without transactions');

		it.todo('should load block 3 from db: block with transactions');
	});

	describe('loadBlocksOffset() - block/transaction errors', () => {
		it.todo('should load block 4 from db and return blockSignature error');
		it.todo('should load block 5 from db and return payloadHash error');
		it.todo('should load block 6 from db and return block timestamp error');
		it.todo(
			'should load block 7 from db and return unknown transaction type error'
		);
		it.todo('should load block 8 from db and return block version error');
		it.todo(
			'should load block 9 from db and return previousBlock error (fork:1)'
		);

		it.todo('should load block 10 from db and return duplicated votes error');
	});
});
