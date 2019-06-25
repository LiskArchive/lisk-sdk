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
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const expect = require('chai').expect;
const processTransactionLogic = require('../../../../../../src/modules/chain/logic/process_transaction');
const TransactionPool = require('../../../../../../src/modules/chain/logic/transaction_pool');

const config = __testContext.config;

const {
	MAX_TRANSACTIONS_PER_BLOCK,
	MAX_SHARED_TRANSACTIONS,
} = global.constants;
describe('transactionPool', () => {
	let transactionPool;
	let dummyTransactions;

	const logger = {
		trace: sinonSandbox.spy(),
		debug: sinonSandbox.spy(),
		info: sinonSandbox.spy(),
		log: sinonSandbox.spy(),
		warn: sinonSandbox.spy(),
		error: sinonSandbox.spy(),
	};

	const processTransactionsStub = {
		checkPersistedTransactions: sinonSandbox.stub().resolves(),
		validateTransactions: sinonSandbox.stub().resolves(),
		verifyTransactions: sinonSandbox.stub().resolves(),
		applyTransactions: sinonSandbox.stub().resolves(),
		checkAllowedTransactions: sinonSandbox.stub().resolves(),
	};

	beforeEach(async () => {
		config.transactions = config.modules.chain.transactions;
		// Init test subject
		transactionPool = new TransactionPool(
			config.modules.chain.broadcasts.broadcastInterval,
			config.modules.chain.broadcasts.releaseLimit,
			logger, // logger
			config
		);

		dummyTransactions = [{ id: 1 }, { id: 2 }, { id: 3 }];

		// Bind stub modules
		transactionPool.bind(processTransactionsStub);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should set the instance variables', async () => {
			const tp = new TransactionPool(
				config.modules.chain.broadcasts.broadcastInterval,
				config.modules.chain.broadcasts.releaseLimit,
				logger, // logger
				config
			);

			expect(tp.maxTransactionsPerQueue).to.equal(
				config.transactions.maxTransactionsPerQueue
			);
			expect(tp.bundledInterval).to.equal(
				config.modules.chain.broadcasts.broadcastInterval
			);
			expect(tp.bundleLimit).to.equal(
				config.modules.chain.broadcasts.releaseLimit
			);
			expect(tp.logger).to.equal(logger);
		});
	});

	describe('bind', () => {
		let txPool;
		beforeEach(async () => {
			sinonSandbox.spy(processTransactionLogic, 'composeTransactionSteps');
			txPool = new TransactionPool(
				config.modules.chain.broadcasts.broadcastInterval,
				config.modules.chain.broadcasts.releaseLimit,
				logger, // logger
				config
			);
			txPool.bind(processTransactionsStub);
		});

		it('should create pool instance', async () => {
			expect(txPool.pool).to.be.an.instanceOf(pool.TransactionPool);
		});

		it('should call composeTransactionSteps to compose verifyTransactions', async () => {
			expect(
				processTransactionLogic.composeTransactionSteps
			).to.have.been.calledWith(
				processTransactionsStub.checkAllowedTransactions,
				processTransactionsStub.checkPersistedTransactions,
				processTransactionsStub.verifyTransactions
			);
		});

		it('should call composeTransactionSteps to compose processTransactions', async () => {
			expect(
				processTransactionLogic.composeTransactionSteps.getCall(1)
			).to.have.been.calledWith(
				processTransactionsStub.checkPersistedTransactions,
				processTransactionsStub.applyTransactions
			);
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
			transactionPool.getMergedTransactionList(false, MAX_SHARED_TRANSACTIONS);
			expect(getUnconfirmedTransactionListStub).to.be.calledWithExactly(
				false,
				MAX_TRANSACTIONS_PER_BLOCK
			);
			expect(getMultisignatureTransactionListStub).to.be.calledWithExactly(
				false,
				MAX_TRANSACTIONS_PER_BLOCK
			);
			expect(getQueuedTransactionListStub).to.be.calledWithExactly(
				false,
				MAX_SHARED_TRANSACTIONS - 2
			);
		});

		it('should return transactions from all the queues', async () => {
			expect(
				transactionPool.getMergedTransactionList(false, MAX_SHARED_TRANSACTIONS)
			).to.eql(dummyTransactions);
		});
	});

	describe('addBundledTransaction', () => {
		it('should call this.pool.addTransaction with tranasction as parameter', done => {
			const addTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addTransaction')
				.returns({ isFull: false, exists: false, queueName: 'received' });
			transactionPool.addBundledTransaction(dummyTransactions[0], err => {
				expect(err).to.not.exist;
				expect(addTransactionStub).to.be.calledWithExactly(
					dummyTransactions[0]
				);
				done();
			});
		});
	});

	describe('addQueuedTransaction', () => {
		it('should call this.pool.addVerifiedTransaction with tranasction as parameter', async () => {
			const addVerifiedTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addVerifiedTransaction')
				.returns({ isFull: false, exists: false, queueName: 'verified' });
			transactionPool.addVerifiedTransaction(dummyTransactions[0], err => {
				expect(err).to.not.exist;
				expect(addVerifiedTransactionStub).to.be.calledWithExactly(
					dummyTransactions[0]
				);
			});
		});
	});

	describe('addMultisignatureTransaction', () => {
		it('should call this.pool.addMultisignatureTransaction with tranasction as parameter', async () => {
			const addMultisignatureTransactionStub = sinonSandbox
				.stub(transactionPool.pool, 'addPendingTransaction')
				.returns({ isFull: false, exists: false, queueName: 'pending' });
			transactionPool.addMultisignatureTransaction(
				dummyTransactions[0],
				err => {
					expect(err).to.not.exist;
					expect(addMultisignatureTransactionStub).to.be.calledWithExactly(
						dummyTransactions[0]
					);
				}
			);
		});
	});

	describe('processUnconfirmedTransaction', () => {
		let transaction;

		beforeEach(async () => {
			transaction = dummyTransactions[0];
		});

		it('should call the callback with error if the transaction already exists', done => {
			sinonSandbox.stub(transactionPool, 'transactionInPool').returns(true);
			transactionPool.processUnconfirmedTransaction(transaction, false, err => {
				expect(err).to.be.an('array');
				err.forEach(anErr => {
					expect(anErr.message).to.equal(
						`Transaction is already processed: ${transaction.id}`
					);
				});
				done();
			});
		});

		it('should add transaction to the received queue if the bundled property = true', done => {
			transaction.bundled = true;
			const addBundledTransactionStub = sinonSandbox
				.stub(transactionPool, 'addBundledTransaction')
				.callsArg(1);
			transactionPool.processUnconfirmedTransaction(transaction, false, () => {
				expect(addBundledTransactionStub).to.be.calledWith(transaction);
				done();
			});
		});

		it('should add transaction to the verified queue when status is OK', done => {
			const transactionsResponses = [
				{
					status: TransactionStatus.OK,
					errors: [],
				},
			];
			const addVerifiedTransactionStub = sinonSandbox
				.stub(transactionPool, 'addVerifiedTransaction')
				.callsArg(1);
			processTransactionsStub.checkPersistedTransactions.resolves({
				transactionsResponses,
			});
			processTransactionsStub.verifyTransactions.resolves({
				transactionsResponses,
			});
			processTransactionsStub.checkAllowedTransactions.resolves({
				transactionsResponses,
			});
			transactionPool.processUnconfirmedTransaction(transaction, false, () => {
				expect(addVerifiedTransactionStub).to.be.calledWith(transaction);
				done();
			});
		});

		it('should add transaction to pending when status is PENDING', done => {
			const transactionsResponses1 = [
				{
					status: TransactionStatus.OK,
					errors: [],
				},
			];
			const transactionsResponses2 = [
				{
					status: TransactionStatus.PENDING,
					errors: [],
				},
			];
			const addMultisignatureTransactionStub = sinonSandbox
				.stub(transactionPool, 'addMultisignatureTransaction')
				.callsArg(1);
			processTransactionsStub.checkPersistedTransactions.resolves({
				transactionsResponses: transactionsResponses1,
			});
			processTransactionsStub.verifyTransactions.resolves({
				transactionsResponses: transactionsResponses2,
			});
			processTransactionsStub.checkAllowedTransactions.resolves({
				transactionsResponses: transactionsResponses2,
			});
			transactionPool.processUnconfirmedTransaction(transaction, false, () => {
				expect(addMultisignatureTransactionStub).to.be.calledWith(transaction);
				done();
			});
		});

		it('should return error when when status is FAIL', done => {
			const transactionsResponses1 = [
				{
					status: TransactionStatus.OK,
					errors: [],
				},
			];
			const transactionsResponses2 = [
				{
					status: TransactionStatus.FAIL,
					errors: [new Error()],
				},
			];
			processTransactionsStub.checkPersistedTransactions.resolves({
				transactionsResponses: transactionsResponses1,
			});
			processTransactionsStub.verifyTransactions.resolves({
				transactionsResponses: transactionsResponses2,
			});
			processTransactionsStub.checkAllowedTransactions.resolves({
				transactionsResponses: transactionsResponses2,
			});
			transactionPool.processUnconfirmedTransaction(transaction, false, err => {
				expect(err).to.be.an('array');
				expect(err[0]).to.eql(transactionsResponses2[0].errors[0]);
				done();
			});
		});
	});
});
