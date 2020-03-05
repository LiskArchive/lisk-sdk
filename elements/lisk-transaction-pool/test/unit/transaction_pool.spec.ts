/*
 * Copyright © 2020 Lisk Foundation
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
 *
 */
import {
	TransactionPool,
	TransactionPoolConfig,
} from '../../src/transaction_pool';
import { Transaction, Status } from '../../src/types';
import { generateRandomPublicKeys } from '../utils/cryptography';

describe.only('TransactionList class', () => {
	let applyTransactionStub = jest.fn();

	const defaultTxPoolConfig: TransactionPoolConfig = {
		applyTransaction: applyTransactionStub,
	};

	let transactionPool: TransactionPool;

	beforeEach(() => {
		transactionPool = new TransactionPool(defaultTxPoolConfig);
		applyTransactionStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);
	});

	describe('constructor', () => {
		describe('when only applyTransaction is given', () => {
			it('should set default values', async () => {
				expect((transactionPool as any)._maxTransactions).toEqual(4096);
				expect((transactionPool as any)._maxTransactionsPerAccount).toEqual(64);
				expect((transactionPool as any)._minimumEntranceFee).toEqual(BigInt(1));
				expect((transactionPool as any)._minReplacementFeeDifference).toEqual(
					BigInt(10),
				);
				expect((transactionPool as any)._transactionExpiryTime).toEqual(
					3 * 60 * 60 * 1000,
				);
			});
		});

		describe('when all the config properties are given', () => {
			it('should set the value to given option values', async () => {
				transactionPool = new TransactionPool({
					applyTransaction: jest.fn(),
					maxTransactions: 2048,
					maxTransactionsPerAccount: 32,
					minReplacementFeeDifference: BigInt(100),
					minimumEntranceFee: BigInt(10),
					transactionExpiryTime: 60 * 60 * 1000, // 1 hours in ms
				});

				expect((transactionPool as any)._maxTransactions).toEqual(2048);
				expect((transactionPool as any)._maxTransactionsPerAccount).toEqual(32);
				expect((transactionPool as any)._minimumEntranceFee).toEqual(
					BigInt(10),
				);
				expect((transactionPool as any)._minReplacementFeeDifference).toEqual(
					BigInt(100),
				);
				expect((transactionPool as any)._transactionExpiryTime).toEqual(
					60 * 60 * 1000,
				);
			});
		});
	});

	describe('addTransaction', () => {
		const tx = {
			id: '1',
			nonce: BigInt(1),
			fee: BigInt(1000),
			senderPublicKey: generateRandomPublicKeys()[0],
		} as Transaction;

		it('should add a valid trx', async () => {
			const status = await transactionPool.addTransaction(tx);
			expect(status).toEqual(true);
		});

		it('should reject a duplicate trx', async () => {
			const txDuplicate = { ...tx };
			const status1 = await transactionPool.addTransaction(tx);
			const status2 = await transactionPool.addTransaction(txDuplicate);
			expect(status1).toEqual(true);
			expect(status2).toEqual(false);
		});
	});
});
