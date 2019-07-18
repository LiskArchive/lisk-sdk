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

describe('integration test (type 4) - effect of multisignature registration on memory tables', () => {
	describe('forge block with multisignature transaction', () => {
		beforeEach('forge block with multisignature transaction');

		describe('check sender db rows', () => {
			it.todo('should include rows in mem_accounts2multisignatures');

			it.todo('should set multimin field set on mem_accounts');

			describe('check sender account', () => {
				it.todo('should have multisignatures field set on account');

				it.todo('should have multimin field set on account');

				it.todo('should have multilifetime field set on account');
			});

			describe('after deleting block', () => {
				beforeEach('delete last block');

				describe('sender db rows', () => {
					it.todo('should have no rows in mem_accounts2multisignatures');

					it.todo('should have multimin field set to 0 on mem_accounts');

					it.todo('should have multilifetime field set to 0 on mem_accounts');
				});

				describe('sender account', () => {
					it.todo('should set multisignatures field to null on account');

					it.todo('should set multimin field to 0 on account');

					it.todo('should set multilifetime field to 0 on account');
				});
			});
		});
	});
});
