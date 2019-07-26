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

describe('sending transactions on top of unconfirmed second signature', () => {
	describe('when adding to pool second signature registration', () => {
		it.todo('should accept');
	});

	describe('given second signature registration in the pool', () => {
		describe('when type signagure with second signature is added to the pool', () => {
			it.todo('should fail with the same timestamp');
			it.todo('should be ok with different timestamp');
		});

		describe('when types excluding signature, dapp, in_transfer, out_transfer with second signature is added to the pool', () => {
			it.todo('should fail');
		});

		describe('when types excluding signature, dapp, in_transfer, out_transfer without second signature is added to the pool', () => {
			it.todo('should be ok');
		});
	});
});
