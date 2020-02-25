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
 *
 */
import * as transactionObjects from '../../fixtures/transactions.json';
import { Job } from '../../src/job';
import { Transaction, TransactionPool } from '../../src/transaction_pool';
import * as checkTransactions from '../../src/check_transactions';
import { wrapTransaction } from '../utils/add_transaction_functions';
import * as queueCheckers from '../../src/queue_checkers';
import { Status } from '../../../lisk-transactions/dist-node/index.js';

describe('transaction pool', () => {
	const expireTransactionsInterval = 1000;
	const maxTransactionsPerQueue = 1000;
	const receivedTransactionsProcessingInterval = 100;
	const receivedTransactionsLimitPerProcessing = 100;
	const validatedTransactionsProcessingInterval = 100;
	const validatedTransactionsLimitPerProcessing = 100;
	const transactions = transactionObjects.map(wrapTransaction);
	const verifiedTransactionsProcessingInterval = 100;
	const verifiedTransactionsLimitPerProcessing = 100;

	let transactionPool: TransactionPool;

	let checkerStubs: {
		[key: string]: any;
	};

	let checkTransactionsWithPassAndFailStub: any;
	let validateTransactionsStub: any;
	let verifyTransactionsStub: any;
	let processTransactionsStub: any;

	beforeEach(async () => {
		// Stubbing start function so the jobs do not start in the background.
		jest.spyOn(Job.prototype, 'start');
		checkerStubs = {
			returnTrueUntilLimit: jest.spyOn(
				queueCheckers as any,
				'returnTrueUntilLimit',
			),
			checkTransactionPropertyForValues: jest.spyOn(
				queueCheckers as any,
				'checkTransactionPropertyForValues',
			),
			checkTransactionForSenderPublicKey: jest.spyOn(
				queueCheckers as any,
				'checkTransactionForSenderPublicKey',
			),
			checkTransactionForId: jest.spyOn(
				queueCheckers as any,
				'checkTransactionForId',
			),
			checkTransactionForRecipientId: jest.spyOn(
				queueCheckers as any,
				'checkTransactionForSenderIdWithRecipientIds',
			),
			checkTransactionForExpiry: jest.spyOn(
				queueCheckers as any,
				'checkTransactionForExpiry',
			),
		};

		checkTransactionsWithPassAndFailStub = jest.spyOn(
			checkTransactions as any,
			'checkTransactionsWithPassAndFail',
		);
		validateTransactionsStub = jest.fn().mockReturnValue({
			transactionsResponses: [
				{
					errors: [],
					id: '',
					status: Status.OK,
				},
			],
		});
		verifyTransactionsStub = jest.fn();
		processTransactionsStub = jest.fn();

		transactionPool = new TransactionPool({
			expireTransactionsInterval,
			maxTransactionsPerQueue,
			receivedTransactionsProcessingInterval,
			receivedTransactionsLimitPerProcessing,
			validateTransactions: validateTransactionsStub,
			validatedTransactionsProcessingInterval,
			validatedTransactionsLimitPerProcessing,
			verifyTransactions: verifyTransactionsStub,
			verifiedTransactionsLimitPerProcessing,
			verifiedTransactionsProcessingInterval,
			processTransactions: processTransactionsStub,
		});

		// Stub queues
		Object.keys(transactionPool.queues).forEach((queueName: string) => {
			jest.spyOn((transactionPool as any)._queues[queueName], 'dequeueUntil');
			jest.spyOn((transactionPool as any)._queues[queueName], 'enqueueMany');
			jest.spyOn((transactionPool as any)._queues[queueName], 'enqueueOne');
			jest.spyOn((transactionPool as any)._queues[queueName], 'exists');
			jest.spyOn((transactionPool as any)._queues[queueName], 'filter');
			jest.spyOn((transactionPool as any)._queues[queueName], 'peekUntil');
			jest.spyOn((transactionPool as any)._queues[queueName], 'removeFor');
			jest.spyOn((transactionPool as any)._queues[queueName], 'size');
			jest.spyOn((transactionPool as any)._queues[queueName], 'sizeBy');
		});
	});

	describe('#addTransactionToQueue', () => {
		const queueName = 'received';
		let existsInPoolStub: any;
		let receivedQueueSizeStub: any;

		beforeEach(async () => {
			existsInPoolStub = jest.spyOn(
				transactionPool as any,
				'existsInTransactionPool',
			);
			receivedQueueSizeStub = jest.fn();
		});

		it('should return true for alreadyExists if transaction already exists in pool', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(true);

			// Assert
			expect(
				(transactionPool as any).addTransactionToQueue(
					queueName,
					transactions[0],
				).alreadyExists,
			).toBe(true);
		});

		it('should return false for alreadyExists if transaction does not exist in pool', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(false);

			// Assert
			expect(
				(transactionPool as any).addTransactionToQueue(
					queueName,
					transactions[0],
				).alreadyExists,
			).toBe(false);
		});

		it('should return false for isFull if queue.size is less than maxTransactionsPerQueue', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(false);
			receivedQueueSizeStub.mockReturnValue(maxTransactionsPerQueue - 1);

			// Assert
			expect(
				(transactionPool as any).addTransactionToQueue(
					queueName,
					transactions[0],
				).isFull,
			).toBe(false);
		});

		it('should return true for isFull if queue.size is equal to or greater than maxTransactionsPerQueue', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(false);
			receivedQueueSizeStub.mockReturnValue(maxTransactionsPerQueue);
			(transactionPool.queues[queueName] as any).size.mockReturnValue(1000);

			// Assert
			expect(
				(transactionPool as any).addTransactionToQueue(
					queueName,
					transactions[0],
				).isFull,
			).toBe(true);
		});

		it('should call enqueue for received queue if the transaction does not exist and queue is not full', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(false);
			receivedQueueSizeStub.mockReturnValue(maxTransactionsPerQueue - 1);

			// Assert
			(transactionPool as any).addTransactionToQueue(
				queueName,
				transactions[0],
			);
			expect(transactionPool.queues.received.enqueueOne as any).toBeCalledWith(
				transactions[0],
			);
		});

		it('should return false for isFull and alreadyExists if the transaction does not exist and queue is not full', async () => {
			// Arrange
			existsInPoolStub.mockReturnValue(false);
			receivedQueueSizeStub.mockReturnValue(maxTransactionsPerQueue - 1);
			const addedTransactionStatus = (transactionPool as any).addTransactionToQueue(
				queueName,
				transactions[0],
			);

			// Assert
			expect(addedTransactionStatus.isFull).toBe(false);
			expect(addedTransactionStatus.alreadyExists).toBe(false);
		});
	});

	describe('#addTransaction', () => {
		let addTransactionToQueueStub: any;

		beforeEach(async () => {
			addTransactionToQueueStub = jest.spyOn(
				transactionPool as any,
				'addTransactionToQueue',
			);
		});

		it('should call addTransactionToQueue with with correct parameters', async () => {
			transactionPool.addTransaction(transactions[0]);
			const receivedQueueName = 'received';
			expect(addTransactionToQueueStub).toBeCalledWith(
				receivedQueueName,
				transactions[0],
			);
		});
	});

	describe('#addVerifiedTransaction', () => {
		let addTransactionToQueueStub: any;

		beforeEach(async () => {
			addTransactionToQueueStub = jest.spyOn(
				transactionPool as any,
				'addTransactionToQueue',
			);
		});

		it('should call addTransactionToQueue with with correct parameters', async () => {
			transactionPool.addVerifiedTransaction(transactions[0]);
			const verifiedQueueName = 'verified';
			expect(addTransactionToQueueStub).toBeCalledWith(
				verifiedQueueName,
				transactions[0],
			);
		});
	});

	describe('getProcessableTransactions', () => {
		const limit = 10;
		let peekUntilCondition: any;

		beforeEach(async () => {
			peekUntilCondition = jest.fn();
			checkerStubs.returnTrueUntilLimit.mockReturnValue(peekUntilCondition);
		});

		it('should call returnTrueUntilLimit conditional function with limit parameter', () => {
			transactionPool.getProcessableTransactions(limit);
			expect(checkerStubs.returnTrueUntilLimit).toBeCalledWith(limit);
		});

		it('should call peekUntil for ready queue with correct parameter', () => {
			transactionPool.getProcessableTransactions(limit);
			expect(transactionPool.queues.ready.peekUntil).toBeCalledWith(
				peekUntilCondition,
			);
		});
	});

	describe('#expireTransactions', () => {
		let removeTransactionsFromQueuesStub: any;
		let expireTransactions: () => Promise<ReadonlyArray<Transaction>>;

		beforeEach(async () => {
			removeTransactionsFromQueuesStub = jest.spyOn(
				transactionPool as any,
				'removeTransactionsFromQueues',
			);
			expireTransactions = (transactionPool as any)['expireTransactions'].bind(
				transactionPool,
			);
		});

		it('should call removeTransactionsFromQueues once', async () => {
			await expireTransactions();
			expect(removeTransactionsFromQueuesStub).toBeCalledTimes(1);
		});
	});

	describe('#processVerifiedTransactions', () => {
		const processableTransactionsInVerifiedQueue = transactions.slice(0, 1);
		const unprocesableTransactionsInVerifiedQueue = transactions.slice(1, 2);
		const transactionsInVerifiedQueue = [
			...processableTransactionsInVerifiedQueue,
			...unprocesableTransactionsInVerifiedQueue,
		];
		const unprocessableTransactionsInPendingQueue = transactions.slice(3, 4);

		const processableTransactionsInReadyQueue = transactions.slice(5, 6);
		const unprocessableTransactionsInReadyQueue = transactions.slice(6, 7);
		const transactionsInReadyQueue = [
			...processableTransactionsInReadyQueue,
			...unprocessableTransactionsInReadyQueue,
		];
		const processableTransactions = [
			...processableTransactionsInReadyQueue,
			...processableTransactionsInVerifiedQueue,
		];
		const unprocessableTransactions = [
			...unprocessableTransactionsInReadyQueue,
			...unprocessableTransactionsInPendingQueue,
			...unprocesableTransactionsInVerifiedQueue,
		];
		const transactionsToProcess = [
			...transactionsInReadyQueue,
			...transactionsInVerifiedQueue,
		];

		let processVerifiedTransactions: () => Promise<
			checkTransactions.CheckTransactionsResponseWithPassAndFail
		>;

		// Dummy functions to check used for assertions in tests
		const checkForTransactionUnprocessableTransactionId = jest.fn();
		const checkForTransactionProcessableTransactionId = jest.fn();

		const checkTransactionsResponseWithFailedTransactions: checkTransactions.CheckTransactionsResponseWithPassAndFail = {
			passedTransactions: processableTransactions,
			failedTransactions: unprocessableTransactions,
		};

		const checkTransactionsResponseWithOnlyPassedTransactions: checkTransactions.CheckTransactionsResponseWithPassAndFail = {
			passedTransactions: processableTransactions,
			failedTransactions: [],
		};

		beforeEach(async () => {
			(transactionPool.queues.ready.size as any).mockReturnValue(
				transactionsInReadyQueue.length,
			);
			(transactionPool.queues.verified.size as any).mockReturnValue(
				transactionsInVerifiedQueue.length,
			);
			(transactionPool.queues.verified.peekUntil as any).mockReturnValue(
				transactionsInVerifiedQueue,
			);
			(transactionPool.queues.ready.peekUntil as any).mockReturnValue(
				transactionsInReadyQueue,
			);

			processVerifiedTransactions = (transactionPool as any)[
				'processVerifiedTransactions'
			].bind(transactionPool);
		});

		it('should not call checkTransactionsWithPassAndFail if the size of the ready queue is bigger than verifiedTransactionsLimitPerProcessing', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithOnlyPassedTransactions,
			);
			(transactionPool.queues.ready.size as any).mockReturnValue(
				verifiedTransactionsLimitPerProcessing + 1,
			);
			await processVerifiedTransactions();
			expect(checkTransactionsWithPassAndFailStub).not.toBeCalled;
		});

		it('should not call checkTransactionsWithPassAndFail if verified queue is empty', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithOnlyPassedTransactions,
			);
			(transactionPool.queues.verified.size as any).mockReturnValue(0);
			await processVerifiedTransactions();
			expect(checkTransactionsWithPassAndFailStub).not.toBeCalled;
		});

		it('should return empty passedTransactions, failedTransactions arrays if checkTransactionsWithPassAndFail is not called', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithOnlyPassedTransactions,
			);
			(transactionPool.queues.ready.size as any).mockReturnValue(
				verifiedTransactionsLimitPerProcessing + 1,
			);
			const {
				passedTransactions,
				failedTransactions,
			} = await processVerifiedTransactions();
			expect(passedTransactions).toEqual([]);
			expect(failedTransactions).toEqual([]);
		});

		it('should remove unprocessable transactions from the verified and ready queues', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithFailedTransactions,
			);
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionUnprocessableTransactionId,
			);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				unprocessableTransactions,
			);
			expect(transactionPool.queues.verified.removeFor as any).toBeCalledWith(
				checkForTransactionUnprocessableTransactionId,
			);

			expect(transactionPool.queues.ready.removeFor as any).toBeCalledWith(
				checkForTransactionUnprocessableTransactionId,
			);
		});

		it('should call checkTransactionsWithPassAndFail with transactions and processTransactionsStub', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithOnlyPassedTransactions,
			);
			await processVerifiedTransactions();
			expect(checkTransactionsWithPassAndFailStub).toBeCalledWith(
				transactionsToProcess,
				processTransactionsStub,
			);
		});

		it('should move passed transactions to the ready queue', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithFailedTransactions,
			);
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionProcessableTransactionId,
			);
			(transactionPool.queues.verified.removeFor as any).mockReturnValue(
				processableTransactions,
			);
			(transactionPool.queues.ready.removeFor as any).mockReturnValue(
				processableTransactions,
			);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				processableTransactions,
			);
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				processableTransactions,
			);
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				processableTransactions,
			);
			expect(transactionPool.queues.verified.removeFor).toBeCalledWith(
				checkForTransactionProcessableTransactionId,
			);
			expect(transactionPool.queues.ready.removeFor).toBeCalledWith(
				checkForTransactionProcessableTransactionId,
			);
			expect(transactionPool.queues.ready.enqueueMany).toBeCalledWith(
				processableTransactions,
			);
		});

		it('should not move processable transactions to the ready queue which no longer exist in the ready or verified queue', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithOnlyPassedTransactions,
			);
			const processableTransactionsExistingInVerifiedQueue = processableTransactions.slice(
				1,
			);
			(transactionPool.queues.verified.removeFor as any).mockReturnValue(
				processableTransactionsExistingInVerifiedQueue,
			);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				processableTransactions,
			);
			expect(transactionPool.queues.ready.enqueueMany).toBeCalledWith(
				processableTransactionsExistingInVerifiedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponseWithFailedTransactions,
			);
			expect(await processVerifiedTransactions()).toEqual(
				checkTransactionsResponseWithFailedTransactions,
			);
		});
	});

	describe('#validateReceivedTransactions', () => {
		const validTransactions = transactions.slice(0, 2);
		const invalidTransactions = transactions.slice(2, 5);
		const transactionsToValidate = [
			...validTransactions,
			...invalidTransactions,
		];
		// Dummy functions to check used for assertions in tests
		const checkForTransactionInvalidTransactionId = jest.fn();
		const checkForTransactionValidTransactionId = jest.fn();

		beforeEach(async () => {
			(transactionPool.queues.received.peekUntil as any).mockReturnValue(
				transactionsToValidate,
			);

			// Skip received queue size check
			(transactionPool.queues.received.size as any).mockReturnValue(1);
		});

		it('should remove invalid transactions from the received queue', async () => {
			// Arrange
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionInvalidTransactionId,
			);

			validateTransactionsStub.mockReturnValue({
				transactionsResponses: [
					{
						errors: [],
						id: invalidTransactions[0].id, //'11745161032885507025',
						status: Status.FAIL,
					},
					{
						errors: [],
						id: invalidTransactions[1].id,
						status: Status.FAIL,
					},
					{
						errors: [],
						id: invalidTransactions[2].id,
						status: Status.FAIL,
					},
				],
			});

			// Act
			await (transactionPool as any).validateReceivedTransactions();

			// Assert
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				invalidTransactions,
			);
			expect(transactionPool.queues.received.removeFor as any).toBeCalledWith(
				checkForTransactionInvalidTransactionId,
			);
		});

		it('should call checkTransactionsWithPassAndFail with transactions and validateTransactionsStub', async () => {
			// Act
			await (transactionPool as any).validateReceivedTransactions();

			// Assert
			expect(checkTransactionsWithPassAndFailStub).toBeCalledTimes(1);
			expect(checkTransactionsWithPassAndFailStub).toBeCalledWith(
				transactionsToValidate,
				validateTransactionsStub,
			);
		});

		it('should move valid transactions to the validated queue', async () => {
			// Arrange
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionValidTransactionId,
			);
			(transactionPool.queues.received.removeFor as any).mockReturnValue(
				validTransactions,
			);

			validateTransactionsStub.mockReturnValue({
				transactionsResponses: [
					{
						errors: [],
						id: validTransactions[0].id,
						status: Status.OK,
					},
					{
						errors: [],
						id: validTransactions[1].id,
						status: Status.OK,
					},
				],
			});

			// Act
			await (transactionPool as any).validateReceivedTransactions();

			// Assert
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				validTransactions,
			);
			expect(transactionPool.queues.received.removeFor as any).toBeCalledWith(
				checkForTransactionValidTransactionId,
			);
			expect(transactionPool.queues.validated.enqueueMany).toBeCalledWith(
				validTransactions,
			);
		});

		it('should not move valid transactions to the validated queue which no longer exist in the received queue', async () => {
			// Arrange
			const validTransactionsExistingInReceivedQueue = validTransactions.slice(
				1,
			);
			(transactionPool.queues.received.removeFor as any).mockReturnValue(
				validTransactionsExistingInReceivedQueue,
			);
			validateTransactionsStub.mockReturnValue({
				transactionsResponses: [
					{
						errors: [],
						id: validTransactions[0].id,
						status: Status.OK,
					},
					{
						errors: [],
						id: validTransactions[1].id,
						status: Status.OK,
					},
				],
			});

			// Act
			await (transactionPool as any).validateReceivedTransactions();

			// Assert
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				validTransactions,
			);
			expect(transactionPool.queues.validated.enqueueMany).toBeCalledWith(
				validTransactionsExistingInReceivedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			expect(
				await (transactionPool as any).validateReceivedTransactions(),
			).toMatchObject({
				failedTransactions: [],
				passedTransactions: [],
			});
		});
	});

	describe('#verifyValidatedTransactions', () => {
		const verifiableTransactions = transactions.slice(0, 2);
		const unverifiableTransactions = transactions.slice(2, 4);
		const transactionsToVerify = [
			...verifiableTransactions,
			...unverifiableTransactions,
		];
		// Dummy functions to check used for assertions in tests
		const checkForTransactionUnverifiableTransactionId = jest.fn();
		const checkForTransactionVerifiableTransactionId = jest.fn();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponseWithPassAndFail = {
			passedTransactions: verifiableTransactions,
			failedTransactions: unverifiableTransactions,
		};

		beforeEach(async () => {
			(transactionPool.queues.validated.peekUntil as any).mockReturnValue(
				transactionsToVerify,
			);

			checkTransactionsWithPassAndFailStub.mockResolvedValue(
				checkTransactionsResponse,
			);

			// Skip received queue size check
			(transactionPool.queues.validated.size as any).mockReturnValue(1);
		});

		it('should remove unverifiable transactions from the validated queue', async () => {
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionUnverifiableTransactionId,
			);

			await (transactionPool as any).verifyValidatedTransactions();

			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				unverifiableTransactions,
			);
			expect(transactionPool.queues.validated.removeFor as any).toBeCalledWith(
				checkForTransactionUnverifiableTransactionId,
			);
		});

		it('should call checkTransactionsWithPassAndFailStub with transactions and verifyTransactionsStub', async () => {
			await (transactionPool as any).verifyValidatedTransactions();
			expect(checkTransactionsWithPassAndFailStub).toBeCalledTimes(1);

			expect(checkTransactionsWithPassAndFailStub).toBeCalledWith(
				transactionsToVerify,
				verifyTransactionsStub,
			);
		});

		it('should move verified transactions to the verified queue', async () => {
			checkerStubs.checkTransactionForId.mockReturnValue(
				checkForTransactionVerifiableTransactionId,
			);
			(transactionPool.queues.validated.removeFor as any).mockReturnValue(
				verifiableTransactions,
			);
			await (transactionPool as any).verifyValidatedTransactions();
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				verifiableTransactions,
			);
			expect(transactionPool.queues.validated.removeFor as any).toBeCalledWith(
				checkForTransactionVerifiableTransactionId,
			);
			expect(transactionPool.queues.verified.enqueueMany).toBeCalledWith(
				verifiableTransactions,
			);
		});

		it('should not move verified transactions to the verified queue which no longer exist in the validated queue', async () => {
			const verifiableTransactionsExistingInValidatedQueue = verifiableTransactions.slice(
				1,
			);
			(transactionPool.queues.validated.removeFor as any).mockReturnValue(
				verifiableTransactionsExistingInValidatedQueue,
			);
			await (transactionPool as any).verifyValidatedTransactions();
			expect(checkerStubs.checkTransactionForId).toBeCalledWith(
				verifiableTransactions,
			);
			expect(transactionPool.queues.verified.enqueueMany).toBeCalledWith(
				verifiableTransactionsExistingInValidatedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			expect(
				await (transactionPool as any).verifyValidatedTransactions(),
			).toEqual(checkTransactionsResponse);
		});
	});
});
