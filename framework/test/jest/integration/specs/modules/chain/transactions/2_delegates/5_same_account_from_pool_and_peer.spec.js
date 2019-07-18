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

describe('delegate', () => {
	describe('with funds inside account', () => {
		beforeEach('send funds to delegate account');

		describe('with delegate transaction in unconfirmed state', () => {
			describe('when receiving block with same transaction', () => {
				describe('confirmed state', () => {
					it.todo('should update confirmed columns related to delegate');
				});
			});

			describe('when receiving block with delegate transaction with different id', () => {
				describe('confirmed state', () => {
					it.todo('should update confirmed columns related to delegate');
				});
			});
		});
	});
});
