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
import { TransactionList } from '../../src/transaction_list';
import { TransactionPool } from '../../src/transaction_pool';
import { Transaction, Status, TransactionStatus } from '../../src/types';
import { generateRandomPublicKeys } from '../utils/cryptography';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

describe('TransactionPool class', () => {
	let transactionPool: TransactionPool;

	beforeEach(() => {
		jest.useFakeTimers();
		transactionPool = new TransactionPool({
			applyTransactions: jest
				.fn()
				.mockResolvedValue([{ status: Status.OK, errors: [] }]),
			transactionReorganizationInterval: 1,
		});
	});

	describe('constructor', () => {
		describe('when only applyTransaction is given', () => {
			it('should set default values', async () => {
				expect((transactionPool as any)._maxTransactions).toEqual(4096);
				expect((transactionPool as any)._maxTransactionsPerAccount).toEqual(64);
				expect((transactionPool as any)._minEntranceFeePriority).toEqual(
					BigInt(0),
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
					applyTransactions: jest.fn(),
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
			await transactionPool.add(tx);
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
			await transactionPool.add(tx);
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
			senderPublicKeys = generateRandomPublicKeys(3);
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
				{
					id: '10',
					nonce: BigInt(100),
					minFee: BigInt(10),
					fee: BigInt(1000),
					senderPublicKey: senderPublicKeys[2],
				},
			] as Transaction[];

			for (const tx of txs) {
				tx.getBytes = jest.fn().mockReturnValue(Buffer.from(new Array(10)));
				await transactionPool.add(tx);
			}
			(transactionPool as any)._transactionList[
				getAddressFromPublicKey(senderPublicKeys[0])
			].promote([txs[0]]);
			(transactionPool as any)._transactionList[
				getAddressFromPublicKey(senderPublicKeys[1])
			].promote([txs[3]]);
			// Force to make it unprocessable
			transactionPool['_transactionList'][
				getAddressFromPublicKey(senderPublicKeys[2])
			]['_demoteAfter'](BigInt(0));
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

		it('should not include the sender key if processable transactions are empty', async () => {
			const processableTransactions = transactionPool.getProcessableTransactions();
			const transactionFromSender2 =
				processableTransactions[getAddressFromPublicKey(senderPublicKeys[2])];
			expect(transactionFromSender2).toBeUndefined();
		});
	});

	describe('add', () => {
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
			const { status } = await transactionPool.add(tx);
			expect(status).toEqual(Status.OK);
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
			(transactionPool['_applyFunction'] as jest.Mock).mockResolvedValue([
				{
					status: 0,
					errors: [
						{
							dataPath: '.nonce',
							actual: '123',
							expected: '2',
						},
					],
				},
			]);
			const { status } = await transactionPool.add(tx);

			expect(status).toEqual(Status.OK);
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
			const { status: status1 } = await transactionPool.add(tx);
			const { status: status2 } = await transactionPool.add(txDuplicate);
			expect(status1).toEqual(Status.OK);
			expect(status2).toEqual(Status.OK);
			// Check if its not added to the transaction list
			expect(Object.keys(transactionPool['_allTransactions']).length).toEqual(
				1,
			);
		});

		it('should throw when a transaction is invalid', async () => {
			const transactionResponse = [
				{ status: Status.FAIL, errors: [new Error('Invalid nonce sequence')] },
			];
			jest.spyOn(transactionPool, '_getStatus' as any);
			(transactionPool['_applyFunction'] as jest.Mock).mockResolvedValue(
				transactionResponse,
			);
			try {
				await transactionPool.add(tx);
			} catch (error) {
				expect(transactionPool['_getStatus']).toHaveReturnedWith(
					TransactionStatus.INVALID,
				);
				expect(error.message).toContain(
					`transaction id ${tx.id} is an invalid transaction`,
				);
			}
		});

		it('should reject a transaction with lower fee than minEntranceFee', async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
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

			const { status } = await transactionPool.add(lowFeeTrx);
			expect(status).toEqual(Status.FAIL);
		});

		it('should reject a transaction with a lower feePriority than the lowest feePriority present in TxPool', async () => {
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
			});

			let tempApplyTransactionsStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionsStub;

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

				tempApplyTransactionsStub.mockResolvedValue([
					{ status: Status.OK, errors: [] },
				]);

				await transactionPool.add(tempTx);
			}

			expect(transactionPool.getAll().length).toEqual(MAX_TRANSACTIONS);

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

			tempApplyTransactionsStub.mockResolvedValue([
				{ status: Status.OK, errors: [] },
			]);

			const { status } = await transactionPool.add(lowFeePriorityTx);

			expect(status).toEqual(Status.FAIL);
		});
	});

	describe('remove', () => {
		let txGetBytesStub: any;
		const senderPublicKey = generateRandomPublicKeys()[0];
		const tx = {
			id: '1',
			nonce: BigInt(1),
			minFee: BigInt(10),
			fee: BigInt(1000),
			senderPublicKey,
		} as Transaction;
		const additionalTx = {
			id: '2',
			nonce: BigInt(3),
			minFee: BigInt(10),
			fee: BigInt(1000),
			senderPublicKey,
		} as Transaction;

		txGetBytesStub = jest.fn().mockReturnValue(Buffer.from(new Array(10)));
		tx.getBytes = txGetBytesStub;
		additionalTx.getBytes = txGetBytesStub;

		beforeEach(async () => {
			await transactionPool.add(tx);
			await transactionPool.add(additionalTx);
		});

		afterEach(async () => {
			transactionPool.remove(tx);
			transactionPool.remove(additionalTx);
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
			const removeStatus = transactionPool.remove(nonExistentTrx);
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
			const removeStatus = transactionPool.remove(tx);
			expect(removeStatus).toEqual(true);
			expect(transactionPool.getAll().length).toEqual(1);
			expect(
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				].get(tx.nonce),
			).toEqual(undefined);
			expect(
				transactionPool['_feePriorityQueue'].values.includes(tx.id),
			).toEqual(false);
		});

		it('should remove the transaction list key if the list is empty', async () => {
			transactionPool.remove(tx);
			transactionPool.remove(additionalTx);
			expect(
				transactionPool['_transactionList'][
					getAddressFromPublicKey(tx.senderPublicKey)
				],
			).toBeUndefined();
		});
	});

	describe('evictUnprocessable', () => {
		const senderPublicKey = generateRandomPublicKeys()[0];
		const transactions = [
			{
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey,
			} as Transaction,
			{
				id: '3',
				nonce: BigInt(3),
				minFee: BigInt(10),
				fee: BigInt(3000),
				senderPublicKey,
			} as Transaction,
		];
		let txGetBytesStub: any;
		txGetBytesStub = jest.fn();
		transactions[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactions[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest
					.fn()
					.mockResolvedValue([{ status: Status.OK, errors: [] }]),
				transactionReorganizationInterval: 1,
				maxTransactions: 2,
			});
			await transactionPool.add(transactions[0]);
			await transactionPool.add(transactions[1]);
		});

		afterEach(async () => {
			await transactionPool.remove(transactions[0]);
			await transactionPool.remove(transactions[1]);
		});

		it('should evict unprocessable transaction with lowest fee', async () => {
			const isEvicted = (transactionPool as any)._evictUnprocessable();

			expect(isEvicted).toBe(true);
			expect((transactionPool as any)._allTransactions).not.toContain(
				transactions[0],
			);
		});
	});

	describe('evictProcessable', () => {
		const senderPublicKey = generateRandomPublicKeys()[0];
		const transactions = [
			{
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey,
			} as Transaction,
			{
				id: '2',
				nonce: BigInt(2),
				minFee: BigInt(10),
				fee: BigInt(2000),
				senderPublicKey,
			} as Transaction,
		];
		let txGetBytesStub: any;
		txGetBytesStub = jest.fn();
		transactions[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactions[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest
					.fn()
					.mockResolvedValue([{ status: Status.OK, errors: [] }]),
				transactionReorganizationInterval: 1,
				maxTransactions: 2,
			});
			await transactionPool.add(transactions[0]);
			await transactionPool.add(transactions[1]);
		});

		afterEach(async () => {
			await transactionPool.remove(transactions[0]);
			await transactionPool.remove(transactions[1]);
		});

		it('should evict processable transaction with lowest fee', async () => {
			const isEvicted = (transactionPool as any)._evictProcessable();

			expect(isEvicted).toBe(true);
			expect((transactionPool as any)._allTransactions).not.toContain(
				transactions[0],
			);
		});
	});

	describe('reorganize', () => {
		const senderPublicKey = generateRandomPublicKeys()[0];
		const transactions = [
			{
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey,
			} as Transaction,
			{
				id: '2',
				nonce: BigInt(2),
				minFee: BigInt(10),
				fee: BigInt(2000),
				senderPublicKey,
			} as Transaction,
			{
				id: '3',
				nonce: BigInt(3),
				minFee: BigInt(10),
				fee: BigInt(3000),
				senderPublicKey,
			} as Transaction,
		];
		let txGetBytesStub: any;
		txGetBytesStub = jest.fn();
		transactions[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactions[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactions[2].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		let address: string;
		let txList: TransactionList;

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest
					.fn()
					.mockResolvedValue([{ status: Status.OK, errors: [] }]),
				transactionReorganizationInterval: 1,
			});
			(transactionPool as any)._applyFunction.mockResolvedValue([
				{ id: '1', status: Status.OK, errors: [] },
				{ id: '2', status: Status.OK, errors: [] },
				{ id: '3', status: Status.OK, errors: [] },
			]);
			await transactionPool.add(transactions[0]);
			await transactionPool.add(transactions[1]);
			await transactionPool.add(transactions[2]);
			address = Object.keys((transactionPool as any)._transactionList)[0];
			txList = (transactionPool as any)._transactionList[address];
			transactionPool.start();
		});

		afterEach(async () => {
			transactionPool.remove(transactions[0]);
			transactionPool.remove(transactions[1]);
			transactionPool.remove(transactions[2]);
			transactionPool.stop();
		});

		it('should not promote unprocessable transactions to processable transactions', async () => {
			transactionPool.remove(transactions[1]);
			jest.advanceTimersByTime(2);
			const unprocessableTransactions = txList.getUnprocessable();

			expect(unprocessableTransactions).toContain(transactions[2]);
		});

		it('should call apply function with processable transaction', async () => {
			// First transaction is processable
			jest.advanceTimersByTime(2);

			expect(transactionPool['_applyFunction']).toHaveBeenCalledWith(
				transactions,
			);
		});
	});

	describe('expire', () => {
		const senderPublicKey = generateRandomPublicKeys()[0];
		const transactions = [
			{
				id: '1',
				nonce: BigInt(1),
				minFee: BigInt(10),
				fee: BigInt(1000),
				senderPublicKey,
				receivedAt: new Date(0),
			} as Transaction,
			{
				id: '2',
				nonce: BigInt(2),
				minFee: BigInt(10),
				fee: BigInt(2000),
				senderPublicKey,
				receivedAt: new Date(),
			} as Transaction,
			{
				id: '3',
				nonce: BigInt(3),
				minFee: BigInt(10),
				fee: BigInt(3000),
				senderPublicKey,
				receivedAt: new Date(0),
			} as Transaction,
		];

		beforeEach(() => {
			(transactionPool as any)._allTransactions = {
				'1': transactions[0],
				'2': transactions[1],
				'3': transactions[2],
			};
		});

		it('should expire old transactions', async () => {
			(transactionPool as any).remove = jest.fn().mockReturnValue(true);
			(transactionPool as any)._expire();
			expect((transactionPool as any).remove).toHaveBeenCalledWith(
				transactions[0],
			);
			expect((transactionPool as any).remove).toHaveBeenCalledWith(
				transactions[2],
			);
		});
	});
});
