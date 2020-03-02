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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	TransactionPool,
	TransactionPoolConfiguration,
	EVENT_VERIFIED_TRANSACTION_ONCE,
} from '../../src/transaction_pool';
import { Transaction } from '../../src/types';
import {
	fakeCheckFunctionGenerator,
	fakeCheckerFunctionGenerator,
} from './helpers/common';
import * as transactionObjects from '../../fixtures/transactions.json';
import { wrapTransaction } from '../utils/add_transaction_functions';

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
			const affectedTransactionsInReadyQueue = transactionsInReadyQueue.slice(
				0,
				8,
			);
			const unaffectedTransactionsInReadyQueue = transactionsInReadyQueue.slice(
				8,
			);
			const transactionsToMoveToValidatedQueue = [
				...affectedTransactionsInVerifiedQueue,
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
							getAddressFromPublicKey(affectedTransaction.senderPublicKey) ===
							transferTransaction.asset.recipientId,
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
					).toBe(true);
				});
			});

			it('should move affected transactions in the validated queue to the received queue', async () => {
				transactionsToMoveToReceivedQueue.forEach(affectedTransaction => {
					expect(
						transactionPool.queues.received.exists(affectedTransaction.id),
					).toBe(true);
				});
			});

			it('should keep the unaffected transactions in their queues', async () => {
				unaffectedTransactionsInReadyQueue.forEach(transaction =>
					expect(transactionPool.queues.ready.exists(transaction.id)).toBe(
						true,
					),
				);
				unaffectedTransactionsInVerifiedQueue.forEach(transaction =>
					expect(transactionPool.queues.verified.exists(transaction.id)).toBe(
						true,
					),
				);
				unaffectedTransactionsInValidatedQueue.forEach(transaction =>
					expect(transactionPool.queues.validated.exists(transaction.id)).toBe(
						true,
					),
				);
			});

			it('should add transactions to the verified queue', async () => {
				transactionsToAffectedReceipients.forEach(transaction =>
					expect(transactionPool.queues.verified.exists(transaction.id)).toBe(
						true,
					),
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
				confirmedTransactionInReadyQueue,
				...transactionsWithAffectedTypeInReadyQueue
			] = transactionsInReadyQueue.filter(filterForAffectedType);
			const [
				confirmedTransactionInValidatedQueue,
				...transactionsWithAffectedTypeInValidatedQueue
			] = transactionsInValidatedQueue.filter(filterForAffectedType);

			const confirmedTransactions = [
				confirmedTransactionInVerifiedQueue,
				confirmedTransactionInReadyQueue,
				confirmedTransactionInValidatedQueue,
			];

			const filterForAffectedTransactionsBySenderId = (
				transaction: Transaction,
			) => {
				confirmedTransactions.find(
					confirmedTransaction =>
						confirmedTransaction.senderPublicKey ===
						transaction.senderPublicKey,
				);
			};

			const transactionsWithAffectedSenderIdInVerifiedQueue = transactionsInVerifiedQueue.filter(
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
				...transactionsWithAffectedTypeInReadyQueue,
				...transactionsWithAffectedSenderIdInVerifiedQueue,
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
					expect(transactionPool.existsInTransactionPool(transaction.id)).toBe(
						false,
					);
				});
			});

			it('should move affected transactions in the verified, ready and pending queue to the validated queue', async () => {
				transactionsToMoveToValidatedQueue.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction.id)).toBe(
						true,
					);
				});
			});

			it('should move affected transactions in the validated queue to the received queue', async () => {
				transactionsToMoveToReceivedQueue.forEach(transaction => {
					expect(transactionPool.queues.received.exists(transaction.id)).toBe(
						true,
					);
				});
			});
		});

		describe('on verifying transactions from senders', () => {
			const affectedSenderPublicKeys = [
				transactionsInVerifiedQueue[0],
				transactionsInReadyQueue[0],
				transactionsInValidatedQueue[0],
			].map(transaction => transaction.senderPublicKey);

			const transactionsToMoveToValidatedQueue = [
				...transactionsInVerifiedQueue,
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
					expect(transactionPool.queues.received.exists(transaction.id)).toBe(
						true,
					);
				});
			});

			it('should move affected transactions in the verified, ready and pending queue to the validated queue', async () => {
				transactionsToMoveToValidatedQueue.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction.id)).toBe(
						true,
					);
				});
			});
		});

		describe('on adding transactions to transaction pool', () => {
			it('should not fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction unable to add to the verified queue', done => {
				transactionPool.addVerifiedTransaction(transactions[0]);
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, () => {
					done('should not be called');
				});
				const { alreadyExists } = transactionPool.addVerifiedTransaction(
					transactions[0],
				);
				expect(alreadyExists).toBe(true);
				// wait 1 second to ensure that event is not called for transaction
				setTimeout(done, 1000);
			});

			it('should fire event EVENT_VERIFIED_TRANSACTION_ONCE if transaction is added to the verified queue after adding transaction', done => {
				transactionPool.on(EVENT_VERIFIED_TRANSACTION_ONCE, ({ payload }) => {
					expect(payload[0]).toEqual(transactions[0]);
					done();
				});
				transactionPool.addVerifiedTransaction(transactions[0]);
			});
		});
	});
});
