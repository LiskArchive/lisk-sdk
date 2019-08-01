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

describe('system test - account store', () => {
	describe('cache', () => {
		it.todo('should fetch account from the database');

		it.todo('should set the cache property for account store');
	});

	describe('get', () => {
		it.todo('should cache the account from after prepare is called');

		it.todo('should throw if account does not exist');
	});

	describe('getOrDefault', () => {
		it.todo('should cache the account from after prepare is called');

		it.todo('should return default account if it does not exist');
	});

	describe('set', () => {
		it.todo('should set the updated values for the account');

		it.todo('should update the updateKeys property');
	});

	describe('finalize', () => {
		it.todo('should save the account state in the database');

		it.todo('should throw an error if mutate option is set to false');
	});
});
