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

describe('integration test (type 2) - double delegate registrations', () => {
	describe('executing 30 times', () => {
		describe('with two different accounts using different username', () => {
			it.todo('adding to pool delegate registration should be ok');

			it.todo(
				'adding to pool delegate registration from different account and same username should be ok'
			);

			describe('after forging one block', () => {
				it.todo('both transactions should be included');

				it.todo(
					'adding to pool delegate registration with already registered username should fail'
				);
			});
		});
	});
});
