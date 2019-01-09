import publicKeys from '../fixtures/public_keys.json';
import { expect } from 'chai';
import transactionObjects from '../fixtures/transactions.json';
import { Job } from '../src/job';
import {
	Transaction,
	TransactionPool,
	AddTransactionResult,
} from '../src/transaction_pool';
import * as checkTransactions from '../src/check_transactions';
import { wrapTransferTransaction } from './utils/add_transaction_functions';
import * as sinon from 'sinon';
import { Queue } from '../src/queue';
import * as queueCheckers from '../src/queue_checkers';

describe('transaction pool', () => {
	const expireTransactionsInterval = 1000;
	const maxTransactionsPerQueue = 1000;
	const receivedTransactionsProcessingInterval = 100;
	const receivedTransactionsLimitPerProcessing = 100;
	const validatedTransactionsProcessingInterval = 100;
	const validatedTransactionsLimitPerProcessing = 100;
	const transactions = transactionObjects.map(wrapTransferTransaction);
	const verifiedTransactionsProcessingInterval = 100;
	const verifiedTransactionsLimitPerProcessing = 100;
	const pendingTransactionsProcessingLimit = 5;

	let transactionPool: TransactionPool;

	let checkerStubs: {
		[key: string]: sinon.SinonStub;
	};

	let checkTransactionsStub: sinon.SinonStub;
	let validateTransactionsStub: sinon.SinonStub;
	let verifyTransactionsStub: sinon.SinonStub;
	let processTransactionsStub: sinon.SinonStub;

	beforeEach(async () => {
		// Stubbing start function so the jobs do not start in the background.
		sandbox.stub(Job.prototype, 'start');
		checkerStubs = {
			returnTrueUntilLimit: sandbox.stub(
				queueCheckers,
				'returnTrueUntilLimit'
			),
			checkTransactionPropertyForValues: sandbox.stub(
				queueCheckers,
				'checkTransactionPropertyForValues',
			),
			checkTransactionForSenderPublicKey: sandbox.stub(
				queueCheckers,
				'checkTransactionForSenderPublicKey',
			),
			checkTransactionForId: sandbox.stub(
				queueCheckers,
				'checkTransactionForId',
			),
			checkTransactionForRecipientId: sandbox.stub(
				queueCheckers,
				'checkTransactionForRecipientId',
			),
			checkTransactionForExpiry: sandbox.stub(
				queueCheckers,
				'checkTransactionForExpiry',
			),
		};

		checkTransactionsStub = sandbox.stub(
			checkTransactions,
			'checkTransactions',
		);
		validateTransactionsStub = sandbox.stub();
		verifyTransactionsStub = sandbox.stub();
		processTransactionsStub = sandbox.stub();

		transactionPool = new TransactionPool({
			expireTransactionsInterval,
			maxTransactionsPerQueue,
			pendingTransactionsProcessingLimit,
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
		Object.keys(transactionPool.queues).forEach(queueName => {
			sandbox
				.stub((transactionPool as any)._queues, queueName)
				.value(sinon.createStubInstance(Queue));
		});
	});

	afterEach(async () => {
		(transactionPool as any)._expireTransactionsJob.stop();
	});

	describe('#addTransactionToQueue', () => {
		const queueName = 'received';
		let existsInPoolStub: sinon.SinonStub;
		let receviedQueueSizeStub: sinon.SinonStub;
		let addTransactionToQueue: (
			queueName: string,
			transaction: Transaction,
		) => AddTransactionResult;

		beforeEach(async () => {
			existsInPoolStub = sandbox.stub(
				transactionPool,
				'existsInTransactionPool',
			);
			receviedQueueSizeStub = transactionPool.queues.received
				.size as sinon.SinonStub;
			// addTransactionToQueue is a private function, therefore removing typesafety and binding the context here.
			addTransactionToQueue = (transactionPool as any).addTransactionToQueue.bind(
				transactionPool,
			);
		});

		it('should return true for alreadyExists if transaction already exists in pool', async () => {
			existsInPoolStub.returns(true);
			expect(addTransactionToQueue(queueName, transactions[0]).alreadyExists).to
				.be.true;
		});

		it('should return false for alreadyExists if transaction does not exist in pool', async () => {
			existsInPoolStub.returns(false);
			expect(addTransactionToQueue(queueName, transactions[0]).alreadyExists).to
				.be.false;
		});

		it('should return false for isFull if queue.size is less than maxTransactionsPerQueue', async () => {
			existsInPoolStub.returns(false);
			receviedQueueSizeStub.returns(maxTransactionsPerQueue - 1);
			expect(addTransactionToQueue(queueName, transactions[0]).isFull).to.be
				.false;
		});

		it('should return true for isFull if queue.size is equal to or greater than maxTransactionsPerQueue', async () => {
			existsInPoolStub.returns(false);
			receviedQueueSizeStub.returns(maxTransactionsPerQueue);
			expect(addTransactionToQueue(queueName, transactions[0]).isFull).to.be
				.true;
		});

		it('should call enqueue for received queue if the transaction does not exist and queue is not full', async () => {
			existsInPoolStub.returns(false);
			receviedQueueSizeStub.returns(maxTransactionsPerQueue - 1);
			addTransactionToQueue(queueName, transactions[0]);
			expect(transactionPool.queues.received
				.enqueueOne as sinon.SinonStub).to.be.calledWith(transactions[0]);
		});

		it('should return false for isFull and alreadyExists if the transaction does not exist and queue is not full', async () => {
			existsInPoolStub.returns(false);
			receviedQueueSizeStub.returns(maxTransactionsPerQueue - 1);
			const addedTransactionStatus = addTransactionToQueue(
				queueName,
				transactions[0],
			);
			expect(addedTransactionStatus.isFull).to.be.false;
			expect(addedTransactionStatus.alreadyExists).to.be.false;
		});
	});

	describe('#addTransaction', () => {
		let addTransactionToQueueStub: sinon.SinonStub;

		beforeEach(async () => {
			addTransactionToQueueStub = sandbox.stub(
				transactionPool as any,
				'addTransactionToQueue',
			);
		});

		it('should call addTransactionToQueue with with correct parameters', async () => {
			transactionPool.addTransaction(transactions[0]);
			const receivedQueueName = 'received';
			expect(addTransactionToQueueStub).to.be.calledWith(
				receivedQueueName,
				transactions[0],
			);
		});
	});

	describe('#addVerifiedTransaction', () => {
		let addTransactionToQueueStub: sinon.SinonStub;

		beforeEach(async () => {
			addTransactionToQueueStub = sandbox.stub(
				transactionPool as any,
				'addTransactionToQueue',
			);
		});

		it('should call addTransactionToQueue with with correct parameters', async () => {
			transactionPool.addVerifiedTransaction(transactions[0]);
			const verifiedQueueName = 'verified';
			expect(addTransactionToQueueStub).to.be.calledWith(
				verifiedQueueName,
				transactions[0],
			);
		});
	});

	describe('getProcessableTransactions', () => {
		const limit = 10;
		let peekUntilCondition: sinon.SinonStub;

		beforeEach(async () => {
			peekUntilCondition = sandbox.stub();
			checkerStubs.returnTrueUntilLimit.returns(peekUntilCondition);
		});

		it('should call returnTrueUntilLimit conditional function with limit parameter', () => {
			transactionPool.getProcessableTransactions(limit);
			expect(checkerStubs.returnTrueUntilLimit).to.be.calledWith(limit);
		});

		it('should call peekUntil for ready queue with correct parameter', () => {
			transactionPool.getProcessableTransactions(limit);
			expect(transactionPool.queues.ready.peekUntil).to.be.calledWith(peekUntilCondition);
		});
	});

	describe('#addVerifiedRemovedTransactions', () => {
		const verifiedRemovedTransactions = [
			transactions[0],
			transactions[1],
			transactions[2],
		];

		it('should call checkTransactionForRecipientId with transactions', async () => {
			transactionPool.addVerifiedRemovedTransactions(
				verifiedRemovedTransactions,
			);
			expect(
				checkerStubs.checkTransactionForRecipientId,
			).to.be.calledWithExactly(verifiedRemovedTransactions);
		});

		it('should call removeFor for verified, pending and ready queues once', async () => {
			transactionPool.addVerifiedRemovedTransactions(
				verifiedRemovedTransactions,
			);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for verified queue with transactions', async () => {
			transactionPool.addVerifiedRemovedTransactions(
				verifiedRemovedTransactions,
			);
			expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				verifiedRemovedTransactions,
			);
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.addVerifiedRemovedTransactions(
				verifiedRemovedTransactions,
			);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});

	describe('#removeConfirmedTransactions', () => {
		const confirmedTransactions = [
			transactions[0],
			transactions[1],
			transactions[2],
		];

		it('should call checkTransactionForId with confirmed transactions', async () => {
			transactionPool.removeConfirmedTransactions(confirmedTransactions);
			expect(checkerStubs.checkTransactionForId).to.be.calledWithExactly(
				confirmedTransactions,
			);
		});

		it('should call checkTransactionForSenderPublicKey with confirmed transactions', async () => {
			transactionPool.removeConfirmedTransactions(confirmedTransactions);
			expect(
				checkerStubs.checkTransactionForSenderPublicKey,
			).to.be.calledWithExactly(confirmedTransactions);
		});

		it('should call removeFor for received and validated queues once', async () => {
			transactionPool.removeConfirmedTransactions(confirmedTransactions);
			const { received, validated } = transactionPool.queues;
			expect(received.removeFor).to.be.calledOnce;
			expect(validated.removeFor).to.be.calledOnce;
		});

		it('should call removeFor for pending, verified and ready queues thrice', async () => {
			transactionPool.removeConfirmedTransactions(confirmedTransactions);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledThrice;
			expect(verified.removeFor).to.be.calledThrice;
			expect(ready.removeFor).to.be.calledThrice;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.removeConfirmedTransactions(removedTransactions);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith([
				...removedTransactions,
				...removedTransactions,
			]);
		});
	});

	describe('#reverifyTransactionsFromSenders', () => {
		it('should call checkTransactionForProperty with publicKeys and "senderPublicKey" property', async () => {
			transactionPool.reverifyTransactionsFromSenders(publicKeys);
			const senderProperty = 'senderPublicKey';
			expect(
				checkerStubs.checkTransactionPropertyForValues.calledWithExactly(
					publicKeys,
					senderProperty,
				),
			).to.equal(true);
		});

		it('should call removeFor for pending, verified and ready queues once', async () => {
			transactionPool.reverifyTransactionsFromSenders(publicKeys);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.reverifyTransactionsFromSenders(publicKeys);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});

	describe('#expireTransactions', () => {
		let removeTransactionsFromQueuesStub: sinon.SinonStub;
		let expireTransactions: () => Promise<ReadonlyArray<Transaction>>;

		beforeEach(async () => {
			removeTransactionsFromQueuesStub = sandbox.stub(
				transactionPool as any,
				'removeTransactionsFromQueues',
			);
			expireTransactions = (transactionPool as any)['expireTransactions'].bind(
				transactionPool,
			);
		});

		it('should call removeTransactionsFromQueues once', async () => {
			await expireTransactions();
			expect(removeTransactionsFromQueuesStub).to.be.calledOnce;
		});
	});

	describe('#processVerifiedTransactions', () => {
		const processableTransactionsInVerifiedQueue = transactions.slice(0, 1);
		const unprocesableTransactionsInVerifiedQueue = transactions.slice(1, 2);
		const transactionsInVerifiedQueue = [
			...processableTransactionsInVerifiedQueue,
			...unprocesableTransactionsInVerifiedQueue,
		];
		const processableTransactionsInPendingQueue = transactions.slice(2, 3);
		const unprocessableTransactionsInPendingQueue = transactions.slice(3, 4);
		const unprocessableUnsignedTransactionsInPendingQueue = transactions.slice(
			4,
			5,
		);
		const transactionsInPendingQueue = [
			...processableTransactionsInPendingQueue,
			...unprocessableTransactionsInPendingQueue,
			...unprocessableUnsignedTransactionsInPendingQueue,
		];
		const signedTransactionsInPendingQueue = [
			...processableTransactionsInPendingQueue,
			...unprocessableTransactionsInPendingQueue,
		];
		const processableTransactionsInReadyQueue = transactions.slice(5, 6);
		const unprocessableTransactionsInReadyQueue = transactions.slice(6, 7);
		const transactionsInReadyQueue = [
			...processableTransactionsInReadyQueue,
			...unprocessableTransactionsInReadyQueue,
		];
		const processableTransactions = [
			...processableTransactionsInReadyQueue,
			...processableTransactionsInPendingQueue,
			...processableTransactionsInVerifiedQueue,
		];
		const unprocessableTransactions = [
			...unprocessableTransactionsInReadyQueue,
			...unprocessableTransactionsInPendingQueue,
			...unprocesableTransactionsInVerifiedQueue,
		];
		const transactionsToProcess = [
			...transactionsInReadyQueue,
			...signedTransactionsInPendingQueue,
			...transactionsInVerifiedQueue,
		];

		let processVerifiedTransactions: () => Promise<
			checkTransactions.CheckTransactionsResponse
		>;

		// Dummy functions to check used for assertions in tests
		const checkForTransactionUnprocessableTransactionId = sandbox.stub();
		const checkForTransactionProcessableTransactionId = sandbox.stub();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponse = {
			passedTransactions: processableTransactions,
			failedTransactions: unprocessableTransactions,
		};

		beforeEach(async () => {
			(transactionPool.queues.ready.size as sinon.SinonStub).returns(
				transactionsInReadyQueue.length,
			);
			(transactionPool.queues.verified.size as sinon.SinonStub).returns(
				transactionsInVerifiedQueue.length,
			);
			(transactionPool.queues.pending.size as sinon.SinonStub).returns(
				transactionsInPendingQueue.length,
			);
			(transactionPool.queues.verified.peekUntil as sinon.SinonStub).returns(
				transactionsInVerifiedQueue,
			);
			(transactionPool.queues.pending.peekUntil as sinon.SinonStub).returns(
				transactionsInPendingQueue,
			);
			(transactionPool.queues.ready.peekUntil as sinon.SinonStub).returns(
				transactionsInReadyQueue,
			);

			(transactionPool.queues.pending.filter as sinon.SinonStub).returns(
				signedTransactionsInPendingQueue,
			);
			processVerifiedTransactions = (transactionPool as any)[
				'processVerifiedTransactions'
			].bind(transactionPool);
			checkTransactionsStub.resolves(checkTransactionsResponse);
		});

		it('should not call checkTransactions if the size of the ready queue is bigger than verifiedTransactionsLimitPerProcessing', async () => {
			(transactionPool.queues.ready.size as sinon.SinonStub).returns(
				verifiedTransactionsLimitPerProcessing + 1,
			);
			await processVerifiedTransactions();
			expect(checkTransactionsStub).to.not.be.called;
		});

		it('should not call checkTransactions if verified and pending queues are empty', async () => {
			(transactionPool.queues.verified.size as sinon.SinonStub).returns(0);
			(transactionPool.queues.pending.sizeBy as sinon.SinonStub).returns(0);
			await processVerifiedTransactions();
			expect(checkTransactionsStub).to.not.be.called;
		});

		it('should return empty passedTransactions, failedTransactions arrays if checkTransactions is not called', async () => {
			(transactionPool.queues.ready.size as sinon.SinonStub).returns(
				verifiedTransactionsLimitPerProcessing + 1,
			);
			const {
				passedTransactions,
				failedTransactions,
			} = await processVerifiedTransactions();
			expect(passedTransactions).to.deep.equal([]);
			expect(failedTransactions).to.deep.equal([]);
		});

		it('should remove unprocessable transactions from the verified, pending and ready queues', async () => {
			checkerStubs.checkTransactionForId
				.onCall(0)
				.returns(checkForTransactionUnprocessableTransactionId);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(0)).to.be.calledWith(
				unprocessableTransactions,
			);
			expect(
				(transactionPool.queues.verified.removeFor as sinon.SinonStub).getCall(
					0,
				),
			).to.be.calledWith(checkForTransactionUnprocessableTransactionId);

			expect(
				(transactionPool.queues.pending.removeFor as sinon.SinonStub).getCall(
					0,
				),
			).to.be.calledWith(checkForTransactionUnprocessableTransactionId);

			expect(
				(transactionPool.queues.ready.removeFor as sinon.SinonStub).getCall(0),
			).to.be.calledWith(checkForTransactionUnprocessableTransactionId);
		});

		it('should call checkTransactions with transactions and processTransactionsStub', async () => {
			await processVerifiedTransactions();
			expect(checkTransactionsStub.getCall(0)).to.be.calledWith(
				transactionsToProcess,
				processTransactionsStub,
			);
		});

		it('should move processable transactions to the ready queue', async () => {
			checkerStubs.checkTransactionForId
				.onCall(1)
				.returns(checkForTransactionProcessableTransactionId);
			checkerStubs.checkTransactionForId
				.onCall(2)
				.returns(checkForTransactionProcessableTransactionId);
			checkerStubs.checkTransactionForId
				.onCall(3)
				.returns(checkForTransactionProcessableTransactionId);
			(transactionPool.queues.verified.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(processableTransactions);
			(transactionPool.queues.pending.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(processableTransactions);
			(transactionPool.queues.ready.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(processableTransactions);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(1)).to.be.calledWith(
				processableTransactions,
			);
			expect(checkerStubs.checkTransactionForId.getCall(2)).to.be.calledWith(
				processableTransactions,
			);
			expect(checkerStubs.checkTransactionForId.getCall(3)).to.be.calledWith(
				processableTransactions,
			);
			expect(
				(transactionPool.queues.verified.removeFor as sinon.SinonStub).getCall(
					1,
				),
			).to.be.calledWith(checkForTransactionProcessableTransactionId);
			expect(
				(transactionPool.queues.pending.removeFor as sinon.SinonStub).getCall(
					1,
				),
			).to.be.calledWith(checkForTransactionProcessableTransactionId);
			expect(
				(transactionPool.queues.ready.removeFor as sinon.SinonStub).getCall(1),
			).to.be.calledWith(checkForTransactionProcessableTransactionId);
			expect(transactionPool.queues.ready.enqueueMany).to.be.calledWith(
				processableTransactions,
			);
		});

		it('should not move processable transactions to the ready queue which no longer exist in the ready or verified queue', async () => {
			const processableTransactionsExistingInVerifiedQueue = processableTransactions.slice(
				1,
			);
			(transactionPool.queues.verified.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(processableTransactionsExistingInVerifiedQueue);
			await processVerifiedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(3)).to.be.calledWith(
				processableTransactions,
			);
			expect(transactionPool.queues.ready.enqueueMany).to.be.calledWith(
				processableTransactionsExistingInVerifiedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			expect(await processVerifiedTransactions()).to.deep.equal(
				checkTransactionsResponse,
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
		const checkForTransactionInvalidTransactionId = sandbox.stub();
		const checkForTransactionValidTransactionId = sandbox.stub();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponse = {
			passedTransactions: validTransactions,
			failedTransactions: invalidTransactions,
		};
		let validateReceivedTransactions: () => Promise<
			checkTransactions.CheckTransactionsResponse
		>;

		beforeEach(async () => {
			(transactionPool.queues.received.peekUntil as sinon.SinonStub).returns(
				transactionsToValidate,
			);
			validateReceivedTransactions = (transactionPool as any)[
				'validateReceivedTransactions'
			].bind(transactionPool);
			checkTransactionsStub.resolves(checkTransactionsResponse);
		});

		it('should remove invalid transactions from the received queue', async () => {
			checkerStubs.checkTransactionForId
				.onCall(0)
				.returns(checkForTransactionInvalidTransactionId);
			await validateReceivedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(0)).to.be.calledWith(
				invalidTransactions,
			);
			expect(
				(transactionPool.queues.received.removeFor as sinon.SinonStub).getCall(
					0,
				),
			).to.be.calledWith(checkForTransactionInvalidTransactionId);
		});

		it('should call checkTransactions with transactions and validateTransactionsStub', async () => {
			await validateReceivedTransactions();
			expect(checkTransactionsStub).to.be.calledOnceWith(
				transactionsToValidate,
				validateTransactionsStub,
			);
		});

		it('should move valid transactions to the validated queue', async () => {
			checkerStubs.checkTransactionForId
				.onCall(1)
				.returns(checkForTransactionValidTransactionId);
			(transactionPool.queues.received.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(validTransactions);
			await validateReceivedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(1)).to.be.calledWith(
				validTransactions,
			);
			expect(transactionPool.queues.received
				.removeFor as sinon.SinonStub).to.be.calledWith(
				checkForTransactionValidTransactionId,
			);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				validTransactions,
			);
		});

		it('should not move valid transactions to the validated queue which no longer exist in the received queue', async () => {
			const validTransactionsExistingInReceivedQueue = validTransactions.slice(
				1,
			);
			(transactionPool.queues.received.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(validTransactionsExistingInReceivedQueue);
			await validateReceivedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(1)).to.be.calledWith(
				validTransactions,
			);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				validTransactionsExistingInReceivedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			expect(await validateReceivedTransactions()).to.deep.equal(
				checkTransactionsResponse,
			);
		});
	});

	describe('#verifyValidatedTransactions', () => {
		const verifiableTransactions = transactions.slice(0, 2);
		const unverifiableTransactions = transactions.slice(2, 5);
		const transactionsToVerify = [
			...verifiableTransactions,
			...unverifiableTransactions,
		];
		// Dummy functions to check used for assertions in tests
		const checkForTransactionUnverifiableTransactionId = sandbox.stub();
		const checkForTransactionVerifiableTransactionId = sandbox.stub();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponse = {
			passedTransactions: verifiableTransactions,
			failedTransactions: unverifiableTransactions,
		};
		let verifyValidatedTransactions: () => Promise<
			checkTransactions.CheckTransactionsResponse
		>;

		beforeEach(async () => {
			(transactionPool.queues.validated.peekUntil as sinon.SinonStub).returns(
				transactionsToVerify,
			);
			verifyValidatedTransactions = (transactionPool as any)[
				'verifyValidatedTransactions'
			].bind(transactionPool);
			checkTransactionsStub.resolves(checkTransactionsResponse);
		});

		it('should remove unverifiable transactions from the validated queue', async () => {
			checkerStubs.checkTransactionForId
				.onCall(0)
				.returns(checkForTransactionUnverifiableTransactionId);
			await verifyValidatedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(0)).to.be.calledWith(
				unverifiableTransactions,
			);
			expect(
				(transactionPool.queues.validated.removeFor as sinon.SinonStub).getCall(
					0,
				),
			).to.be.calledWith(checkForTransactionUnverifiableTransactionId);
		});

		it('should call checkTransactions with transactions and verifyTransactionsStub', async () => {
			await verifyValidatedTransactions();
			expect(checkTransactionsStub).to.be.calledOnceWith(
				transactionsToVerify,
				verifyTransactionsStub,
			);
		});

		it('should move verified transactions to the verified queue', async () => {
			checkerStubs.checkTransactionForId
				.onCall(1)
				.returns(checkForTransactionVerifiableTransactionId);
			(transactionPool.queues.validated.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(verifiableTransactions);
			await verifyValidatedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(1)).to.be.calledWith(
				verifiableTransactions,
			);
			expect(transactionPool.queues.validated
				.removeFor as sinon.SinonStub).to.be.calledWith(
				checkForTransactionVerifiableTransactionId,
			);
			expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				verifiableTransactions,
			);
		});

		it('should not move verified transactions to the verified queue which no longer exist in the validated queue', async () => {
			const verifiableTransactionsExistingInValidatedQueue = verifiableTransactions.slice(
				1,
			);
			(transactionPool.queues.validated.removeFor as sinon.SinonStub)
				.onCall(1)
				.returns(verifiableTransactionsExistingInValidatedQueue);
			await verifyValidatedTransactions();
			expect(checkerStubs.checkTransactionForId.getCall(1)).to.be.calledWith(
				verifiableTransactions,
			);
			expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				verifiableTransactionsExistingInValidatedQueue,
			);
		});

		it('should return passed and failed transactions', async () => {
			expect(await verifyValidatedTransactions()).to.deep.equal(
				checkTransactionsResponse,
			);
		});
	});
});
