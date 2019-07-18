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

		describe('after insert to database', () => {
			describe('database block at height 1', () => {
				it('ID should match genesis block ID');

				it('should contain transactions');

				it(
					'number of transactions should match genesis number of transactions in block'
				);

				it('all transactions IDs should be present in genesis block');
			});

			describe('mem_accounts (delegates)', () => {
				it('should be populated');

				it('count should match delegates created in genesis block');

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

			describe('mem_accounts (other accounts)', () => {
				it('should be populated');

				it('count should match accounts created in genesis block');

				describe('accounts rows', () => {
					it('should have proper fields');

					describe('values', () => {
						describe('genesis account', () => {
							it('should exists');

							it('balance should be negative');

							it(
								'fields address, balance, publicKey should match genesis block transaction'
							);
						});

						describe('all accounts', () => {
							it('balances should be valid against blockchain balances');
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

				it('length should match delegates length from config file');

				it('every keypairs property should match contained object public key');
			});
		});
	});

	describe('cleanup', () => {
		it('should cleanup sandboxed application successfully');
	});
});
