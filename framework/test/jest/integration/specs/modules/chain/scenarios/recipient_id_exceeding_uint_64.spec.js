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

describe('exceptions for recipient transactions exceeding uint64', () => {
	describe('send funds to account', () => {
		describe('when forging block with transaction with exceeding uint_64 recipientId', () => {
			describe('details of the accounts', () => {
				it.todo('should add balance to the recipient account');
			});

			describe('transactions table', () => {
				it.todo('should save transaction in the database');
			});

			describe('after deleting block', () => {
				describe('details of the account', () => {
					it.todo('should update balance field of sender account');
				});

				describe('transactions table', () => {
					it.todo('should delete transaction from the database');
				});
			});
		});
	});
});
