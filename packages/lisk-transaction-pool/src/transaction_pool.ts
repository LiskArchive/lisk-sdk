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
 *
 */
import {
	CheckerFunction,
	CheckTransactionsResponseWithPassAndFail,
	CheckTransactionsResponseWithPassFailAndPending,
	checkTransactionsWithPassAndFail,
	checkTransactionsWithPassFailAndPending,
} from './check_transactions';
import { Job } from './job';
import { Queue } from './queue';
import * as queueCheckers from './queue_checkers';

export interface TransactionObject {
	readonly id: string;
	receivedAt?: Date;
	readonly recipientId: string;
	readonly senderPublicKey: string;
	signatures?: ReadonlyArray<string>;
	readonly type: number;
	containsUniqueData: boolean;
}

export interface SignatureObject {
	transactionId: string;
	signature: string;
	publicKey: string;
}

export interface TransactionFunctions {
	isExpired(date: Date): boolean;
	verifyAgainstOtherTransactions(
		otherTransactions: ReadonlyArray<Transaction>,
	): boolean;
	addSignature(signature: string, publicKey: string): boolean;
	isReady(): boolean;
}

interface TransactionPoolConfiguration {
	readonly expireTransactionsInterval: number;
	readonly maxTransactionsPerQueue: number;
	readonly receivedTransactionsLimitPerProcessing: number;
	readonly receivedTransactionsProcessingInterval: number;
	readonly validatedTransactionsLimitPerProcessing: number;
	readonly validatedTransactionsProcessingInterval: number;
	readonly verifiedTransactionsLimitPerProcessing: number;
	readonly verifiedTransactionsProcessingInterval: number;
	readonly pendingTransactionsProcessingLimit: number;
}

export interface AddTransactionResult {
	readonly alreadyExists: boolean;
	readonly isFull: boolean;
}

interface TransactionPoolDependencies {
	processTransactions: CheckerFunction;
	validateTransactions: CheckerFunction;
	verifyTransactions: CheckerFunction;
}

type TransactionPoolOptions = TransactionPoolConfiguration &
	TransactionPoolDependencies;

export type Transaction = TransactionObject & TransactionFunctions;

export type QueueNames =
	| 'received'
	| 'validated'
	| 'verified'
	| 'pending'
	| 'ready';

interface Queues {
	readonly [queue: string]: Queue;
}

const DEFAULT_PENDING_TRANSACTIONS_PROCESSING_LIMIT = 5;
const DEFAULT_EXPIRE_TRANSACTION_INTERVAL = 30000;
const DEFAULT_MAX_TRANSACTIONS_PER_QUEUE = 1000;
const DEFAULT_RECEIVED_TRANSACTIONS_PROCESSING_INTERVAL = 30000;
const DEFAULT_RECEIVED_TRANSACTIONS_LIMIT_PER_PROCESSING = 100;
const DEFAULT_VALIDATED_TRANSACTIONS_PROCESSING_INTERVAL = 30000;
const DEFAULT_VALIDATED_TRANSACTIONS_LIMIT_PER_PROCESSING = 100;
const DEFAULT_VERIFIED_TRANSACTIONS_PROCESSING_INTERVAL = 30000;
const DEFAULT_VERIFIED_TRANSACTIONS_LIMIT_PER_PROCESSING = 100;

export class TransactionPool {
	private readonly _pendingTransactionsProcessingLimit: number;
	private readonly _expireTransactionsInterval: number;
	private readonly _expireTransactionsJob: Job<ReadonlyArray<Transaction>>;
	private readonly _maxTransactionsPerQueue: number;
	private readonly _queues: Queues;
	private readonly _receivedTransactionsProcessingInterval: number;
	private readonly _receivedTransactionsProcessingLimitPerInterval: number;
	private readonly _validatedTransactionsProcessingInterval: number;
	private readonly _validatedTransactionsProcessingLimitPerInterval: number;
	private readonly _verifiedTransactionsProcessingInterval: number;
	private readonly _verifiedTransactionsProcessingLimitPerInterval: number;
	private readonly _validateTransactions: CheckerFunction;
	private readonly _validateTransactionsJob: Job<ReadonlyArray<Transaction>>;
	private readonly _verifyTransactions: CheckerFunction;
	private readonly _verifyTransactionsJob: Job<ReadonlyArray<Transaction>>;
	private readonly _processTransactions: CheckerFunction;
	private readonly _processTransactionsJob: Job<ReadonlyArray<Transaction>>;

