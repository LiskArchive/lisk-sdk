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

describe('integration test (type 1) - second signature transactions from pool and peer', () => {
	describe('with funds inside account', () => {
		beforeEach('send funds to signature account');

		describe('with signature transaction in unconfirmed state', () => {
			describe('when receiving block with same transaction', () => {
				describe('confirmed state', () => {
					it.todo('should update confirmed columns related to signature');
				});

				describe('when receiving block with signature transaction with different id', () => {
					describe('confirmed state', () => {
						it.todo('should update confirmed columns related to signature');
					});
				});

				describe('when receiving block with multiple signature transaction with different id for same account', () => {
					describe('should reject block', () => {
						it.todo('should not save block to the database');
					});

					describe('confirmed state', () => {
						it.todo('should not update confirmed columns related to signature');
					});
				});
			});
		});
	});
});
