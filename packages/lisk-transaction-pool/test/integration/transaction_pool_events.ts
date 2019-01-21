import {
	TransactionPool,
	TransactionPoolConfiguration,
	Transaction,
} from '../../src/transaction_pool';
import {
	fakeCheckFunctionGenerator,
	fakeCheckerFunctionGenerator,
} from './helpers/common';
import transactionObjects from '../../fixtures/transactions.json';
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
			const affectedTransactions = [
				...affectedTransactionsInVerifiedQueue,
				...affectedTransactionsInPendingQueue,
				...affectedTransactionsInReadyQueue,
			];
			const transactionsToAffectedReceipients = transferTransactions.filter(
				transferTransaction =>
					affectedTransactions.find(
						affectedTransaction =>
							affectedTransaction.senderId === transferTransaction.recipientId,
					),
			);

			beforeEach(async () => {
				transactionPool.addVerifiedRemovedTransactions(
					transactionsToAffectedReceipients,
				);
			});

			it('should move affected transactions to the validated queue', async () => {
				affectedTransactions.forEach(affectedTransaction => {
					expect(transactionPool.queues.validated.exists(affectedTransaction))
						.to.be.true;
				});
			});

			it('should keep the unaffected transactions in their queues', async () => {
				unaffectedTransactionsInReadyQueue.forEach(
					transaction =>
						expect(transactionPool.queues.ready.exists(transaction)).to.be.true,
				);
				unaffectedTransactionsInVerifiedQueue.forEach(
					transaction =>
						expect(transactionPool.queues.verified.exists(transaction)).to.be
							.true,
				);
				unaffectedTransactionsInPendingQueue.forEach(
					transaction =>
						expect(transactionPool.queues.pending.exists(transaction)).to.be
							.true,
				);
			});

			it('should add transactions to the verified queue', async () => {
				transactionsToAffectedReceipients.forEach(
					transaction =>
						expect(transactionPool.queues.verified.exists(transaction)).to.be
							.true,
				);
			});
		});

		describe('on removing confirmed transactions', () => {
			const affectedTypeWhichContainsUniqueData = 2;
			const transactionsWithAffectedTypeInVerifiedQueue = transactionsInVerifiedQueue.filter(
				transaction => transaction.type === affectedTypeWhichContainsUniqueData,
			);
			const transactionsWithAffectedTypeInPendingQueue = transactionsInPendingQueue.filter(
				transaction => transaction.type === affectedTypeWhichContainsUniqueData,
			);
			const transactionsWithAffectedTypeInReadyQueue = transactionsInReadyQueue.filter(
				transaction => transaction.type === affectedTypeWhichContainsUniqueData,
			);

			const confirmedTransactions = [
				transactionsWithAffectedTypeInPendingQueue[0],
				transactionsWithAffectedTypeInReadyQueue[0],
				transactionsWithAffectedTypeInVerifiedQueue[0],
			];

			const transactionsWithAffectedSenderId = [
				...transactionsInReadyQueue,
				...transactionsInVerifiedQueue,
				...transactionsInPendingQueue,
			].filter(transaction => {
				confirmedTransactions.find(
					confirmedTransaction =>
						confirmedTransaction.senderId === transaction.senderId,
				);
			});
			const affectedTransactions = [
				...transactionsWithAffectedTypeInVerifiedQueue,
				...transactionsWithAffectedTypeInPendingQueue,
				...transactionsWithAffectedTypeInReadyQueue,
				...transactionsWithAffectedSenderId,
			];
			const affectedUnconfirmedTransactions = affectedTransactions.filter(
				affectedTransaction =>
					!confirmedTransactions.find(
						transaction => transaction.id === affectedTransaction.id,
					),
			);

			beforeEach(async () => {
				transactionPool.removeConfirmedTransactions(confirmedTransactions);
			});

			it('should remove confirmed transactions from the transaction pool', async () => {
				confirmedTransactions.forEach(transaction => {
					expect(transactionPool.existsInTransactionPool(transaction)).to.be
						.false;
				});
			});

			it('should move affected transactions to the validated queue', async () => {
				affectedUnconfirmedTransactions.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction)).to.be
						.true;
				});
			});
		});

		describe('on verifying transactions from senders', () => {
			const affectedSenderPublicKeys = [
				transactionsInVerifiedQueue[0],
				transactionsInPendingQueue[0],
				transactionsInReadyQueue[0],
			].map(transaction => transaction.senderPublicKey);
			const affectedTransactions = [
				...transactionsInVerifiedQueue,
				...transactionsInPendingQueue,
				...transactionsInReadyQueue,
			].filter(transaction =>
				affectedSenderPublicKeys.includes(transaction.senderPublicKey),
			);

			beforeEach(async () => {
				transactionPool.reverifyTransactionsFromSenders(
					affectedSenderPublicKeys,
				);
			});

			it('should move affected transactions to the validated queue', async () => {
				affectedTransactions.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction)).to.be
						.true;
				});
			});
		});
	});
});
