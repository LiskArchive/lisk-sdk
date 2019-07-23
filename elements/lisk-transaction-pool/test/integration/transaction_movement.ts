import {
	TransactionPool,
	TransactionPoolConfiguration,
	Transaction,
} from '../../src/transaction_pool';
import {
	fakeCheckFunctionGenerator,
	fakeCheckerFunctionGenerator,
	wrapExpectationInNextTick,
} from './helpers/common';
import { returnTrueUntilLimit } from '../../src/queue_checkers';
import * as transactionObjects from '../../fixtures/transactions.json';
import { wrapTransaction } from '../utils/add_transaction_functions';
import { SinonFakeTimers } from 'sinon';
import { expect } from 'chai';

describe('transaction movement between queues', () => {
	const transactions: ReadonlyArray<Transaction> = transactionObjects.map(
		wrapTransaction,
	);
	let transactionPool: TransactionPool;
	let clock: SinonFakeTimers;

	const configuration: TransactionPoolConfiguration = {
		expireTransactionsInterval: 100,
		maxTransactionsPerQueue: 1000,
		receivedTransactionsLimitPerProcessing: 25,
		receivedTransactionsProcessingInterval: 100,
		validatedTransactionsLimitPerProcessing: 25,
		validatedTransactionsProcessingInterval: 100,
		verifiedTransactionsLimitPerProcessing: 25,
		verifiedTransactionsProcessingInterval: 100,
		pendingTransactionsProcessingLimit: 5,
	};

	const validateTransactionFunction = fakeCheckFunctionGenerator(['1']);
	const verifyTransactionFunction = fakeCheckFunctionGenerator(['2']);
	const processTransactionsFunction = fakeCheckFunctionGenerator(['-1']);

	const dependencies = {
		processTransactions: fakeCheckerFunctionGenerator(
			processTransactionsFunction,
		),
		validateTransactions: fakeCheckerFunctionGenerator(
			validateTransactionFunction,
		),
		verifyTransactions: fakeCheckerFunctionGenerator(verifyTransactionFunction),
	};

	beforeEach(async () => {
		clock = sandbox.useFakeTimers();
		transactionPool = new TransactionPool({
			...configuration,
			...dependencies,
		});
	});

	afterEach(async () => {
		transactionPool.cleanup();
	});

	describe('validate received transactions', () => {
		let transactionsToValidate: ReadonlyArray<Transaction>;
		let validTransactions: ReadonlyArray<Transaction>;
		let invalidTransactions: ReadonlyArray<Transaction>;

		beforeEach(async () => {
			transactions.forEach(transaction => {
				transactionPool.addTransaction(transaction);
			});
			transactionsToValidate = transactionPool.queues.received.peekUntil(
				returnTrueUntilLimit(
					configuration.receivedTransactionsLimitPerProcessing,
				),
			);
			const {
				passedTransactions,
				failedTransactions,
			} = validateTransactionFunction(transactionsToValidate);

			validTransactions = passedTransactions;
			invalidTransactions = failedTransactions;
			clock.tick(configuration.receivedTransactionsProcessingInterval + 1);
		});

		it('should remove transactions from the received queue', async () => {
			await wrapExpectationInNextTick(() => {
				transactionsToValidate.forEach(transaction => {
					expect(transactionPool.queues.received.exists(transaction.id)).to.be
						.false;
				});
			});
		});

		it('should move valid transactions to the validated queue', async () => {
			await wrapExpectationInNextTick(() => {
				validTransactions.forEach(transaction => {
					expect(transactionPool.queues.validated.exists(transaction.id)).to.be
						.true;
				});
				expect(transactionPool.queues.validated.size()).to.equal(
					validTransactions.length,
				);
			});
		});

		it('should remove invalid transactions from the transaction pool', async () => {
			await wrapExpectationInNextTick(() => {
				invalidTransactions.forEach(transaction => {
					expect(transactionPool.existsInTransactionPool(transaction.id)).to.be
						.false;
				});
			});
		});

		describe('from validated to the verified and pending queues', () => {
			let transactionsToVerify: ReadonlyArray<Transaction>;
			let verifiableTransactions: ReadonlyArray<Transaction>;
			let unverifiableTransactions: ReadonlyArray<Transaction>;

			beforeEach(async () => {
				transactionsToVerify = validTransactions;
				const {
					passedTransactions,
					failedTransactions,
				} = verifyTransactionFunction(transactionsToVerify);

				verifiableTransactions = passedTransactions;
				unverifiableTransactions = failedTransactions;
				clock.tick(configuration.validatedTransactionsProcessingInterval + 1);
			});

			it('should remove transactions from the validated queue', async () => {
				await wrapExpectationInNextTick(() => {
					transactionsToVerify.forEach(transaction => {
						expect(transactionPool.queues.validated.exists(transaction.id)).to
							.be.false;
					});
				});
			});

			it('should move verified transactions to the verified queue', async () => {
				await wrapExpectationInNextTick(() => {
					verifiableTransactions.forEach(transaction => {
						expect(transactionPool.queues.verified.exists(transaction.id)).to.be
							.true;
					});
					expect(transactionPool.queues.verified.size()).to.equal(
						verifiableTransactions.length,
					);
				});
			});

			it('should remove verified transactions from the transaction pool', async () => {
				await wrapExpectationInNextTick(() => {
					unverifiableTransactions.forEach(transaction => {
						expect(transactionPool.existsInTransactionPool(transaction.id)).to
							.be.false;
					});
				});
			});

			describe('from pending and verified to the ready queue', () => {
				let transactionsToProcess: ReadonlyArray<Transaction>;
				let processableTransactions: ReadonlyArray<Transaction>;
				let unprocessableTransactions: ReadonlyArray<Transaction>;

				beforeEach(async () => {
					transactionsToProcess = verifiableTransactions;
					const {
						passedTransactions,
						failedTransactions,
					} = processTransactionsFunction(transactionsToProcess);

					processableTransactions = passedTransactions;
					unprocessableTransactions = failedTransactions;
					clock.tick(configuration.verifiedTransactionsProcessingInterval + 1);
				});

				it('should remove transactions from the verified queue', async () => {
					await wrapExpectationInNextTick(() => {
						transactionsToProcess.forEach(transaction => {
							expect(transactionPool.queues.verified.exists(transaction.id)).to
								.be.false;
						});
					});
				});

				it('should move processable transactions to the ready queue', async () => {
					await wrapExpectationInNextTick(() => {
						processableTransactions.forEach(transaction => {
							expect(transactionPool.queues.ready.exists(transaction.id)).to.be
								.true;
						});
						expect(transactionPool.queues.ready.size()).to.equal(
							processableTransactions.length,
						);
					});
				});

				it('should remove unverfied transactions from the transaction pool', async () => {
					(transactionsToProcess[0].id as any) =
						'-1' + transactionsToProcess[0].id;
					await wrapExpectationInNextTick(() => {
						unprocessableTransactions.forEach(transaction => {
							expect(transactionPool.existsInTransactionPool(transaction.id)).to
								.be.false;
						});
					});
				});

				it('should keep the transactions after running the job twice', async () => {
					let transactionsInReadyQueue: ReadonlyArray<Transaction>;
					await wrapExpectationInNextTick(() => {
						transactionsInReadyQueue =
							transactionPool.queues.ready.transactions;
						clock.tick(configuration.verifiedTransactionsProcessingInterval);
					});

					await wrapExpectationInNextTick(() => {
						transactionsInReadyQueue.forEach(transaction => {
							expect(transactionPool.queues.ready.exists(transaction.id)).to.be
								.true;
						});
					});
				});
			});
		});
	});
});
