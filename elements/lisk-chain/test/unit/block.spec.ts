/*
 * Copyright © 2021 Lisk Foundation
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
import { Block, Transaction } from '../../src';
import { createValidDefaultBlock } from '../utils/block';
import { getTransaction } from '../utils/transaction';

describe('block', () => {
	describe('validate', () => {
		let block: Block;
		let tx: Transaction;

		beforeEach(() => {
			tx = getTransaction();
		});

		describe('when previousBlockID is empty', () => {
			it('should throw error', async () => {
				// Arrange
				block = await createValidDefaultBlock({ header: { previousBlockID: Buffer.alloc(0) } });
				// Act & assert
				expect(() => block.validate()).toThrow('Previous block id must not be empty');
			});
		});

		describe('when a transaction included is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				(tx.senderPublicKey as any) = '100';
				tx['_id'] = Buffer.from('123');
				block = await createValidDefaultBlock({ payload: [tx] });
				// Act & assert
				expect(() => block.validate()).toThrow();
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ payload: txs });
				// Act & assert
				expect(() => block.validate()).not.toThrow();
			});
		});
	});
});
