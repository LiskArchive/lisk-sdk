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

describe('app', () => {
	describe('init', () => {
		it.todo('should init successfully without any error');
	});

	describe('genesis block', () => {
		describe('consistency', () => {
			it.todo('should contain transactions');
		});

		describe('after inserting to database', () => {
			describe('database block at height 1', () => {
				it.todo('should match the genesis block ID');

				it.todo('should contain transactions');

				it.todo(
					'should match the number of transactions present in the genesis block',
				);

				it.todo(
					'should contain all the transactions IDs present in the genesis block',
				);
			});

			describe('mem_accounts table (delegates)', () => {
				it.todo('should be populated');

				it.todo(
					'should match the number of delegates created in genesis block',
				);

				describe('delegates rows', () => {
					it.todo('should have proper fields');

					describe('values', () => {
						it.todo(
							'fields transactionId, username, address, publicKey should match genesis block transactions',
						);

						it.todo(
							'fields vote, blocks_forged_count, blocks_missed_count, isDelegate should be valid',
						);
					});
				});
			});

			describe('mem_accounts table (other accounts)', () => {
				it.todo('should be populated');

				it.todo('should match the number of accounts created in genesis block');

				describe('accounts rows', () => {
					it.todo('should have proper fields');

					describe('values', () => {
						describe('genesis account', () => {
							it.todo('should exist');

							it.todo('should have negative balance');

							it.todo(
								'fields address, balance, publicKey should match genesis block transaction',
							);
						});

						describe('all accounts', () => {
							it.todo('should have valid balances against blockchain balances');
						});
					});
				});
			});
		});
	});

	describe('modules.delegates', () => {
		describe('__private.delegatesList', () => {
			it.todo('should be an array');

			it.todo('should have a length of 101');

			it.todo('should contain public keys of all 101 genesis delegates');

			it.todo('should be equal to one generated with Lisk-Core 0.9.3');
		});

		describe('__private.loadDelegates', () => {
			describe('__private.keypairs', () => {
				it.todo('should not be empty');

				it.todo('should match the delegates length from config file');

				it.todo('should match contained object public key for every property');
			});
		});
	});

	describe('cleanup', () => {
		it.todo('should cleanup sandboxed application successfully');
	});
});
