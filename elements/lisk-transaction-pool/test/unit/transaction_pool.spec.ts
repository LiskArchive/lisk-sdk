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
import { Transaction, Status, TransactionStatus } from '../../src/types';
import { generateRandomPublicKeys } from '../utils/cryptography';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

describe('TransactionList class', () => {
	let applyTransactionStub = jest.fn();

	const defaultTxPoolConfig: TransactionPoolConfig = {
		applyTransaction: applyTransactionStub,
	};

	let transactionPool: TransactionPool;

	beforeEach(() => {
		transactionPool = new TransactionPool(defaultTxPoolConfig);
		(transactionPool as any)._applyFunction = applyTransactionStub;
		applyTransactionStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);
	});

	describe('constructor', () => {
		describe('when only applyTransaction is given', () => {
			it('should set default values', async () => {
				expect((transactionPool as any)._maxTransactions).toEqual(4096);
				expect((transactionPool as any)._maxTransactionsPerAccount).toEqual(64);
				expect((transactionPool as any)._minEntranceFeePriority).toEqual(
					BigInt(1),
				);
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
					minEntranceFeePriority: BigInt(10),
					transactionExpiryTime: 60 * 60 * 1000, // 1 hours in ms
				});

				expect((transactionPool as any)._maxTransactions).toEqual(2048);
				expect((transactionPool as any)._maxTransactionsPerAccount).toEqual(32);
				expect((transactionPool as any)._minEntranceFeePriority).toEqual(
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

	describe('get', () => {
		let txGetBytesStub: jest.Mock;
		let tx: Transaction;

		beforeEach(async () => {
			tx = {
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			txGetBytesStub = jest.fn();
			tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
			await transactionPool.addTransaction(tx);
		});

		it('should return transaction if exist', async () => {
			expect(transactionPool.get('1')).toEqual(tx);
		});

		it('should return undefined if it does not exist', async () => {
			expect(transactionPool.get('2')).toBeUndefined();
		});
	});

	describe('contains', () => {
		let txGetBytesStub: jest.Mock;
		let tx: Transaction;

		beforeEach(async () => {
			tx = {
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			txGetBytesStub = jest.fn();
			tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
			await transactionPool.addTransaction(tx);
		});

		it('should return transaction if exist', async () => {
			expect(transactionPool.contains('1')).toBe(true);
		});

		it('should return undefined if it does not exist', async () => {
			expect(transactionPool.contains('2')).toBe(false);
		});
	});

	describe('getProcessableTransactions', () => {
		let senderPublicKeys: string[];
		beforeEach(async () => {
			senderPublicKeys = generateRandomPublicKeys(2);
			const txs = [
				{
					id: '1',
					nonce: BigInt(1),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: '2',
					nonce: BigInt(2),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: '9',
					nonce: BigInt(9),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: '3',
					nonce: BigInt(1),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: senderPublicKeys[1],
				},
			] as Transaction[];

			for (const tx of txs) {
				tx.getBytes = jest.fn().mockReturnValue(Buffer.from(new Array(10)));
				await transactionPool.addTransaction(tx);
			}
			(transactionPool as any)._transactionList[
				getAddressFromPublicKey(senderPublicKeys[0])
			].promote([txs[0]]);
			(transactionPool as any)._transactionList[
				getAddressFromPublicKey(senderPublicKeys[1])
			].promote([txs[3]]);
		});

		it('should return copy of processable transactions list', async () => {
			const processableTransactions = transactionPool.getProcessableTransactions();
			const transactionFromSender0 =
				processableTransactions[getAddressFromPublicKey(senderPublicKeys[0])];
			const transactionFromSender1 =
				processableTransactions[getAddressFromPublicKey(senderPublicKeys[1])];

			expect(transactionFromSender0).toHaveLength(1);
			expect(transactionFromSender0[0].nonce.toString()).toEqual('1');
			expect(transactionFromSender1).toHaveLength(1);
			expect(transactionFromSender1[0].nonce.toString()).toEqual('1');
			// Check if it is a copy
			delete (processableTransactions as any)[
				getAddressFromPublicKey(senderPublicKeys[0])
			];
			(processableTransactions as any)[
				getAddressFromPublicKey(senderPublicKeys[1])
			][0] = 'random thing';

			expect(
				(transactionPool as any)._transactionList[
					getAddressFromPublicKey(senderPublicKeys[0])
				],
			).not.toBeUndefined();
			expect(
				transactionPool.getProcessableTransactions()[
					getAddressFromPublicKey(senderPublicKeys[1])
				],
			).toHaveLength(1);
		});
	});

	describe('addTransaction', () => {
		let txGetBytesStub: any;
		const tx = {
			id: '1',
			nonce: BigInt(1),
			minFee: BigInt(10),
			fee: BigInt(1000),
			senderPublicKey: generateRandomPublicKeys()[0],
		} as Transaction;

		txGetBytesStub = jest.fn();
		tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));

		it('should add a valid transaction and is added to the transaction list as processable', async () => {
			const status = await transactionPool.addTransaction(tx);
			expect(status).toEqual(true);
			expect(Object.keys(transactionPool['_allTransactions'])).toContain('1');

			const originalTrxObj =
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(BigInt(1)) || {};

			expect(originalTrxObj).toEqual(tx);
			const trxSenderAddressList =
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				];
			expect(trxSenderAddressList.getProcessable()).toContain(originalTrxObj);
		});

		it('should add a valid transaction and is added to the transaction list as unprocessable', async () => {
			const getStatusStub = jest.fn();
			transactionPool['_getStatus'] = getStatusStub;
			getStatusStub.mockReturnValue(TransactionStatus.UNPROCESSABLE);
			const status = await transactionPool.addTransaction(tx);

			expect(status).toEqual(true);
			expect(Object.keys(transactionPool['_allTransactions'])).toContain('1');

			const originalTrxObj =
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(BigInt(1)) || {};

			expect(originalTrxObj).toEqual(tx);
			const trxSenderAddressList =
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				];
			expect(trxSenderAddressList.getUnprocessable()).toContain(originalTrxObj);
		});

		it('should reject a duplicate transaction', async () => {
			const txDuplicate = { ...tx };
			const status1 = await transactionPool.addTransaction(tx);
			const status2 = await transactionPool.addTransaction(txDuplicate);
			expect(status1).toEqual(true);
			expect(status2).toEqual(false);
			// Check if its not added to the transaction list
			expect(Object.keys(transactionPool['_allTransactions']).length).toEqual(
				1,
			);
		});

		it('should throw when a transaction is invalid', async () => {
			const transactionResponse = [
				{ status: Status.FAIL, errors: [new Error('Invalid nonce sequence')] },
			];
			const getStatusStub = jest.fn();
			transactionPool['_getStatus'] = getStatusStub;
			applyTransactionStub.mockResolvedValue(transactionResponse);
			try {
				await transactionPool.addTransaction(tx);
			} catch (error) {
				expect(getStatusStub).toHaveReturnedWith(TransactionStatus.INVALID);
				expect(error.message).toContain(
					`transaction id ${tx.id} is an invalid transaction`,
				);
			}
		});

		it('should reject a transaction with lower fee than minEntranceFee', async () => {
			transactionPool = new TransactionPool({
				applyTransaction: jest.fn(),
				minEntranceFeePriority: BigInt(10),
			});

			const lowFeeTrx = {
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(100),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			let tempTxGetBytesStub = jest.fn();
			lowFeeTrx.getBytes = tempTxGetBytesStub.mockReturnValue(
				Buffer.from(new Array(10)),
			);

			const status = await transactionPool.addTransaction(lowFeeTrx);
			expect(status).toEqual(false);
		});

		it('should reject a transaction with a lower feePriority than the lowest feePriority present in TxPool', async () => {
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransaction: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
			});

			let tempApplyTransactionStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionStub;

			txGetBytesStub = jest.fn();
			for (let i = 0; i < MAX_TRANSACTIONS; i++) {
				const tempTx = {
					id: `${i}`,
					nonce: BigInt(1),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: generateRandomPublicKeys()[0],
				} as Transaction;
				tempTx.getBytes = txGetBytesStub.mockReturnValue(
					Buffer.from(new Array(MAX_TRANSACTIONS + i)),
				);

				tempApplyTransactionStub.mockResolvedValue([
					{ status: Status.OK, errors: [] },
				]);

				await transactionPool.addTransaction(tempTx);
			}

			expect(transactionPool.getAllTransactions().length).toEqual(10);

			const lowFeePriorityTx = {
				id: '11',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			lowFeePriorityTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(2 * MAX_TRANSACTIONS)),
			);

			tempApplyTransactionStub.mockResolvedValue([
				{ status: Status.OK, errors: [] },
			]);

			const status = await transactionPool.addTransaction(lowFeePriorityTx);

			expect(status).toEqual(false);
		});
	});

	describe('removeTransaction', () => {
		let txGetBytesStub: any;
		const tx = {
			id: '1',
			nonce: BigInt(1),
			minFee: BigInt(10),
			fee: BigInt(1000),
			senderPublicKey: generateRandomPublicKeys()[0],
		} as Transaction;

		txGetBytesStub = jest.fn();
		tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));

		beforeEach(async () => {
			await transactionPool.addTransaction(tx);
		});

		afterEach(async () => {
			await transactionPool.removeTransaction(tx);
		});

		it('should return false when a tx id does not exist', async () => {
			expect(
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(tx.nonce),
			).toEqual(tx);
			expect(transactionPool['_feePriorityQueue'].values).toContain(tx.id);

			// Remove a transaction that does not exist
			const nonExistentTrx = {
				id: '155',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;
			const removeStatus = transactionPool.removeTransaction(nonExistentTrx);
			expect(removeStatus).toEqual(false);
		});

		it('should remove the transaction from _allTransactions, _transactionList and _feePriorityQueue', async () => {
			expect(
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(tx.nonce),
			).toEqual(tx);
			expect(transactionPool['_feePriorityQueue'].values).toContain(tx.id);

			// Remove the above transaction
			const removeStatus = transactionPool.removeTransaction(tx);
			expect(removeStatus).toEqual(true);
			expect(transactionPool.getAllTransactions().length).toEqual(0);
			expect(
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(tx.nonce),
			).toEqual(undefined);
			expect(
				transactionPool['_feePriorityQueue'].values.includes(tx.id),
			).toEqual(false);
		});
	});
});
