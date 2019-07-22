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

describe('integration test (blocks) - chain/popLastBlock', () => {
	describe('popLastBlock', () => {
		describe('when popLastBlock fails', () => {
			describe('when loadBlockSecondLastBlockStep fails', () => {
				it.todo('should fail with proper error');
			});

			describe('when backwardTickStep fails', () => {
				it.todo('should fail with proper error message');

				it.todo('modules.rounds.backwardTick stub should be called once');

				it.todo('should not change balance in mem_accounts table');
			});

			describe('when deleteBlockStep fails', () => {
				it.todo('should fail with proper error message');

				it.todo('modules.blocks.chain.deleteBlock should be called once');

				it.todo('should not change balance in mem_accounts table');

				it.todo('should not perform backwardTick');
			});
		});

		describe('when deleteLastBlock succeeds', () => {
			it.todo('should not return an error');

			it.todo('should delete block');

			it.todo('should delete all transactions of block');

			it.todo('should revert balance for accounts in block');

			it.todo('should perform backwardTick');
		});
	});
});
