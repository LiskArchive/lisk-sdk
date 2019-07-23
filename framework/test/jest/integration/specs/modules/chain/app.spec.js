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

describe('app', () => {
	describe('init', () => {
		it('should init successfully without any error');
	});

	describe('genesis block', () => {
		describe('consistency', () => {
			it('should contain transactions');
		});

		describe('after inserting to database', () => {
			describe('database block at height 1', () => {
				it('should match the genesis block ID');

				it('should contain transactions');

				it(
					'should match the number of transactions present in the genesis block'
				);

				it('should contain all the transactions IDs present in the genesis block');
			});

			describe('mem_accounts table (delegates)', () => {
				it('should be populated');

				it('should match the number of delegates created in genesis block');

				describe('delegates rows', () => {
					it('should have proper fields');

					describe('values', () => {
						it(
							'fields transactionId, username, address, publicKey should match genesis block transactions'
						);

						it(
							'fields vote, blocks_forged_count, blocks_missed_count, isDelegate should be valid'
						);
					});
				});
			});

			describe('mem_accounts table (other accounts)', () => {
				it('should be populated');

				it('should match the number of accounts created in genesis block');

				describe('accounts rows', () => {
					it('should have proper fields');

					describe('values', () => {
						describe('genesis account', () => {
							it('should exist');

							it('should have negative balance');

							it(
								'fields address, balance, publicKey should match genesis block transaction'
							);
						});

						describe('all accounts', () => {
							it('should have valid balances against blockchain balances');
						});
					});
				});
			});
		});
	});

	describe('modules.delegates', () => {
		describe('__private.delegatesList', () => {
			it('should be an array');

			it('should have a length of 101');

			it('should contain public keys of all 101 genesis delegates');

			it('should be equal to one generated with Lisk-Core 0.9.3');
		});

		describe('__private.loadDelegates', () => {
			describe('__private.keypairs', () => {
				it('should not be empty');

				it('should match the delegates length from config file');

				it('should match contained object public key for every property');
			});
		});
	});

	describe('cleanup', () => {
		it('should cleanup sandboxed application successfully');
	});
});
