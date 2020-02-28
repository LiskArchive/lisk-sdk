/*
 * Copyright © 2019 Lisk Foundation
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
const { expect } = require('chai');
const {
	TransactionPool,
	EVENT_UNCONFIRMED_TRANSACTION,
} = require('../../../../../../src/application/node/transaction_pool/transaction_pool');

describe('transactionPool', () => {
	const broadcastInterval = 5;
	const releaseLimit = 25;
	const expireTransactionsInterval = 10000;
	const maxSharedTransactions = 25;
	const maxTransactionsPerQueue = 1000;
	const maxTransactionsPerBlock = 25;

	const logger = {
		info: sinonSandbox.spy(),
		error: sinonSandbox.spy(),
	};

	const storage = {
		entities: {
			Transaction: {
				get: sinonSandbox.stub(),
			},
		},
	};

	const chainStub = {
		slots: {
			getSlotNumber: sinonSandbox.stub(),
		},
		lastBlock: {
			get: sinonSandbox.stub(),
		},
		processSignature: sinonSandbox
			.stub()
			.resolves({ transactionsResponses: [] }),
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
		sinonSandbox.stub(transactionPool.pool, 'on');
		sinonSandbox.stub(transactionPool, 'emit');

		dummyTransactions = [{ id: 1 }, { id: 2 }, { id: 3 }];
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should set the instance variables', async () => {
			expect(transactionPool.maxTransactionsPerQueue).to.equal(
				maxTransactionsPerQueue,
			);
			expect(transactionPool.bundledInterval).to.equal(broadcastInterval);
			expect(transactionPool.bundleLimit).to.equal(releaseLimit);
			expect(transactionPool.logger).to.equal(logger);
		});

		it('should create pool instance', async () => {
			expect(transactionPool.pool).to.be.an.instanceOf(pool.TransactionPool);
		});
	});

	describe('transactionInPool', () => {
		let existsInTransactionPoolStub;
		const id = '123';

		beforeEach(async () => {
			existsInTransactionPoolStub = sinonSandbox
				.stub(transactionPool.pool, 'existsInTransactionPool')
				.returns(true);
		});

		it('should call the this.existsInTransactionPool', async () => {
			transactionPool.transactionInPool(id);
			expect(existsInTransactionPoolStub).to.be.calledWithExactly(id);
		});

		it('should return the value returned by this.existsInTransactionPool', async () => {
			expect(transactionPool.transactionInPool(id)).to.equal(true);
		});
	});

	describe('getUnconfirmedTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = sinonSandbox
				.stub(transactionPool, 'getTransactionsList')
				.returns([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getUnconfirmedTransactionList(reverse, limit);
			expect(getTransactionsListStub).to.be.calledWithExactly(
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
			).to.eql([]);
		});
	});

	describe('getBundledTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = sinonSandbox
				.stub(transactionPool, 'getTransactionsList')
				.returns([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getBundledTransactionList(reverse, limit);
			expect(getTransactionsListStub).to.be.calledWithExactly(
				'received',
				reverse,
				limit,
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getBundledTransactionList(reverse, limit)).to.eql(
				[],
			);
		});
	});

	describe('getQueuedTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = sinonSandbox
				.stub(transactionPool, 'getTransactionsList')
				.returns([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getQueuedTransactionList(reverse, limit);
			expect(getTransactionsListStub).to.be.calledWithExactly(
				'verified',
				reverse,
				limit,
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getQueuedTransactionList(reverse, limit)).to.eql(
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
			expect(transactionPool.getTransactionsList(queueName)).to.eql(
				dummyTransactionsList,
			);
		});

		it('should reverse transactions if reverse parameter is set to true', async () => {
			expect(transactionPool.getTransactionsList(queueName, true)).to.eql(
				dummyTransactionsList.reverse(),
			);
		});

		it('should limit the transactions returned based on the limit parameter', async () => {
			const slicedTransactions = dummyTransactionsList.slice(0, 10);
			expect(transactionPool.getTransactionsList(queueName, false, 10)).to.eql(
				slicedTransactions,
			);
		});
	});

	describe('getMergedTransactionList', () => {
		let getUnconfirmedTransactionListStub;
		let getQueuedTransactionListStub;

		beforeEach(async () => {
			getUnconfirmedTransactionListStub = sinonSandbox
				.stub(transactionPool, 'getUnconfirmedTransactionList')
				.returns([dummyTransactions[0]]);
			getQueuedTransactionListStub = sinonSandbox
				.stub(transactionPool, 'getQueuedTransactionList')
				.returns([dummyTransactions[1], dummyTransactions[2]]);
		});

		it('should get transactions from queues using correct parameters', async () => {
			transactionPool.getMergedTransactionList(false, maxSharedTransactions);
			expect(getUnconfirmedTransactionListStub).to.be.calledWithExactly(
				false,
				maxSharedTransactions,
			);
			expect(getQueuedTransactionListStub).to.be.calledWithExactly(
				false,
				maxSharedTransactions - 1,
			);
		});

		it('should return transactions from all the queues', async () => {
			expect(
				transactionPool.getMergedTransactionList(false, maxSharedTransactions),
			).to.eql(dummyTransactions);
		});
	});

	describe('addBundledTransaction', () => {
		it('should call this.pool.addTransaction with tranasction as parameter', async () => {
			const addTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addTransaction')
				.returns({ isFull: false, exists: false, queueName: 'recieved' });
			transactionPool.addBundledTransaction(dummyTransactions[0]);
			expect(addTransactionStub).to.be.calledWithExactly(dummyTransactions[0]);
		});
	});

	describe('addQueuedTransaction', () => {
		it('should call this.pool.addVerifiedTransaction with tranasction as parameter', async () => {
			const addVerifiedTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addVerifiedTransaction')
				.returns({ isFull: false, exists: false, queueName: 'verified' });
			transactionPool.addVerifiedTransaction(dummyTransactions[0]);
			expect(addVerifiedTransactionStub).to.be.calledWithExactly(
				dummyTransactions[0],
			);
		});
	});

	describe('processUnconfirmedTransaction', () => {
		let transactionsResponses;
		let transaction;

		beforeEach(async () => {
			transaction = dummyTransactions[0];
			transactionsResponses = [
				{
					status: TransactionStatus.OK,
					errors: [],
				},
			];
			sinonSandbox.stub(transactionPool, 'verifyTransactions');
			transactionPool.verifyTransactions.returns({ transactionsResponses });
		});

		it('should throw an error if the transaction already exists', async () => {
			sinonSandbox.stub(transactionPool, 'transactionInPool').returns(true);
			try {
				await transactionPool.processUnconfirmedTransaction(transaction);
			} catch (err) {
				expect(err).to.be.an('array');
				err.forEach(anErr => {
					expect(anErr.message).to.equal(
						`Transaction is already processed: ${transaction.id}`,
					);
				});
			}
		});

		it('should add transaction to the verified queue when status is OK', async () => {
			const addVerifiedTransactionStub = sinonSandbox.stub(
				transactionPool,
				'addVerifiedTransaction',
			);
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addVerifiedTransactionStub).to.be.calledWith(transaction);
		});

		it('should add transaction to the received queue if the bundled property = true', async () => {
			transaction.bundled = true;
			const addBundledTransactionStub = sinonSandbox
				.stub(transactionPool, 'addBundledTransaction')
				.resolves();
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addBundledTransactionStub).to.be.calledWith(transaction);
		});

		it('should return error when when status is FAIL', async () => {
			const responses = [
				{
					status: TransactionStatus.FAIL,
					errors: [new Error()],
				},
			];
			transactionPool.verifyTransactions.resolves({
				transactionsResponses: responses,
			});
			try {
				await transactionPool.processUnconfirmedTransaction(transaction);
			} catch (err) {
				expect(err).to.be.an('array');
				expect(err[0]).to.eql(responses[0].errors[0]);
			}
		});
	});

	describe('#Events', () => {
		it('it should subscribe to EVENT_VERIFIED_TRANSACTION_ONCE, EVENT_ADDED_TRANSACTIONS, EVENT_REMOVED_TRANSACTIONS', async () => {
			// Act
			transactionPool.subscribeEvents();
			// Assert
			expect(transactionPool.pool.on.firstCall).to.be.calledWith(
				'transactionVerifiedOnce',
			);
			expect(transactionPool.pool.on.secondCall).to.be.calledWith(
				'transactionsAdded',
			);
			expect(transactionPool.pool.on.thirdCall).to.be.calledWith(
				'transactionsRemoved',
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
			expect(transactionPool.emit).to.be.calledWith(
				EVENT_UNCONFIRMED_TRANSACTION,
				dummyTransactions[0],
			);
		});
	});
});
