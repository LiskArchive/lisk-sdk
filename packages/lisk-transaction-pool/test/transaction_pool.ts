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

	let transactionPool: TransactionPool;
	const transactions = transactionObjects.map(wrapTransferTransaction);

	let checkerStubs: {
		[key: string]: sinon.SinonStub;
	};

	let checkTransactionsStub: sinon.SinonStub;
	let validateTransactionsStub: sinon.SinonStub;
	let verifyTransactionsStub: sinon.SinonStub;

	beforeEach(async () => {
		// Stubbing start function so the jobs do not start in the background.
		sandbox.stub(Job.prototype, 'start');
		checkerStubs = {
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

		transactionPool = new TransactionPool({
			expireTransactionsInterval,
			maxTransactionsPerQueue,
			receivedTransactionsProcessingInterval,
			receivedTransactionsLimitPerProcessing,
			validatedTransactionsProcessingInterval,
			validatedTransactionsLimitPerProcessing,
			validateTransactions: validateTransactionsStub,
			verifyTransactions: verifyTransactionsStub,
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
		let existsInPoolStub: sinon.SinonStub;
		let receviedQueueSizeStub: sinon.SinonStub;
		let addTransactionToQueue: (
			queueName: string,
			transaction: Transaction,
		) => AddTransactionResult;
		const queueName = 'received';

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

	describe('getProcessableTransactions', () => {});
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

	describe('#validateReceivedTransactions', () => {
		const validTransactions = transactions.slice(0, 2);
		const invalidTransactions = transactions.slice(2, 5);
		const transactionsToValidate = [
			...validTransactions,
			...invalidTransactions,
		];
		let validateReceivedTransactions: () => Promise<ReadonlyArray<Transaction>>;
		// Dummy functions to check used for assertions in tests
		const checkForTransactionInvalidTransactionId = sandbox.stub();
		const checkForTransactionValidTransactionId = sandbox.stub();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponse = {
			passedTransactions: validTransactions,
			failedTransactions: invalidTransactions,
		};

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
				.onFirstCall()
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
				.onSecondCall()
				.returns(checkForTransactionValidTransactionId);
			(transactionPool.queues.received.removeFor as sinon.SinonStub)
				.onSecondCall()
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
				.onSecondCall()
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
		let verifyValidatedTransactions: () => Promise<ReadonlyArray<Transaction>>;
		// Dummy functions to check used for assertions in tests
		const checkForTransactionUnverifiableTransactionId = sandbox.stub();
		const checkForTransactionVerifiableTransactionId = sandbox.stub();

		const checkTransactionsResponse: checkTransactions.CheckTransactionsResponse = {
			passedTransactions: verifiableTransactions,
			failedTransactions: unverifiableTransactions,
		};

		beforeEach(async () => {
			(transactionPool.queues.validated.peekUntil as sinon.SinonStub).returns(
				transactionsToVerify,
			);
			verifyValidatedTransactions = (transactionPool as any)[
				'verifyValidatedTransactions'
			].bind(transactionPool);
			checkTransactionsStub.resolves(checkTransactionsResponse);
		});

		it('should remove unverifialbe transactions from the validated queue', async () => {
			checkerStubs.checkTransactionForId
				.onFirstCall()
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
				.onSecondCall()
				.returns(checkForTransactionVerifiableTransactionId);
			(transactionPool.queues.validated.removeFor as sinon.SinonStub)
				.onSecondCall()
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
				.onSecondCall()
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
