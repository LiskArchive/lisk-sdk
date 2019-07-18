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

describe('integration test (type 1) - sending transactions on top of unconfirmed second signature', () => {
	it.todo('adding to pool second signature registration should be ok');

	describe('validating unconfirmed status while adding to pool other transaction types from same account', () => {
		describe('with second signature', () => {
			describe('type "signature"', () => {
				it.todo('should fail');
				it.todo('should be ok with different timestamp');
			});

			describe('other types excluding dapp, in_transfer, out_transfer', () => {
				it.todo('should fail');
			});
		});

		describe('without second signature', () => {
			describe('types excluding signature, dapp, in_transfer, out_transfer', () => {
				it.todo('should be ok');
			});
		});
	});
});
