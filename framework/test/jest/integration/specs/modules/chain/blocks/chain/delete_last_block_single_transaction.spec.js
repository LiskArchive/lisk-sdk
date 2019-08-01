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

describe('integration test (blocks) - chain/deleteLastBlock', () => {
	describe('deleteLastBlock', () => {
		describe('errors', () => {
			it.todo('should fail when trying to delete genesis block');
		});

		describe('single transaction scenarios: create transaction, forge, delete block, forge again', () => {
			describe('(type 0) transfer funds', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should create a transaction and forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo(
					'should get account data from receipt that is a virgin (not have publicKey assigned)',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should get account data from receipt that has a zero balance');

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);

				it.todo('should get account data from receipt that has a balance');
			});

			describe('(type 1) register second signature', () => {
				it.todo('should validate account data from sender');

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});

			describe('(type 2) register delegate', () => {
				it.todo('should validate account data from sender');

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after delete the last block',
				);

				it.todo('should forge a block with pool transaction');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});

			describe('(type 3) votes', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});

			describe('(type 4) register multisignature', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo('should validate account data from sender');

				it.todo('should forge a block with transaction pool');
			});

			describe.skip('(type 5) register dapp', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});

			describe.skip('(type 6) inTransfer dapp', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});

			describe.skip('(type 7) outTransfer dapp', () => {
				it.todo(
					'should validate account data from sender after account creation',
				);

				it.todo('should forge a block');

				it.todo(
					'should validate account data from sender after forging a block',
				);

				it.todo('should delete last block');

				it.todo(
					'should validate account data from sender after deleting the last block',
				);

				it.todo('should forge a block with transaction pool');

				it.todo(
					'should validate account data from sender after forging a block with transaction pool',
				);
			});
		});
	});
});
