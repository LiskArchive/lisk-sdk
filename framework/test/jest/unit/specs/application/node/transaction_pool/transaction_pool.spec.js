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
 */

'use strict';

const pool = require('@liskhq/lisk-transaction-pool');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	TransactionPool,
	EVENT_UNCONFIRMED_TRANSACTION,
} = require('../../../../../../../src/application/node/transaction_pool/transaction_pool');

describe('transactionPool', () => {
	const broadcastInterval = 5;
	const releaseLimit = 25;
	const expireTransactionsInterval = 10000;
	const maxSharedTransactions = 25;
	const maxTransactionsPerQueue = 1000;
	const maxTransactionsPerBlock = 25;

	const logger = {
		info: jest.fn(),
		error: jest.fn(),
	};

	const storage = {
		entities: {
			Transaction: {
				get: jest.fn(),
			},
		},
	};

	const chainStub = {
		slots: {
			getSlotNumber: jest.fn(),
		},
		lastBlock: {
			get: jest.fn(),
		},
		processSignature: jest
			.fn()
			.mockResolvedValue({ transactionsResponses: [] }),
	};

	let transactionPool;
	let dummyTransactions;

	beforeEach(async () => {
		transactionPool = new TransactionPool({
			storage,
			chain: chainStub,
			logger,
			broadcastInterval,
			releaseLimit,
			expireTransactionsInterval,
			maxSharedTransactions,
			maxTransactionsPerQueue,
			maxTransactionsPerBlock,
		});

		// Stubs for event emitters
		jest.spyOn(transactionPool.pool, 'on');
		jest.spyOn(transactionPool, 'emit');

		dummyTransactions = [{ id: 1 }, { id: 2 }, { id: 3 }];
	});

	describe('constructor', () => {
		it('should set the instance variables', async () => {
			expect(transactionPool.maxTransactionsPerQueue).toEqual(
				maxTransactionsPerQueue,
			);
			expect(transactionPool.bundledInterval).toEqual(broadcastInterval);
			expect(transactionPool.bundleLimit).toEqual(releaseLimit);
			expect(transactionPool.logger).toEqual(logger);
		});

		it('should create pool instance', async () => {
			expect(transactionPool.pool).toBeInstanceOf(pool.TransactionPool);
		});
	});

	describe('transactionInPool', () => {
		let existsInTransactionPoolStub;
		const id = '123';

		beforeEach(async () => {
			existsInTransactionPoolStub = jest
				.spyOn(transactionPool.pool, 'existsInTransactionPool')
				.mockReturnValue(true);
		});

		it('should call the this.existsInTransactionPool', async () => {
			transactionPool.transactionInPool(id);
			expect(existsInTransactionPoolStub).toHaveBeenCalledWith(id);
		});

		it('should return the value returned by this.existsInTransactionPool', async () => {
			expect(transactionPool.transactionInPool(id)).toEqual(true);
		});
	});

	describe('getUnconfirmedTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = jest
				.spyOn(transactionPool, 'getTransactionsList')
				.mockReturnValue([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getUnconfirmedTransactionList(reverse, limit);
			expect(getTransactionsListStub).toHaveBeenCalledWith(
				'ready',
				reverse,
				limit,
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(
				transactionPool.getUnconfirmedTransactionList(reverse, limit),
			).toEqual([]);
		});
	});

	describe('getBundledTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = jest
				.spyOn(transactionPool, 'getTransactionsList')
				.mockReturnValue([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getBundledTransactionList(reverse, limit);
			expect(getTransactionsListStub).toHaveBeenCalledWith(
				'received',
				reverse,
				limit,
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getBundledTransactionList(reverse, limit)).toEqual(
				[],
			);
		});
	});

	describe('getQueuedTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = jest
				.spyOn(transactionPool, 'getTransactionsList')
				.mockReturnValue([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getQueuedTransactionList(reverse, limit);
			expect(getTransactionsListStub).toHaveBeenCalledWith(
				'verified',
				reverse,
				limit,
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getQueuedTransactionList(reverse, limit)).toEqual(
				[],
			);
		});
	});

	describe('getTransactionsList', () => {
		const queueName = 'testQueue';
		const dummyTransactionsList = new Array(100)
			.fill(0)
			.map((_, index) => index);

		beforeEach(async () => {
			transactionPool.pool.queues[queueName] = {
				transactions: dummyTransactionsList,
			};
		});

		it('should return transactions from the queue passed as parameter', async () => {
			expect(transactionPool.getTransactionsList(queueName)).toEqual(
				dummyTransactionsList,
			);
		});

		it('should reverse transactions if reverse parameter is set to true', async () => {
			expect(transactionPool.getTransactionsList(queueName, true)).toEqual(
				dummyTransactionsList.reverse(),
			);
		});

		it('should limit the transactions returned based on the limit parameter', async () => {
			const slicedTransactions = dummyTransactionsList.slice(0, 10);
			expect(transactionPool.getTransactionsList(queueName, false, 10)).toEqual(
				slicedTransactions,
			);
		});
	});

	describe('getMergedTransactionList', () => {
		let getUnconfirmedTransactionListStub;
		let getQueuedTransactionListStub;

		beforeEach(async () => {
			getUnconfirmedTransactionListStub = jest
				.spyOn(transactionPool, 'getUnconfirmedTransactionList')
				.mockReturnValue([dummyTransactions[0]]);
			getQueuedTransactionListStub = jest
				.spyOn(transactionPool, 'getQueuedTransactionList')
				.mockReturnValue([dummyTransactions[1], dummyTransactions[2]]);
		});

		it('should get transactions from queues using correct parameters', async () => {
			transactionPool.getMergedTransactionList(false, maxSharedTransactions);
			expect(getUnconfirmedTransactionListStub).toHaveBeenCalledWith(
				false,
				maxSharedTransactions,
			);
			expect(getQueuedTransactionListStub).toHaveBeenCalledWith(
				false,
				maxSharedTransactions - 1,
			);
		});

		it('should return transactions from all the queues', async () => {
			expect(
				transactionPool.getMergedTransactionList(false, maxSharedTransactions),
			).toEqual(dummyTransactions);
		});
	});

	describe('addBundledTransaction', () => {
		it('should call this.pool.addTransaction with tranasction as parameter', async () => {
			const addTransactionStub = jest
				.spyOn(transactionPool.pool, 'addTransaction')
				.mockReturnValue({
					isFull: false,
					exists: false,
					queueName: 'recieved',
				});
			transactionPool.addBundledTransaction(dummyTransactions[0]);
			expect(addTransactionStub).toHaveBeenCalledWith(dummyTransactions[0]);
		});
	});

	describe('addQueuedTransaction', () => {
		it('should call this.pool.addVerifiedTransaction with tranasction as parameter', async () => {
			const addVerifiedTransactionStub = jest
				.spyOn(transactionPool.pool, 'addVerifiedTransaction')
				.mockReturnValue({
					isFull: false,
					exists: false,
					queueName: 'verified',
				});
			transactionPool.addVerifiedTransaction(dummyTransactions[0]);
			expect(addVerifiedTransactionStub).toHaveBeenCalledWith(
				dummyTransactions[0],
			);
		});
	});

	describe('processUnconfirmedTransaction', () => {
		let transactionsResponses;
		let transaction;

		beforeEach(async () => {
			[transaction] = dummyTransactions;
			transactionsResponses = [
				{
					status: TransactionStatus.OK,
					errors: [],
				},
			];
			jest.spyOn(transactionPool, 'verifyTransactions');
			transactionPool.verifyTransactions.mockReturnValue({
				transactionsResponses,
			});
		});

		it('should throw an error if the transaction already exists', async () => {
			jest.spyOn(transactionPool, 'transactionInPool').mockReturnValue(true);

			try {
				await transactionPool.processUnconfirmedTransaction(transaction);
			} catch (err) {
				// eslint-disable-next-line jest/no-try-expect
				expect(err).toBeInstanceOf(Array);
				err.forEach(anErr => {
					// eslint-disable-next-line jest/no-try-expect
					expect(anErr.message).toEqual(
						`Transaction is already processed: ${transaction.id}`,
					);
				});
			}
		});

		it('should add transaction to the verified queue when status is OK', async () => {
			const addVerifiedTransactionStub = jest.spyOn(
				transactionPool,
				'addVerifiedTransaction',
			);
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addVerifiedTransactionStub).toHaveBeenCalledWith(transaction);
		});

		it('should add transaction to the received queue if the bundled property = true', async () => {
			transaction.bundled = true;
			const addBundledTransactionStub = jest
				.spyOn(transactionPool, 'addBundledTransaction')
				.mockResolvedValue();
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addBundledTransactionStub).toHaveBeenCalledWith(transaction);
		});

		it('should return error when when status is FAIL', async () => {
			const responses = [
				{
					status: TransactionStatus.FAIL,
					errors: [new Error()],
				},
			];
			transactionPool.verifyTransactions.mockResolvedValue({
				transactionsResponses: responses,
			});
			try {
				await transactionPool.processUnconfirmedTransaction(transaction);
			} catch (err) {
				// eslint-disable-next-line jest/no-try-expect
				expect(err).toBeInstanceOf(Array);
				// eslint-disable-next-line jest/no-try-expect
				expect(err[0]).toEqual(responses[0].errors[0]);
			}
		});
	});

	describe('#Events', () => {
		it('it should subscribe to EVENT_VERIFIED_TRANSACTION_ONCE, EVENT_ADDED_TRANSACTIONS, EVENT_REMOVED_TRANSACTIONS', async () => {
			// Act
			transactionPool.subscribeEvents();
			// Assert
			expect(transactionPool.pool.on).toHaveBeenNthCalledWith(
				1,
				'transactionVerifiedOnce',
				expect.any(Function),
			);
			expect(transactionPool.pool.on).toHaveBeenNthCalledWith(
				2,
				'transactionsAdded',
				expect.any(Function),
			);
			expect(transactionPool.pool.on).toHaveBeenNthCalledWith(
				3,
				'transactionsRemoved',
				expect.any(Function),
			);
		});

		it('should emit EVENT_UNCONFIRMED_TRANSACTION on EVENT_VERIFIED_TRANSACTION_ONCE', async () => {
			// Arrange
			const eventData = {
				action: 'transactionVerifiedOnce',
				payload: [dummyTransactions[0]],
			};
			// Act
			transactionPool.pool.emit('transactionVerifiedOnce', eventData);
			// Assert
			expect(transactionPool.emit).toHaveBeenCalledWith(
				EVENT_UNCONFIRMED_TRANSACTION,
				dummyTransactions[0],
			);
		});
	});
});
