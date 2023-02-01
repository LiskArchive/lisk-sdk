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
import { when } from 'jest-when';
import { address as cryptoAddress, utils } from '@liskhq/lisk-cryptography';
import { TransactionList } from '../../src/transaction_list';
import { TransactionPool } from '../../src/transaction_pool';
import { Transaction, Status, TransactionStatus } from '../../src/types';
import { generateRandomPublicKeys } from '../utils/cryptography';

describe('TransactionPool class', () => {
	let transactionPool: TransactionPool;

	beforeEach(() => {
		jest.useFakeTimers();
		transactionPool = new TransactionPool({
			applyTransactions: jest.fn(),
			transactionReorganizationInterval: 1,
			maxPayloadLength: 15360,
		});
		jest.spyOn(transactionPool.events, 'emit');
	});

	describe('constructor', () => {
		describe('when only applyTransaction is given', () => {
			it('should set default values', () => {
				expect((transactionPool as any)._maxTransactions).toBe(4096);
				expect((transactionPool as any)._maxTransactionsPerAccount).toBe(64);
				expect((transactionPool as any)._minEntranceFeePriority).toEqual(BigInt(0));
				expect((transactionPool as any)._minReplacementFeeDifference).toEqual(BigInt(10));
				expect((transactionPool as any)._transactionExpiryTime).toEqual(3 * 60 * 60 * 1000);
			});
		});

		describe('when all the config properties are given', () => {
			it('should set the value to given option values', () => {
				transactionPool = new TransactionPool({
					applyTransactions: jest.fn(),
					maxTransactions: 2048,
					maxTransactionsPerAccount: 32,
					minReplacementFeeDifference: BigInt(100),
					minEntranceFeePriority: BigInt(10),
					transactionExpiryTime: 60 * 60 * 1000, // 1 hours in ms
					maxPayloadLength: 15360,
				});

				expect((transactionPool as any)._maxTransactions).toBe(2048);
				expect((transactionPool as any)._maxTransactionsPerAccount).toBe(32);
				expect((transactionPool as any)._minEntranceFeePriority).toEqual(BigInt(10));
				expect((transactionPool as any)._minReplacementFeeDifference).toEqual(BigInt(100));
				expect((transactionPool as any)._transactionExpiryTime).toEqual(60 * 60 * 1000);
			});
		});
	});

	describe('get', () => {
		let txGetBytesStub: jest.Mock;
		let tx: Transaction;

		beforeEach(async () => {
			tx = {
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			txGetBytesStub = jest.fn();
			tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
			await transactionPool.add(tx);
		});

		it('should return transaction if exist', () => {
			expect(transactionPool.get(Buffer.from('1'))).toEqual(tx);
		});

		it('should return undefined if it does not exist', () => {
			expect(transactionPool.get(Buffer.from('2'))).toBeUndefined();
		});
	});

	describe('contains', () => {
		let txGetBytesStub: jest.Mock;
		let tx: Transaction;

		beforeEach(async () => {
			tx = {
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			txGetBytesStub = jest.fn();
			tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
			await transactionPool.add(tx);
		});

		it('should return transaction if exist', () => {
			expect(transactionPool.contains(Buffer.from('1'))).toBe(true);
		});

		it('should return undefined if it does not exist', () => {
			expect(transactionPool.contains(Buffer.from('2'))).toBe(false);
		});
	});

	describe('getProcessableTransactions', () => {
		let senderPublicKeys: Buffer[];
		beforeEach(async () => {
			senderPublicKeys = generateRandomPublicKeys(3);
			const txs = [
				{
					id: Buffer.from('1'),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: Buffer.from('2'),
					nonce: BigInt(2),
					fee: BigInt(30000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: Buffer.from('9'),
					nonce: BigInt(9),
					minFee: BigInt(10),
					fee: BigInt(30000),
					senderPublicKey: senderPublicKeys[0],
				},
				{
					id: Buffer.from('3'),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: senderPublicKeys[1],
				},
				{
					id: Buffer.from('10'),
					nonce: BigInt(100),
					fee: BigInt(30000),
					senderPublicKey: senderPublicKeys[2],
				},
			] as Transaction[];

			for (const tx of txs) {
				tx.getBytes = jest.fn().mockReturnValue(Buffer.from(new Array(10)));
				await transactionPool.add(tx);
			}
			(transactionPool as any)._transactionList
				.get(cryptoAddress.getAddressFromPublicKey(senderPublicKeys[0]))
				.promote([txs[0]]);
			(transactionPool as any)._transactionList
				.get(cryptoAddress.getAddressFromPublicKey(senderPublicKeys[1]))
				.promote([txs[3]]);
			// Force to make it unprocessable
			(
				transactionPool['_transactionList'].get(
					cryptoAddress.getAddressFromPublicKey(senderPublicKeys[2]),
				) as TransactionList
			)['_demoteAfter'](BigInt(0));
		});

		it('should return copy of processable transactions list', () => {
			const processableTransactions = transactionPool.getProcessableTransactions();
			const transactionFromSender0 = processableTransactions.get(
				cryptoAddress.getAddressFromPublicKey(senderPublicKeys[0]),
			);
			const transactionFromSender1 = processableTransactions.get(
				cryptoAddress.getAddressFromPublicKey(senderPublicKeys[1]),
			);

			expect(transactionFromSender0).toHaveLength(1);
			expect((transactionFromSender0 as Transaction[])[0].nonce.toString()).toBe('1');
			expect(transactionFromSender1).toHaveLength(1);
			expect((transactionFromSender1 as Transaction[])[0].nonce.toString()).toBe('1');
			// Check if it is a copy
			processableTransactions.delete(cryptoAddress.getAddressFromPublicKey(senderPublicKeys[0]));
			(processableTransactions as any).get(
				cryptoAddress.getAddressFromPublicKey(senderPublicKeys[1]),
			)[0] = 'random thing';

			expect(
				(transactionPool as any)._transactionList.get(
					cryptoAddress.getAddressFromPublicKey(senderPublicKeys[0]),
				),
			).toBeDefined();
			expect(
				transactionPool
					.getProcessableTransactions()
					.get(cryptoAddress.getAddressFromPublicKey(senderPublicKeys[1])),
			).toHaveLength(1);
		});

		it('should not include the sender key if processable transactions are empty', () => {
			const processableTransactions = transactionPool.getProcessableTransactions();
			const transactionFromSender2 = processableTransactions.get(
				cryptoAddress.getAddressFromPublicKey(senderPublicKeys[2]),
			);
			expect(transactionFromSender2).toBeUndefined();
		});
	});

	describe('add', () => {
		let txGetBytesStub: any;
		const tx = {
			id: Buffer.from('1'),
			nonce: BigInt(1),
			fee: BigInt(30000),
			senderPublicKey: generateRandomPublicKeys()[0],
		} as Transaction;

		beforeEach(() => {
			txGetBytesStub = jest.fn();
			tx.getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
		});

		it('should throw error when transaction size is higher than maxPayloadLength', async () => {
			// Arrange
			const txGetBytesTempStub = jest.fn();
			tx.getBytes = txGetBytesTempStub.mockReturnValue(utils.getRandomBytes(15400));
			// Act
			const { status } = await transactionPool.add(tx);
			txGetBytesTempStub.mockReset();

			expect(status).toEqual(Status.FAIL);
		});

		it('should add a valid transaction to the transaction list as processable', async () => {
			// Act
			const { status } = await transactionPool.add(tx);

			// Arrange & Assert
			expect(status).toEqual(Status.OK);
			expect(transactionPool['_allTransactions'].has(Buffer.from('1'))).toBe(true);

			const originalTrxObj =
				transactionPool['_transactionList']
					.get(cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey))
					?.get(BigInt(1)) ?? {};

			expect(originalTrxObj).toEqual(tx);
			const trxSenderAddressList = transactionPool['_transactionList'].get(
				cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey),
			);
			expect(trxSenderAddressList?.getProcessable()).toContain(originalTrxObj);
		});

		it('should add a valid higher nonce transaction to the transaction list as unprocessable', async () => {
			// Arrange
			(transactionPool['_applyFunction'] as jest.Mock).mockRejectedValue({
				code: 'ERR_TRANSACTION_VERIFICATION_FAIL',
				transactionError: { code: 'ERR_NONCE_OUT_OF_BOUNDS', actual: '123', expected: '2' },
			});

			// Act
			const { status } = await transactionPool.add(tx);

			// Assert
			expect(status).toEqual(Status.OK);
			expect(transactionPool['_allTransactions'].has(Buffer.from('1'))).toBe(true);

			const originalTrxObj =
				transactionPool['_transactionList']
					.get(cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey))
					?.get(BigInt(1)) ?? {};

			expect(originalTrxObj).toEqual(tx);
			const trxSenderAddressList = transactionPool['_transactionList'].get(
				cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey),
			);
			expect(trxSenderAddressList?.getUnprocessable()).toContain(originalTrxObj);
		});

		it('should reject a duplicate transaction', async () => {
			// Arrange
			const txDuplicate = { ...tx };

			// Act
			const { status: status1 } = await transactionPool.add(tx);
			const { status: status2 } = await transactionPool.add(txDuplicate);

			// Assert
			expect(status1).toEqual(Status.OK);
			expect(status2).toEqual(Status.OK);
			// Check if its not added to the transaction list
			expect(Object.keys(transactionPool['_allTransactions'])).toHaveLength(1);
		});

		it('should throw when a transaction is invalid', async () => {
			// Arrange
			jest.spyOn(transactionPool, '_getStatus' as any);
			(transactionPool['_applyFunction'] as jest.Mock).mockRejectedValue(
				new Error('Invalid transaction'),
			);

			// Act
			const result = await transactionPool.add(tx);

			// Assert
			expect(transactionPool['_getStatus']).toHaveReturnedWith(TransactionStatus.INVALID);
			expect(result.status).toEqual(Status.FAIL);
			expect(result.error?.message).toBe('Invalid transaction');
		});

		it('should throw when a transaction is invalid but not include higher nonce error', async () => {
			// Arrange
			jest.spyOn(transactionPool, '_getStatus' as any);
			(transactionPool['_applyFunction'] as jest.Mock).mockRejectedValue(
				new Error('Invalid transaction'),
			);

			// Act
			const result = await transactionPool.add(tx);

			// Assert
			expect(transactionPool['_getStatus']).toHaveReturnedWith(TransactionStatus.INVALID);
			expect(result.status).toEqual(Status.FAIL);
			expect(result.error?.message).toBe('Invalid transaction');
		});

		it('should reject a transaction with lower fee than minEntranceFee', async () => {
			// Arrange
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(400),
				maxPayloadLength: 15360,
			});
			const lowFeeTrx = {
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(3000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			const tempTxGetBytesStub = jest.fn();
			lowFeeTrx.getBytes = tempTxGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));

			// Act
			const { status } = await transactionPool.add(lowFeeTrx);

			// Assert
			expect(status).toEqual(Status.FAIL);
		});

		it('should evict lowest feePriority among highest nonce trx from the pool when txPool is full and all the trxs are processable', async () => {
			// Arrange
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
				maxPayloadLength: 15360,
			});

			const tempApplyTransactionsStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionsStub;

			txGetBytesStub = jest.fn();
			for (let i = 0; i < MAX_TRANSACTIONS; i += 1) {
				const tempTx = {
					id: Buffer.from(`${i.toString()}`),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: generateRandomPublicKeys()[0],
				} as Transaction;
				tempTx.getBytes = txGetBytesStub.mockReturnValue(
					Buffer.from(new Array(MAX_TRANSACTIONS + i)),
				);

				tempApplyTransactionsStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);

				await transactionPool.add(tempTx);
			}

			expect(transactionPool.getAll()).toHaveLength(MAX_TRANSACTIONS);

			const highFeePriorityTx = {
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(50000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			highFeePriorityTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(MAX_TRANSACTIONS)),
			);

			tempApplyTransactionsStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);
			jest.spyOn(transactionPool, '_evictProcessable' as any);

			// Act
			const { status } = await transactionPool.add(highFeePriorityTx);

			// Assert
			expect(transactionPool['_evictProcessable']).toHaveBeenCalledTimes(1);
			expect(status).toEqual(Status.OK);
		});

		it('should evict the unprocessable trx with the lowest feePriority from the pool when txPool is full and not all trxs are processable', async () => {
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
				maxPayloadLength: 15360,
			});

			const tempApplyTransactionsStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionsStub;

			txGetBytesStub = jest.fn();
			for (let i = 0; i < MAX_TRANSACTIONS - 1; i += 1) {
				const tempTx = {
					id: Buffer.from(`${i.toString()}`),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: generateRandomPublicKeys()[0],
				} as Transaction;
				tempTx.getBytes = txGetBytesStub.mockReturnValue(
					Buffer.from(new Array(MAX_TRANSACTIONS + i)),
				);

				await transactionPool.add(tempTx);
			}

			const nonSequentialTx = {
				id: Buffer.from('21'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			nonSequentialTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(MAX_TRANSACTIONS)),
			);
			tempApplyTransactionsStub.mockRejectedValue({
				code: 'ERR_TRANSACTION_VERIFICATION_FAIL',
				transactionError: { code: 'ERR_NONCE_OUT_OF_BOUNDS' },
			});
			await transactionPool.add(nonSequentialTx);

			expect(transactionPool.getAll()).toContain(nonSequentialTx);
			expect(transactionPool.getAll()).toHaveLength(MAX_TRANSACTIONS);

			const highFeePriorityTx = {
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(50000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			highFeePriorityTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(MAX_TRANSACTIONS)),
			);

			tempApplyTransactionsStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);
			jest.spyOn(transactionPool, '_evictUnprocessable' as any);

			const { status } = await transactionPool.add(highFeePriorityTx);
			expect(transactionPool.getAll()).not.toContain(nonSequentialTx);
			expect(transactionPool['_evictUnprocessable']).toHaveBeenCalledTimes(1);
			expect(status).toEqual(Status.OK);
		});

		it('should reject a transaction with a lower feePriority than the lowest feePriority present in TxPool', async () => {
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
				maxPayloadLength: 15360,
			});

			const tempApplyTransactionsStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionsStub;

			txGetBytesStub = jest.fn();
			for (let i = 0; i < MAX_TRANSACTIONS; i += 1) {
				const tempTx = {
					id: Buffer.from(`${i.toString()}`),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: generateRandomPublicKeys()[0],
				} as Transaction;
				tempTx.getBytes = txGetBytesStub.mockReturnValue(
					Buffer.from(new Array(MAX_TRANSACTIONS + i)),
				);

				await transactionPool.add(tempTx);
			}

			expect(transactionPool.getAll()).toHaveLength(MAX_TRANSACTIONS);

			const lowFeePriorityTx = {
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			lowFeePriorityTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(2 * MAX_TRANSACTIONS)),
			);

			tempApplyTransactionsStub.mockResolvedValue([{ status: Status.OK, errors: [] }]);

			const { status } = await transactionPool.add(lowFeePriorityTx);

			expect(status).toEqual(Status.FAIL);
		});

		it('should accept a transaction with a lower feePriority than the unprocessable trx with lowest feePriority present in TxPool', async () => {
			const MAX_TRANSACTIONS = 10;
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				minEntranceFeePriority: BigInt(10),
				maxTransactions: MAX_TRANSACTIONS,
				maxPayloadLength: 15360,
			});

			const tempApplyTransactionsStub = jest.fn();
			(transactionPool as any)._applyFunction = tempApplyTransactionsStub;
			txGetBytesStub = jest.fn();
			for (let i = 0; i < MAX_TRANSACTIONS; i += 1) {
				const tempTx = {
					id: Buffer.from(`${i.toString()}`),
					nonce: BigInt(1),
					fee: BigInt(30000),
					senderPublicKey: generateRandomPublicKeys()[0],
				} as Transaction;
				tempTx.getBytes = txGetBytesStub.mockReturnValue(
					Buffer.from(new Array(MAX_TRANSACTIONS + i)),
				);

				// half the trx are unprocessable
				if (i < 5) {
					when(tempApplyTransactionsStub)
						.calledWith([tempTx])
						.mockRejectedValue({
							transactionError: { code: 'ERR_NONCE_OUT_OF_BOUNDS' },
							code: 'ERR_TRANSACTION_VERIFICATION_FAIL',
						});
				} else {
					when(tempApplyTransactionsStub)
						.calledWith([tempTx])
						.mockResolvedValue([{ status: Status.OK, errors: [] }]);
				}

				await transactionPool.add(tempTx);
			}

			expect(transactionPool.getAll()).toHaveLength(MAX_TRANSACTIONS);

			const lowFeePriorityTx = {
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;

			lowFeePriorityTx.getBytes = txGetBytesStub.mockReturnValue(
				Buffer.from(new Array(MAX_TRANSACTIONS + 10)),
			);

			when(tempApplyTransactionsStub)
				.calledWith([lowFeePriorityTx])
				.mockResolvedValue([{ status: Status.OK, errors: [] }]);

			const { status } = await transactionPool.add(lowFeePriorityTx);

			expect(status).toEqual(Status.OK);
		});
	});

	describe('remove', () => {
		let txGetBytesStub: any;
		const senderPublicKey = generateRandomPublicKeys()[0];
		const tx = {
			id: Buffer.from('1'),
			nonce: BigInt(1),
			fee: BigInt(30000),
			senderPublicKey,
		} as Transaction;
		const additionalTx = {
			id: Buffer.from('2'),
			nonce: BigInt(3),
			fee: BigInt(30000),
			senderPublicKey,
		} as Transaction;

		// eslint-disable-next-line prefer-const
		txGetBytesStub = jest.fn().mockReturnValue(Buffer.from(new Array(10)));
		tx.getBytes = txGetBytesStub;
		additionalTx.getBytes = txGetBytesStub;

		beforeEach(async () => {
			await transactionPool.add(tx);
			await transactionPool.add(additionalTx);
		});

		afterEach(() => {
			transactionPool.remove(tx);
			transactionPool.remove(additionalTx);
		});

		it('should return false when a tx id does not exist', () => {
			expect(
				transactionPool['_transactionList']
					.get(cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey))
					?.get(tx.nonce),
			).toEqual(tx);
			expect(transactionPool['_feePriorityQueue'].values).toContain(tx.id);

			// Remove a transaction that does not exist
			const nonExistentTrx = {
				id: Buffer.from('155'),
				nonce: BigInt(1),
				fee: BigInt(1000),
				senderPublicKey: generateRandomPublicKeys()[0],
			} as Transaction;
			const removeStatus = transactionPool.remove(nonExistentTrx);
			expect(removeStatus).toBe(false);
		});

		it('should remove the transaction from _allTransactions, _transactionList and _feePriorityQueue', () => {
			expect(
				transactionPool['_transactionList']
					.get(cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey))
					?.get(tx.nonce),
			).toEqual(tx);
			expect(transactionPool['_feePriorityQueue'].values).toContain(tx.id);

			// Remove the above transaction
			const removeStatus = transactionPool.remove(tx);
			expect(removeStatus).toBe(true);
			expect(transactionPool.getAll()).toHaveLength(1);
			expect(
				transactionPool['_transactionList']
					.get(cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey))
					?.get(tx.nonce),
			).toBeUndefined();
			expect(transactionPool['_feePriorityQueue'].values).not.toContain(tx.id);
		});

		it('should remove the transaction list key if the list is empty', () => {
			transactionPool.remove(tx);
			transactionPool.remove(additionalTx);
			expect(
				transactionPool['_transactionList'].get(
					cryptoAddress.getAddressFromPublicKey(tx.senderPublicKey),
				),
			).toBeUndefined();
		});
	});

	describe('evictUnprocessable', () => {
		const senderPublicKey = generateRandomPublicKeys()[0];
		const transactions = [
			{
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(20000),
				senderPublicKey,
			} as Transaction,
			{
				id: Buffer.from('3'),
				nonce: BigInt(3),
				fee: BigInt(30000),
				senderPublicKey,
			} as Transaction,
		];
		let txGetBytesStub: any;
		// eslint-disable-next-line prefer-const
		txGetBytesStub = jest.fn();
		transactions[0].getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));
		transactions[1].getBytes = txGetBytesStub.mockReturnValue(Buffer.from(new Array(10)));

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn().mockResolvedValue([{ status: Status.OK, errors: [] }]),
				transactionReorganizationInterval: 1,
				maxTransactions: 2,
				maxPayloadLength: 15360,
			});
			jest.spyOn(transactionPool.events, 'emit');
			await transactionPool.add(transactions[0]);
			await transactionPool.add(transactions[1]);
		});

		afterEach(() => {
			transactionPool.remove(transactions[0]);
			transactionPool.remove(transactions[1]);
		});

		it('should evict unprocessable transaction with lowest fee', () => {
			const isEvicted = (transactionPool as any)._evictUnprocessable();

			expect(isEvicted).toBe(true);
			expect((transactionPool as any)._allTransactions).not.toContain(transactions[0]);
			expect(transactionPool.events.emit).toHaveBeenCalledTimes(3);
		});
	});

	describe('evictProcessable', () => {
		const senderPublicKey1 = generateRandomPublicKeys()[0];
		const senderPublicKey2 = generateRandomPublicKeys()[0];
		const transactionsFromSender1 = [
			{
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: senderPublicKey1,
			} as Transaction,
			{
				id: Buffer.from('2'),
				nonce: BigInt(2),
				fee: BigInt(60000),
				senderPublicKey: senderPublicKey1,
			} as Transaction,
		];

		const transactionsFromSender2 = [
			{
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: senderPublicKey2,
			} as Transaction,
			{
				id: Buffer.from('12'),
				nonce: BigInt(2),
				fee: BigInt(30000),
				senderPublicKey: senderPublicKey2,
			} as Transaction,
		];
		const higherNonceTrxs = [transactionsFromSender1[1], transactionsFromSender2[1]];
		let txGetBytesStub: any;
		// eslint-disable-next-line prefer-const
		txGetBytesStub = jest.fn();
		transactionsFromSender1[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender1[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender2[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender2[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn().mockResolvedValue([{ status: Status.OK, errors: [] }]),
				transactionReorganizationInterval: 1,
				maxTransactions: 2,
				maxPayloadLength: 15360,
			});
			jest.spyOn(transactionPool.events, 'emit');
			await transactionPool.add(transactionsFromSender1[0]);
			await transactionPool.add(transactionsFromSender1[1]);
			await transactionPool.add(transactionsFromSender2[0]);
			await transactionPool.add(transactionsFromSender2[1]);
		});

		afterEach(() => {
			transactionPool.remove(transactionsFromSender1[0]);
			transactionPool.remove(transactionsFromSender1[1]);
			transactionPool.remove(transactionsFromSender2[0]);
			transactionPool.remove(transactionsFromSender2[1]);
		});

		it('should evict processable transaction with lowest fee', () => {
			const isEvicted = (transactionPool as any)._evictProcessable();

			expect(isEvicted).toBe(true);
			expect((transactionPool as any)._allTransactions).not.toContain(transactionsFromSender2[1]);
			// To check if evicted processable transaction is the higher nonce transaction of an account
			expect(higherNonceTrxs).toContain(transactionsFromSender2[1]);
			expect(transactionPool.events.emit).toHaveBeenCalledTimes(5);
		});
	});

	describe('reorganize', () => {
		const senderPublicKey1 = generateRandomPublicKeys()[0];
		const senderPublicKey2 = generateRandomPublicKeys()[0];
		const transactionsFromSender1 = [
			{
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: senderPublicKey1,
			} as Transaction,
			{
				id: Buffer.from('2'),
				nonce: BigInt(2),
				fee: BigInt(60000),
				senderPublicKey: senderPublicKey1,
			} as Transaction,
			{
				id: Buffer.from('3'),
				nonce: BigInt(3),
				fee: BigInt(90000),
				senderPublicKey: senderPublicKey1,
			} as Transaction,
		];

		const transactionsFromSender2 = [
			{
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(30000),
				senderPublicKey: senderPublicKey2,
			} as Transaction,
		];

		let txGetBytesStub: any;
		// eslint-disable-next-line prefer-const
		txGetBytesStub = jest.fn();
		transactionsFromSender1[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender1[1].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender1[2].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		transactionsFromSender2[0].getBytes = txGetBytesStub.mockReturnValue(
			Buffer.from(new Array(10)),
		);
		let address: Buffer;
		let txList: TransactionList;

		beforeEach(async () => {
			transactionPool = new TransactionPool({
				applyTransactions: jest.fn(),
				transactionReorganizationInterval: 1,
				maxPayloadLength: 15360,
			});
			await transactionPool.add(transactionsFromSender1[0]);
			await transactionPool.add(transactionsFromSender1[1]);
			await transactionPool.add(transactionsFromSender1[2]);
			await transactionPool.add(transactionsFromSender2[0]);
			// eslint-disable-next-line prefer-destructuring
			address = (transactionPool as any)._transactionList.values()[0].address;
			txList = (transactionPool as any)._transactionList.get(address);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			transactionPool.start();
		});

		afterEach(() => {
			transactionPool.remove(transactionsFromSender1[0]);
			transactionPool.remove(transactionsFromSender1[1]);
			transactionPool.remove(transactionsFromSender1[2]);
			transactionPool.remove(transactionsFromSender2[0]);
			transactionPool.stop();
		});

		it('should not promote unprocessable transactions to processable transactions', () => {
			transactionPool.remove(transactionsFromSender1[1]);
			jest.advanceTimersByTime(2);
			const unprocessableTransactions = txList.getUnprocessable();

			expect(unprocessableTransactions).toContain(transactionsFromSender1[2]);
		});

		it('should call apply function with processable transaction', () => {
			// First transaction is processable
			jest.advanceTimersByTime(2);

			expect(transactionPool['_applyFunction']).toHaveBeenCalledWith(transactionsFromSender1);
			expect(transactionPool['_applyFunction']).toHaveBeenCalledWith(transactionsFromSender2);
		});

		it('should not remove unprocessable transaction but also does not promote', () => {
			// Arrange
			when(transactionPool['_applyFunction'] as jest.Mock)
				.calledWith(transactionsFromSender1)
				.mockRejectedValue({
					id: Buffer.from('2'),
					code: 'ERR_TRANSACTION_VERIFICATION_FAIL',
					transactionError: {
						code: 'ERR_NONCE_OUT_OF_BOUNDS',
					},
				} as never);

			jest.advanceTimersByTime(2);
			// Assert
			expect(transactionPool['_allTransactions'].get(transactionsFromSender1[0].id)).toBeDefined();
			// Unprocessable trx should not be removed
			expect(transactionPool['_allTransactions'].get(transactionsFromSender1[1].id)).toBeDefined();
			expect(transactionPool['_allTransactions'].get(transactionsFromSender1[2].id)).toBeDefined();
			// Unprocessable trx should not be promoted
			expect(
				transactionPool
					.getProcessableTransactions()
					.get(address)
					?.map(tx => tx.id),
			).not.toContain(transactionsFromSender1[1].id);
			expect(
				transactionPool
					.getProcessableTransactions()
					.get(address)
					?.map(tx => tx.id),
			).not.toContain(transactionsFromSender1[2].id);
		});
	});

	describe('expire', () => {
		const senderPublicKey1 = generateRandomPublicKeys()[0];
		const senderPublicKey2 = generateRandomPublicKeys()[1];
		const transactionsForSender1 = [
			{
				id: Buffer.from('1'),
				nonce: BigInt(1),
				fee: BigInt(1000),
				senderPublicKey: senderPublicKey1,
				receivedAt: new Date(0),
			} as Transaction,
			{
				id: Buffer.from('2'),
				nonce: BigInt(2),
				fee: BigInt(2000),
				senderPublicKey: senderPublicKey1,
				receivedAt: new Date(),
			} as Transaction,
			{
				id: Buffer.from('3'),
				nonce: BigInt(3),
				fee: BigInt(3000),
				senderPublicKey: senderPublicKey1,
				receivedAt: new Date(0),
			} as Transaction,
		];

		const transactionsForSender2 = [
			{
				id: Buffer.from('11'),
				nonce: BigInt(1),
				fee: BigInt(1000),
				senderPublicKey: senderPublicKey2,
				receivedAt: new Date(0),
			} as Transaction,
			{
				id: Buffer.from('12'),
				nonce: BigInt(2),
				fee: BigInt(2000),
				senderPublicKey: senderPublicKey2,
				receivedAt: new Date(),
			} as Transaction,
		];

		beforeEach(() => {
			transactionPool['_allTransactions'].set(
				transactionsForSender1[0].id,
				transactionsForSender1[0],
			);
			transactionPool['_allTransactions'].set(
				transactionsForSender1[1].id,
				transactionsForSender1[1],
			);
			transactionPool['_allTransactions'].set(
				transactionsForSender1[2].id,
				transactionsForSender1[2],
			);
			transactionPool['_allTransactions'].set(
				transactionsForSender2[0].id,
				transactionsForSender2[0],
			);
			transactionPool['_allTransactions'].set(
				transactionsForSender2[1].id,
				transactionsForSender2[1],
			);
		});

		it('should expire old transactions', () => {
			(transactionPool as any).remove = jest.fn().mockReturnValue(true);
			(transactionPool as any)._expire();
			expect((transactionPool as any).remove).toHaveBeenCalledWith(transactionsForSender1[0]);
			expect((transactionPool as any).remove).toHaveBeenCalledWith(transactionsForSender1[2]);
			expect((transactionPool as any).remove).toHaveBeenCalledWith(transactionsForSender2[0]);
			expect(transactionPool.events.emit).toHaveBeenCalledTimes(3);
		});
	});
});
