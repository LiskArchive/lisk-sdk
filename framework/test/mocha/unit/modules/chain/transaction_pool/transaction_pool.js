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

const pool = require('@liskhq/lisk-transaction-pool');
const {
	Status: TransactionStatus,
	TransactionError,
} = require('@liskhq/lisk-transactions');
const { expect } = require('chai');
const {
	TransactionPool,
} = require('../../../../../../src/modules/chain/transaction_pool/transaction_pool');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const { transactions: transactionsFixtures } = require('../../../../fixtures');

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

	const blocksStub = {
		lastBlock: {
			get: sinonSandbox.stub(),
		},
	};

	const slotsStub = {
		getSlotNumber: sinonSandbox.stub(),
	};

	let transactionPool;
	let dummyTransactions;

	beforeEach(async () => {
		sinonSandbox
			.stub(transactionsModule, 'composeTransactionSteps')
			.returns(sinonSandbox.stub());
		transactionPool = new TransactionPool({
			storage,
			blocks: blocksStub,
			slots: slotsStub,
			logger,
			broadcastInterval,
			releaseLimit,
			expireTransactionsInterval,
			maxSharedTransactions,
			maxTransactionsPerQueue,
			maxTransactionsPerBlock,
		});

		dummyTransactions = [{ id: 1 }, { id: 2 }, { id: 3 }];
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should set the instance variables', async () => {
			expect(transactionPool.maxTransactionsPerQueue).to.equal(
				maxTransactionsPerQueue
			);
			expect(transactionPool.bundledInterval).to.equal(broadcastInterval);
			expect(transactionPool.bundleLimit).to.equal(releaseLimit);
			expect(transactionPool.logger).to.equal(logger);
		});

		it('should create pool instance', async () => {
			expect(transactionPool.pool).to.be.an.instanceOf(pool.TransactionPool);
		});

		it('should call composeTransactionSteps to compose verifyTransactions', async () => {
			expect(transactionsModule.composeTransactionSteps).to.have.been
				.calledTwice;
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
				limit
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(
				transactionPool.getUnconfirmedTransactionList(reverse, limit)
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
				limit
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getBundledTransactionList(reverse, limit)).to.eql(
				[]
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
				limit
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(transactionPool.getQueuedTransactionList(reverse, limit)).to.eql(
				[]
			);
		});
	});

	describe('getMultisignatureTransactionList', () => {
		let getTransactionsListStub;

		beforeEach(async () => {
			getTransactionsListStub = sinonSandbox
				.stub(transactionPool, 'getTransactionsList')
				.returns([]);
		});

		it('should call getTransactionsList with correct params', async () => {
			const reverse = true;
			const limit = 10;
			transactionPool.getMultisignatureTransactionList(reverse, limit);
			expect(getTransactionsListStub).to.be.calledWithExactly(
				'pending',
				reverse,
				limit
			);
		});

		it('should return the value returned by pool.getTransactionsList', async () => {
			const reverse = true;
			const limit = 10;
			expect(
				transactionPool.getMultisignatureTransactionList(reverse, limit)
			).to.eql([]);
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
				dummyTransactionsList
			);
		});

		it('should reverse transactions if reverse parameter is set to true', async () => {
			expect(transactionPool.getTransactionsList(queueName, true)).to.eql(
				dummyTransactionsList.reverse()
			);
		});

		it('should limit the transactions returned based on the limit parameter', async () => {
			const slicedTransactions = dummyTransactionsList.slice(0, 10);
			expect(transactionPool.getTransactionsList(queueName, false, 10)).to.eql(
				slicedTransactions
			);
		});
	});

	describe('getMergedTransactionList', () => {
		let getUnconfirmedTransactionListStub;
		let getMultisignatureTransactionListStub;
		let getQueuedTransactionListStub;

		beforeEach(async () => {
			getUnconfirmedTransactionListStub = sinonSandbox
				.stub(transactionPool, 'getUnconfirmedTransactionList')
				.returns([dummyTransactions[0]]);
			getMultisignatureTransactionListStub = sinonSandbox
				.stub(transactionPool, 'getMultisignatureTransactionList')
				.returns([dummyTransactions[1]]);
			getQueuedTransactionListStub = sinonSandbox
				.stub(transactionPool, 'getQueuedTransactionList')
				.returns([dummyTransactions[2]]);
		});

		it('should get transactions from queues using correct parameters', async () => {
			transactionPool.getMergedTransactionList(false, maxSharedTransactions);
			expect(getUnconfirmedTransactionListStub).to.be.calledWithExactly(
				false,
				maxSharedTransactions
			);
			expect(getMultisignatureTransactionListStub).to.be.calledWithExactly(
				false,
				maxSharedTransactions - 1
			);
			expect(getQueuedTransactionListStub).to.be.calledWithExactly(
				false,
				maxSharedTransactions - 2
			);
		});

		it('should return transactions from all the queues', async () => {
			expect(
				transactionPool.getMergedTransactionList(false, maxSharedTransactions)
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
				dummyTransactions[0]
			);
		});
	});

	describe('addMultisignatureTransaction', () => {
		it('should call this.pool.addMultisignatureTransaction with tranasction as parameter', async () => {
			const addMultisignatureTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addPendingTransaction')
				.returns({ isFull: false, exists: false, queueName: 'pending' });
			transactionPool.addMultisignatureTransaction(dummyTransactions[0]);
			expect(addMultisignatureTransactionStub).to.be.calledWithExactly(
				dummyTransactions[0]
			);
		});
	});

	describe('getTransactionAndProcessSignature', () => {
		const TRANSACTION_TYPES_MULTI = 4;
		let transactionResponse;
		let transactionObject;
		let signatureObject;

		beforeEach(async () => {
			// Set some random data used for tests
			transactionObject = new transactionsFixtures.Transaction({
				type: TRANSACTION_TYPES_MULTI,
			});
			transactionResponse = {
				id: transactionObject.id,
				status: 1,
				errors: [],
			};
			signatureObject = {
				transactionId: transactionObject.id,
				publicKey: 'publicKey1',
				signature: 'signature1',
			};
			transactionObject.signatures = [];
			sinonSandbox
				.stub(transactionPool, 'getMultisignatureTransaction')
				.returns(transactionObject);
		});

		describe('when signature is not present', () => {
			it('should throw a TransactionError instance', async () => {
				try {
					await transactionPool.getTransactionAndProcessSignature(undefined);
				} catch (errors) {
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Unable to process signature, signature not provided'
					);
				}
			});
		});

		describe('when getMultisignatureTransaction returns no transaction', () => {
			it('should throw an Error instance', async () => {
				transactionPool.getMultisignatureTransaction.returns(undefined);
				try {
					await transactionPool.getTransactionAndProcessSignature(
						signatureObject
					);
				} catch (errors) {
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Unable to process signature, corresponding transaction not found'
					);
				}
			});
		});

		describe('when signature already exists in transaction', () => {
			beforeEach(async () => {
				sinonSandbox.stub(transactionsModule, 'processSignature').returns(
					sinonSandbox.stub().resolves({
						...transactionResponse,
						status: 0,
						errors: [
							new TransactionError('Signature already present in transaction.'),
						],
					})
				);
			});

			it('should throw an Error instance', async () => {
				transactionObject.signatures = ['signature1'];
				try {
					await transactionPool.getTransactionAndProcessSignature(
						signatureObject
					);
				} catch (errors) {
					expect(
						transactionPool.getMultisignatureTransaction
					).to.have.been.calledWith(signatureObject.transactionId);
					expect(transactionPool.getMultisignatureTransaction).to.have.been
						.calledOnce;
					expect(transactionsModule.processSignature).to.have.been.calledOnce;
					expect(errors[0]).to.be.an.instanceof(TransactionError);
					expect(errors[0].message).to.eql(
						'Signature already present in transaction.'
					);
				}
			});
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
						`Transaction is already processed: ${transaction.id}`
					);
				});
			}
		});

		it('should add transaction to the verified queue when status is OK', async () => {
			const addVerifiedTransactionStub = sinonSandbox.stub(
				transactionPool,
				'addVerifiedTransaction'
			);
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addVerifiedTransactionStub).to.be.calledWith(transaction);
		});

		it('should add transaction to pending when status is PENDING', async () => {
			transactionPool.verifyTransactions.resolves({
				transactionsResponses: [
					{
						status: TransactionStatus.PENDING,
						errors: [],
					},
				],
			});
			const addMultisignatureTransactionStub = sinonSandbox.stub(
				transactionPool,
				'addMultisignatureTransaction'
			);
			await transactionPool.processUnconfirmedTransaction(transaction);
			expect(addMultisignatureTransactionStub).to.be.calledWith(transaction);
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
});