	public constructor({
		expireTransactionsInterval = DEFAULT_EXPIRE_TRANSACTION_INTERVAL,
		maxTransactionsPerQueue = DEFAULT_MAX_TRANSACTIONS_PER_QUEUE,
		receivedTransactionsProcessingInterval = DEFAULT_RECEIVED_TRANSACTIONS_PROCESSING_INTERVAL,
		receivedTransactionsLimitPerProcessing = DEFAULT_RECEIVED_TRANSACTIONS_LIMIT_PER_PROCESSING,
		validatedTransactionsProcessingInterval = DEFAULT_VALIDATED_TRANSACTIONS_PROCESSING_INTERVAL,
		validatedTransactionsLimitPerProcessing = DEFAULT_VALIDATED_TRANSACTIONS_LIMIT_PER_PROCESSING,
		verifiedTransactionsProcessingInterval = DEFAULT_VERIFIED_TRANSACTIONS_PROCESSING_INTERVAL,
		verifiedTransactionsLimitPerProcessing = DEFAULT_VERIFIED_TRANSACTIONS_LIMIT_PER_PROCESSING,
		pendingTransactionsProcessingLimit = DEFAULT_PENDING_TRANSACTIONS_PROCESSING_LIMIT,
		validateTransactions,
		verifyTransactions,
		processTransactions,
	}: TransactionPoolOptions) {
		this._maxTransactionsPerQueue = maxTransactionsPerQueue;
		this._pendingTransactionsProcessingLimit = pendingTransactionsProcessingLimit;

		this._queues = {
			received: new Queue(),
			validated: new Queue(),
			verified: new Queue(),
			pending: new Queue(),
			ready: new Queue(),
		};
		this._expireTransactionsInterval = expireTransactionsInterval;

		this._expireTransactionsJob = new Job(
			this.expireTransactions.bind(this),
			this._expireTransactionsInterval,
		);
		this._expireTransactionsJob.start();

		this._receivedTransactionsProcessingInterval = receivedTransactionsProcessingInterval;
		this._receivedTransactionsProcessingLimitPerInterval = receivedTransactionsLimitPerProcessing;
		this._validateTransactions = validateTransactions;

		this._validateTransactionsJob = new Job(
			this.validateReceivedTransactions.bind(this),
			this._receivedTransactionsProcessingInterval,
		);
		this._validateTransactionsJob.start();

		this._validatedTransactionsProcessingInterval = validatedTransactionsProcessingInterval;
		this._validatedTransactionsProcessingLimitPerInterval = validatedTransactionsLimitPerProcessing;
		this._verifyTransactions = verifyTransactions;

		this._verifyTransactionsJob = new Job(
			this.verifyValidatedTransactions.bind(this),
			this._validatedTransactionsProcessingInterval,
		);
		this._verifyTransactionsJob.start();

		this._verifiedTransactionsProcessingInterval = verifiedTransactionsProcessingInterval;
		this._verifiedTransactionsProcessingLimitPerInterval = verifiedTransactionsLimitPerProcessing;
		this._processTransactions = processTransactions;

		this._processTransactionsJob = new Job(
			this.processVerifiedTransactions.bind(this),
			this._verifiedTransactionsProcessingInterval,
		);
		this._processTransactionsJob.start();
	}

	public addTransaction(transaction: Transaction): AddTransactionResult {
		const receivedQueue: QueueNames = 'received';

		return this.addTransactionToQueue(receivedQueue, transaction);
	}

	public addVerifiedTransaction(
		transaction: Transaction,
	): AddTransactionResult {
		const verifiedQueue: QueueNames = 'verified';

		return this.addTransactionToQueue(verifiedQueue, transaction);
	}

	public addVerifiedRemovedTransactions(
		transactions: ReadonlyArray<Transaction>,
	): void {
		const { received, validated, ...otherQueues } = this._queues;

		// Move transactions from the verified, pending and ready queues to the validated queue where account was a receipient in the verified removed transactions
		const removedTransactionsByRecipientId = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForRecipientId(transactions),
		);

