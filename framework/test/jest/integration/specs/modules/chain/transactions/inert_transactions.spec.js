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

describe('inert transactions', () => {
	describe('send funds to account', () => {
		describe('getting account before inert transaction', () => {
			describe('when forging block with inert type 0 transaction', () => {
				describe('details of the accounts', () => {
					it.todo('should not update balance field of sender account');

					it.todo('should not update balance field of recipient account');
				});

				describe('transactions table', () => {
					it.todo('should save transaction in the database');
				});

				describe('after deleting block', () => {
					describe('details of the account', () => {
						it.todo('should not update balance field of sender account');

						it.todo('should not update balance field of recipient account');
					});

					describe('transactions table', () => {
						it.todo('should delete transaction from the database');
					});
				});
			});

			describe('when forging block with inert type 2 transaction', () => {
				describe('details of the accounts', () => {
					it.todo('should not update u_balance field of recipient account');

					it.todo('should not update balance field of recipient account');

					it.todo('should not have username property set');

					it.todo('should have isDelegate set to false');
				});

				describe('transactions table', () => {
					it.todo('should save transaction in the database');
				});

				describe('after deleting block', () => {
					describe('details of the accounts', () => {
						it.todo('should not update u_balance field of recipient account');

						it.todo('should not update balance field of recipient account');

						it.todo('should not have username property set');

						it.todo('should have isDelegate set to false');
					});

					describe('transactions table', () => {
						it.todo('should delete transaction from the database');
					});
				});
			});

			describe('when forging block with inert type 3 transaction', () => {
				describe('details of the accounts', () => {
					it.todo('should not update balance field of recipient account');

					it.todo('should not update delegates array for account');
				});

				describe('transactions table', () => {
					it.todo('should save transaction in the database');
				});

				describe('after deleting block', () => {
					describe('details of the accounts', () => {
						it.todo('should not update u_balance field of recipient account');

						it.todo('should not update balance field of recipient account');

						it.todo('should not update delegates array for account');
					});

					describe('transactions table', () => {
						it.todo('should delete transaction from the database');
					});
				});
			});
		});
	});
});
