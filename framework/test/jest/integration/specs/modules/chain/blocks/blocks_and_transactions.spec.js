/*
 * Copyright © 2019 Lisk Foundation
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

describe('blocks processing & transactions pool consistency', () => {
	describe('total spending', () => {
		describe('when debit the account first', () => {
			it.todo(
				'should not include transactions which exceed total spending per account balance'
			);
		});

		describe('when we credit the account first', () => {
			it.todo(
				'should not include transactions which exceed total spending per account balance'
			);
		});

		describe('when we try to spend entire balance and transaction fee makes balance to go negative', () => {
			it.todo(
				'should not include transactions which exceed total spending per account balance'
			);
		});

		describe('when we credit the account first, overspend last', () => {
			it.todo(
				'should not include transactions which exceed total spending per account balance'
			);
		});

		describe('when try to spend entire balance in single transaction and transaction fee makes balance go negative', () => {
			it.todo(
				'should not include transactions which exceed total spending per account balance'
			);
		});

		describe('when there is 1 valid tx and 99 invalid', () => {
			it.todo('should forge block with only valid transactions');
		});
	});
});