		this._queues.validated.enqueueMany(removedTransactionsByRecipientId);
		// Add transactions to the verified queue which were included in the verified removed transactions
		this._queues.verified.enqueueMany(transactions);
	}

	// It is assumed that signature is verified for this transaction before this function is called
	public addVerifiedSignature(signatureObject: SignatureObject): boolean {
		const transaction = this.findInTransactionPool(
			signatureObject.transactionId,
		);
		if (transaction) {
			return transaction.addSignature(signatureObject.signature, signatureObject.publicKey);
		}

		return false;
	}

	public existsInTransactionPool(transaction: Transaction): boolean {
		return Object.keys(this._queues).reduce(
			(previousValue, queueName) =>
				previousValue || this._queues[queueName].exists(transaction),
			false,
		);
	}

	public findInTransactionPool(id: string): Transaction | undefined {
		return Object.keys(this._queues).reduce(
			(previousValue: Transaction | undefined, queueName) =>
				previousValue || this._queues[queueName].index[id],
			undefined,
		);
	}

	public get queues(): Queues {
		return this._queues;
	}

	public getProcessableTransactions(limit: number): ReadonlyArray<Transaction> {
		return this._queues.ready.peekUntil(
			queueCheckers.returnTrueUntilLimit(limit)
		);
	}

	public removeConfirmedTransactions(
		transactions: ReadonlyArray<Transaction>,
	): void {
		// Remove transactions in the transaction pool which were included in the confirmed transactions
		this.removeTransactionsFromQueues(
			Object.keys(this._queues),
			queueCheckers.checkTransactionForId(transactions),
		);

		const { received, validated, ...otherQueues } = this._queues;
		// Remove transactions from the verified, pending and ready queues which were sent from the accounts in the confirmed transactions
		const removedTransactionsBySenderPublicKeys = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForSenderPublicKey(transactions),
		);

		// Remove all transactions from the verified, pending and ready queues if they are of a type which includes unique data and that type is included in the confirmed transactions
		const confirmedTransactionsWithUniqueData = transactions.filter(
			(transaction: Transaction) => transaction.containsUniqueData,
		);
		const removedTransactionsByTypes = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForTypes(
				confirmedTransactionsWithUniqueData,
			),
		);

		// Add transactions which need to be reverified to the validated queue
		this._queues.validated.enqueueMany([
			...removedTransactionsBySenderPublicKeys,
			...removedTransactionsByTypes,
		]);
	}

	public reverifyTransactionsFromSenders(
		senderPublicKeys: ReadonlyArray<string>,
	): void {
		// Move transactions from the verified, pending and ready queues to the validated queue which were sent from sender accounts
		const { received, validated, ...otherQueues } = this._queues;
		const senderProperty: queueCheckers.TransactionFilterableKeys =
			'senderPublicKey';
		const removedTransactionsBySenderPublicKeys = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionPropertyForValues(
				senderPublicKeys,
				senderProperty,
			),
		);

		this._queues.validated.enqueueMany(removedTransactionsBySenderPublicKeys);
	}

	public validateTransactionAgainstTransactionsInPool(
		transaction: Transaction,
	): boolean {
		return transaction.verifyAgainstOtherTransactions([
			...this.queues.ready.transactions,
			...this.queues.pending.transactions,
			...this.queues.verified.transactions,
		]);
	}

	private addTransactionToQueue(
		queueName: QueueNames,
		transaction: Transaction,
	): AddTransactionResult {
		if (this.existsInTransactionPool(transaction)) {
			return {
				isFull: false,
				alreadyExists: true,
			};
		}

		if (this._queues[queueName].size() >= this._maxTransactionsPerQueue) {
			return {
				isFull: true,
				alreadyExists: false,
			};
		}
		// Add receivedAt property for the transaction
		transaction.receivedAt = new Date();

		this._queues[queueName].enqueueOne(transaction);

		return {
			isFull: false,
			alreadyExists: false,
		};
	}

	private async expireTransactions(): Promise<ReadonlyArray<Transaction>> {
		return this.removeTransactionsFromQueues(
			Object.keys(this._queues),
			queueCheckers.checkTransactionForExpiry(),
		);
	}

	private async processVerifiedTransactions(): Promise<
		CheckTransactionsResponseWithPassAndFail
	> {
		const transactionsInReadyQueue = this._queues.ready.size();
		const transactionsInVerifiedQueue = this._queues.verified.size();
		const processableTransactionsInPendingQueue = this._queues.pending.sizeBy(
			transaction => transaction.isReady(),
		);

		if (
			transactionsInReadyQueue >=
				this._verifiedTransactionsProcessingLimitPerInterval ||
			(transactionsInVerifiedQueue === 0 &&
				processableTransactionsInPendingQueue === 0)
		) {
			return {
				passedTransactions: [],
				failedTransactions: [],
			};
		}

		const additionalTransactionsToProcessLimit =
			this._verifiedTransactionsProcessingLimitPerInterval -
			transactionsInReadyQueue;
		const transactionsFromPendingQueueLimit = Math.min(
			additionalTransactionsToProcessLimit,
			this._pendingTransactionsProcessingLimit,
		);
		// Filter at max transactionsFromPendingQueueLimit from the pending queue which are also ready
		const transactionsFromPendingQueue = this._queues.pending
			.filter(transaction => transaction.isReady())
			.slice(0, transactionsFromPendingQueueLimit);

		const additionalVerifiedTransactionsToProcessLimit =
			additionalTransactionsToProcessLimit -
			transactionsFromPendingQueue.length;

		const transactionsFromVerifiedQueue = this._queues.verified.peekUntil(
			queueCheckers.returnTrueUntilLimit(
				additionalVerifiedTransactionsToProcessLimit,
			),
		);
		const transactionsFromReadyQueue = this._queues.ready.peekUntil(
			queueCheckers.returnTrueUntilLimit(transactionsInReadyQueue),
		);
		const toProcessTransactions = [
			...transactionsFromReadyQueue,
			...transactionsFromPendingQueue,
			...transactionsFromVerifiedQueue,
		];
		const {
			passedTransactions,
			failedTransactions,
		} = await checkTransactionsWithPassAndFail(
			toProcessTransactions,
			this._processTransactions,
		);

		const { received, validated, ...otherQueues } = this._queues;

		// Remove invalid transactions from verified, pending and ready queues
		this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForId(failedTransactions),
		);

		// Keep transactions in the ready queue which still exist
		this._queues.ready.enqueueMany(
			this._queues.ready.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		// Move processeable transactions from the verified queue to the ready queue
		this._queues.ready.enqueueMany(
			this._queues.verified.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		// Move processable transactions from the pending queue to the ready queue
		this._queues.ready.enqueueMany(
			this._queues.pending.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		return {
			passedTransactions,
			failedTransactions,
		};
	}

	private removeTransactionsFromQueues(
		queueNames: ReadonlyArray<string>,
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		return queueNames
			.map(queueName => this._queues[queueName].removeFor(condition))
			.reduce(
				(
					transactionsAccumulatedFromQueues: ReadonlyArray<Transaction>,
					transactionsFromCurrentQueue: ReadonlyArray<Transaction>,
				) =>
					transactionsAccumulatedFromQueues.concat(
						transactionsFromCurrentQueue,
					),
				[],
			);
	}

	private async validateReceivedTransactions(): Promise<
		CheckTransactionsResponseWithPassAndFail
	> {
		const toValidateTransactions = this._queues.received.peekUntil(
			queueCheckers.returnTrueUntilLimit(
				this._receivedTransactionsProcessingLimitPerInterval,
			),
		);
		const {
			passedTransactions,
			failedTransactions,
		} = await checkTransactionsWithPassAndFail(
			toValidateTransactions,
			this._validateTransactions,
		);

		// Remove invalid transactions
		this._queues.received.removeFor(
			queueCheckers.checkTransactionForId(failedTransactions),
		);
		// Move valid transactions from the received queue to the validated queue
		this._queues.validated.enqueueMany(
			this._queues.received.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		return {
			passedTransactions,
			failedTransactions,
		};
	}

	private async verifyValidatedTransactions(): Promise<
		CheckTransactionsResponseWithPassFailAndPending
	> {
		const toVerifyTransactions = this._queues.validated.peekUntil(
			queueCheckers.returnTrueUntilLimit(
				this._validatedTransactionsProcessingLimitPerInterval,
			),
		);

		const {
			failedTransactions,
			pendingTransactions,
			passedTransactions,
		} = await checkTransactionsWithPassFailAndPending(
			toVerifyTransactions,
			this._verifyTransactions,
		);

		// Remove invalid transactions
		this._queues.validated.removeFor(
			queueCheckers.checkTransactionForId(failedTransactions),
		);

		// Move verified transactions from the validated queue to the verified queue
		this._queues.verified.enqueueMany(
			this._queues.validated.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		// Move verified pending transactions from the validated queue to the pending queue
		this._queues.pending.enqueueMany(
			this._queues.validated.removeFor(
				queueCheckers.checkTransactionForId(pendingTransactions),
			),
		);

		return {
			passedTransactions,
			failedTransactions,
			pendingTransactions,
		};
	}
}
