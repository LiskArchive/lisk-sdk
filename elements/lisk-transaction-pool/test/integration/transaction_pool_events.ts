import {
	TransactionPool,
	TransactionPoolConfiguration,
	Transaction,
	EVENT_VERIFIED_TRANSACTION_ONCE,
} from '../../src/transaction_pool';
import {
	fakeCheckFunctionGenerator,
	fakeCheckerFunctionGenerator,
} from './helpers/common';
import * as transactionObjects from '../../fixtures/transactions.json';
import { wrapTransaction } from '../utils/add_transaction_functions';
import { expect } from 'chai';

describe('transaction pool events', () => {
	const transactions: ReadonlyArray<Transaction> = transactionObjects.map(
		wrapTransaction,
	);
	let transactionPool: TransactionPool;

	const configuration: TransactionPoolConfiguration = {
		expireTransactionsInterval: 100,
		maxTransactionsPerQueue: 1000,
		receivedTransactionsLimitPerProcessing: 25,
		receivedTransactionsProcessingInterval: 10000,
		validatedTransactionsLimitPerProcessing: 25,
		validatedTransactionsProcessingInterval: 10000,
		verifiedTransactionsLimitPerProcessing: 25,
		verifiedTransactionsProcessingInterval: 10000,
		pendingTransactionsProcessingLimit: 5,
	};

	const validateTransactionFunction = fakeCheckFunctionGenerator([]);
	const verifyTransactionFunction = fakeCheckFunctionGenerator([]);
	const processTransactionsFunction = fakeCheckFunctionGenerator([]);

	const dependencies = {
		processTransactions: fakeCheckerFunctionGenerator(
			processTransactionsFunction,
		),
		validateTransactions: fakeCheckerFunctionGenerator(
			validateTransactionFunction,
		),
		verifyTransactions: fakeCheckerFunctionGenerator(verifyTransactionFunction),
	};

	// Filter all transfer transactions from accounts from fixture
	const transferTransactions = transactions.filter(
		transaction => transaction.type === 0,
	);
	// Filter all the other transaction types from accounts from fixture
	const otherTransactions = transactions.filter(
		transaction => transaction.type !== 0,
	);

	// In otherTransactions array, each account has 4 transactions. All transactions from the same account should be put in the same queue to allow easier testing.
	// In order to keep all transactions from a single account in one queue, each queue length is divisible by 4.
	const transactionsInReceivedQueue = otherTransactions.slice(0, 200);
	const transactionsInValidatedQueue = otherTransactions.slice(200, 400);
	const transactionsInVerifiedQueue = otherTransactions.slice(400, 600);
	const transactionsInPendingQueue = otherTransactions.slice(600, 776);
	const transactionsInReadyQueue = otherTransactions.slice(776, 800);

	beforeEach(async () => {
		transactionPool = new TransactionPool({
			...configuration,
			...dependencies,
		});
	});

	afterEach(async () => {
		transactionPool.cleanup();
	});

	describe('put transactions in all the different queues', () => {
		beforeEach(async () => {
			transactionPool.queues.received.enqueueMany(transactionsInReceivedQueue);
			transactionPool.queues.validated.enqueueMany(
				transactionsInValidatedQueue,
			);
			transactionPool.queues.verified.enqueueMany(transactionsInVerifiedQueue);
			transactionPool.queues.pending.enqueueMany(transactionsInPendingQueue);
			transactionPool.queues.ready.enqueueMany(transactionsInReadyQueue);
		});

		describe('on adding verified removed transactions', () => {
			// 4 transactions from each account are affected
			const affectedTransactionsInValidatedQueue = transactionsInValidatedQueue.slice(
				0,
				8,
			);
			const unaffectedTransactionsInValidatedQueue = transactionsInValidatedQueue.slice(
				8,
			);
			const affectedTransactionsInVerifiedQueue = transactionsInVerifiedQueue.slice(
				0,
				8,
			);
			const unaffectedTransactionsInVerifiedQueue = transactionsInVerifiedQueue.slice(
				8,
			);
			const affectedTransactionsInPendingQueue = transactionsInPendingQueue.slice(
				0,
				8,
			);
			const unaffectedTransactionsInPendingQueue = transactionsInPendingQueue.slice(
				8,
			);
			const affectedTransactionsInReadyQueue = transactionsInReadyQueue.slice(
				0,
				8,
			);
			const unaffectedTransactionsInReadyQueue = transactionsInReadyQueue.slice(
				8,
			);
			const transactionsToMoveToValidatedQueue = [
				...affectedTransactionsInVerifiedQueue,
				...affectedTransactionsInPendingQueue,
				...affectedTransactionsInReadyQueue,
			];
			const transactionsToMoveToReceivedQueue = affectedTransactionsInValidatedQueue;
			const transactionsToAffectedReceipients = transferTransactions.filter(
				transferTransaction =>
					[
						...transactionsToMoveToValidatedQueue,
						...transactionsToMoveToReceivedQueue,
					].find(
						affectedTransaction =>
							affectedTransaction.senderId === transferTransaction.recipientId,
					),
			);

			beforeEach(async () => {
				transactionPool.addVerifiedRemovedTransactions(
					transactionsToAffectedReceipients,
				);
			});

			it('should move affected transactions in verified, pending and ready queue to the validated queue', async () => {
				transactionsToMoveToValidatedQueue.forEach(affectedTransaction => {
					expect(
						transactionPool.queues.validated.exists(affectedTransaction.id),
					).to.be.true;
				});
			});

			it('should move affected transactions in the validated queue to the received queue', async () => {
				transactionsToMoveToReceivedQueue.forEach(affectedTransaction => {
					expect(transactionPool.queues.received.exists(affectedTransaction.id))
						.to.be.true;
				});
			});

			it('should keep the unaffected transactions in their queues', async () => {
				unaffectedTransactionsInReadyQueue.forEach(
					transaction =>
						expect(transactionPool.queues.ready.exists(transaction.id)).to.be
							.true,
				);
				unaffectedTransactionsInVerifiedQueue.forEach(
					transaction =>
						expect(transactionPool.queues.verified.exists(transaction.id)).to.be
							.true,
				);
				unaffectedTransactionsInPendingQueue.forEach(
					transaction =>
						expect(transactionPool.queues.pending.exists(transaction.id)).to.be
							.true,
				);
				unaffectedTransactionsInValidatedQueue.forEach(
					transaction =>
						expect(transactionPool.queues.validated.exists(transaction.id)).to
							.be.true,
				);
			});

			it('should add transactions to the verified queue', async () => {
				transactionsToAffectedReceipients.forEach(
					transaction =>
						expect(transactionPool.queues.verified.exists(transaction.id)).to.be
							.true,
				);
			});
		});

		describe('on removing confirmed transactions', () => {
			const affectedTypeWhichContainsUniqueData = 2;
			const filterForAffectedType = (transaction: Transaction) =>
				transaction.type === affectedTypeWhichContainsUniqueData;

			// Filter transactions in queues by type, and use the first transaction as a confirmed transaction
			const [
				confirmedTransactionInVerifiedQueue,
				...transactionsWithAffectedTypeInVerifiedQueue
			] = transactionsInVerifiedQueue.filter(filterForAffectedType);
			const [
				confirmedTransactionInPendingQueue,
				...transactionsWithAffectedTypeInPendingQueue
			] = transactionsInPendingQueue.filter(filterForAffectedType);
			const [
				confirmedTransactionInReadyQueue,
				...transactionsWithAffectedTypeInReadyQueue
			] = transactionsInReadyQueue.filter(filterForAffectedType);
			const [
				confirmedTransactionInValidatedQueue,
				...transactionsWithAffectedTypeInValidatedQueue
			] = transactionsInValidatedQueue.filter(filterForAffectedType);

			const confirmedTransactions = [
				confirmedTransactionInVerifiedQueue,
				confirmedTransactionInPendingQueue,
				confirmedTransactionInReadyQueue,
				confirmedTransactionInValidatedQueue,
			];

			const filterForAffectedTransactionsBySenderId = (
				transaction: Transaction,
			) => {
				confirmedTransactions.find(
					confirmedTransaction =>
						confirmedTransaction.senderId === transaction.senderId,
				);
			};

			const transactionsWithAffectedSenderIdInVerifiedQueue = transactionsInVerifiedQueue.filter(
				filterForAffectedTransactionsBySenderId,
			);
			const transactionsWithAffectedSenderIdInPendingQueue = transactionsInPendingQueue.filter(
				filterForAffectedTransactionsBySenderId,
			);
			const transactionsWithAffectedSenderIdInReadyQueue = transactionsInReadyQueue.filter(
				filterForAffectedTransactionsBySenderId,
			);
			const transactionsWithAffectedSenderIdInValidatedQueue = transactionsInValidatedQueue.filter(
				filterForAffectedTransactionsBySenderId,
			);

			const transactionsToMoveToValidatedQueue = [
				...transactionsWithAffectedTypeInVerifiedQueue,
				...transactionsWithAffectedTypeInPendingQueue,
				...transactionsWithAffectedTypeInReadyQueue,
				...transactionsWithAffectedSenderIdInVerifiedQueue,
				...transactionsWithAffectedSenderIdInPendingQueue,
				...transactionsWithAffectedSenderIdInReadyQueue,
			];

			const transactionsToMoveToReceivedQueue = [
				...transactionsWithAffectedTypeInValidatedQueue,
				...transactionsWithAffectedSenderIdInValidatedQueue,
			];

			beforeEach(async () => {
				transactionPool.removeConfirmedTransactions(confirmedTransactions);
			});

			afterEach(async () => {});

			it('should remove confirmed transactions from the transaction pool', async () => {
				confirmedTransactions.forEach(transaction => {
					expect(transactionPool.existsInTransactionPool(transaction.id)).to.be
						.false;
				});
			});

			it('should move affected transactions in the verified, ready and pending queue to the validated queue', async () => {
				transactionsToMoveToValidatedQueue.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction.id)).to.be
						.true;
				});
			});

			it('should move affected transactions in the validated queue to the received queue', async () => {
				transactionsToMoveToReceivedQueue.forEach(transaction => {
					expect(transactionPool.queues.received.exists(transaction.id)).to.be
						.true;
				});
			});
		});

		describe('on verifying transactions from senders', () => {
			const affectedSenderPublicKeys = [
				transactionsInVerifiedQueue[0],
				transactionsInPendingQueue[0],
				transactionsInReadyQueue[0],
				transactionsInValidatedQueue[0],
			].map(transaction => transaction.senderPublicKey);

			const transactionsToMoveToValidatedQueue = [
				...transactionsInVerifiedQueue,
				...transactionsInPendingQueue,
				...transactionsInReadyQueue,
			].filter(transaction =>
				affectedSenderPublicKeys.includes(transaction.senderPublicKey),
			);

			const transactionsToMoveToReceivedQueue = transactionsInValidatedQueue.filter(
				transaction =>
					affectedSenderPublicKeys.includes(transaction.senderPublicKey),
			);

			beforeEach(async () => {
				transactionPool.reverifyTransactionsFromSenders(
					affectedSenderPublicKeys,
				);
			});

			it('should move affected transactions in the validated queue to the received queue', async () => {
				transactionsToMoveToReceivedQueue.forEach(transaction => {
					expect(transactionPool.queues.received.exists(transaction.id)).to.be
						.true;
				});
			});

			it('should move affected transactions in the verified, ready and pending queue to the validated queue', async () => {
				transactionsToMoveToValidatedQueue.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction.id)).to.be
						.true;
				});
			});
		});

		describe('on adding transactions to transaction pool', () => {
			it('should not fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction unable to add to the pending queue', done => {
				transactionPool.addPendingTransaction(transactions[0]);
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, () => {
					done('should not be called');
				});
				const { alreadyExists } = transactionPool.addPendingTransaction(
					transactions[0],
				);
				expect(alreadyExists).to.equal(true);
				// wait 1 second to ensure that event is not called for transaction
				setTimeout(done, 1000);
			});

			it('should fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction is added to the pending queue after adding transaction', done => {
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, ({ payload }) => {
					expect(payload[0]).to.eql(transactions[0]);
					done();
				});
				transactionPool.addPendingTransaction(transactions[0]);
			});

			it('should not fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction unable to add to the verified queue', done => {
				transactionPool.addVerifiedTransaction(transactions[0]);
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, () => {
					done('should not be called');
				});
				const { alreadyExists } = transactionPool.addVerifiedTransaction(
					transactions[0],
				);
				expect(alreadyExists).to.equal(true);
				// wait 1 second to ensure that event is not called for transaction
				setTimeout(done, 1000);
			});

			it('should fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction is added to the verified queue after adding transaction', done => {
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, ({ payload }) => {
					expect(payload[0]).to.eql(transactions[0]);
					done();
				});
				transactionPool.addVerifiedTransaction(transactions[0]);
			});
		});
	});
});
