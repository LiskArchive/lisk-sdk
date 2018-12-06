/* eslint-disable mocha/no-pending-tests */
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

describe('Storage', () => {
	describe('constructor()', () => {
		it('should accept two parameters');
		it('should assign parameters correctly');
	});

	describe('bootstrap()', () => {
		it('should resolved with status');
		it('should reject in case of connection error');
		it('should change isReady status');
		it(
			'should have initialized following entities Transaction, Block, Account, Delegate'
		);
	});

	describe('cleanup()', () => {
		it('should resolved successfully');
		it('should reject in case of any error on adapter layer');
		it('should change isReady status');
		it('should disconnect the adapter');
	});
});
