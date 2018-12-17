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
}

export interface TransactionFunctions {
	containsUniqueData(): boolean;
	isExpired(date: Date): boolean;
	verifyTransactionAgainstOtherTransactions(
		otherTransactions: ReadonlyArray<Transaction>,
	): boolean;
}

export interface CheckTransactionsResult {
	transactionsResponses: ReadonlyArray<TransactionResponse>
	status: boolean;
};

interface TransactionResponse {
	readonly errors: ReadonlyArray<Error>,
	readonly id: string,
	readonly status: boolean,
}

interface TransactionPoolConfiguration {
	readonly expireTransactionsInterval: number;
	readonly maxTransactionsPerQueue: number;
	readonly receivedTransactionsLimitPerProcessing: number;
	readonly receivedTransactionsProcessingInterval: number;
}

export interface AddTransactionResult {
	readonly alreadyExists: boolean;
	readonly isFull: boolean;
}

interface TransactionPoolDependecies {
	validateTransactions(transactions: ReadonlyArray<Transaction>): CheckTransactionsResult
}

type TransactionPoolOptions = TransactionPoolConfiguration & TransactionPoolDependecies;

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

const DEFAULT_EXPIRE_TRANSACTION_INTERVAL = 30000;
const DEFAULT_MAX_TRANSACTIONS_PER_QUEUE = 30000;
const DEFAULT_RECEIVED_TRANSACTIONS_PROCESSING_INTERVAL = 30000;
const DEFAULT_RECEIVED_TRANSACTIONS_LIMIT_PER_PROCESSING = 100;

export class TransactionPool {
	private readonly _expireTransactionsInterval: number;
	private readonly _expireTransactionsJob: Job<ReadonlyArray<Transaction>>;
	private readonly _maxTransactionsPerQueue: number;
	private readonly _queues: Queues;
	private readonly _receivedTransactionsProcessingInterval: number;
	private readonly _receivedTransactionsProcessingLimitPerInterval: number;
	private readonly _validateTransactions: (transactions: ReadonlyArray<Transaction>) => CheckTransactionsResult ;
	private readonly _validateTransactionsJob: Job<ReadonlyArray<Transaction>>;

	public constructor({
		expireTransactionsInterval = DEFAULT_EXPIRE_TRANSACTION_INTERVAL,
		maxTransactionsPerQueue = DEFAULT_MAX_TRANSACTIONS_PER_QUEUE,
		receivedTransactionsProcessingInterval = DEFAULT_RECEIVED_TRANSACTIONS_PROCESSING_INTERVAL,
		receivedTransactionsLimitPerProcessing = DEFAULT_RECEIVED_TRANSACTIONS_LIMIT_PER_PROCESSING,
		validateTransactions
	}: TransactionPoolOptions) {
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

		this._maxTransactionsPerQueue = maxTransactionsPerQueue;
		this._receivedTransactionsProcessingInterval = receivedTransactionsProcessingInterval;
		this._receivedTransactionsProcessingLimitPerInterval = receivedTransactionsLimitPerProcessing;
		this._validateTransactions = validateTransactions;

		this._validateTransactionsJob = new Job(
			this.validateReceivedTransactions.bind(this),
			this._receivedTransactionsProcessingInterval
		);
		this._validateTransactionsJob.start();
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
		// Add transactions to the verfied queue which were included in the verified removed transactions
		this._queues.verified.enqueueMany(transactions);
	}

	public existsInTransactionPool(transaction: Transaction): boolean {
		return Object.keys(this._queues).reduce(
			(previousValue, currentValue) =>
				previousValue || this._queues[currentValue].exists(transaction),
			false,
		);
	}

	public get queues(): Queues {
		return this._queues;
	}

	public getProcessableTransactions(limit: number): ReadonlyArray<Transaction> {
		return this._queues.ready.dequeueUntil(
			queueCheckers.returnTrueUntilLimit(limit),
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
		// TODO: remove the condition for checking `containsUniqueData` exists, because it should always exist
		const confirmedTransactionsWithUniqueData = transactions.filter(
			(transaction: Transaction) =>
				transaction.containsUniqueData && transaction.containsUniqueData(),
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

	public async validateReceivedTransactions(): Promise<ReadonlyArray<TransactionResponse>> {
		// Get transactions from the received queue
		const transactionsToValidate = this._queues.received.peekUntil(
			queueCheckers.returnTrueUntilLimit(this._receivedTransactionsProcessingLimitPerInterval)
		);
		// Validate transactions
		const validateTransactionsResponse = await this._validateTransactions(transactionsToValidate).transactionsResponses;

		// Get ids of invalid transactions from validateTransactionsResponse
		const invalidTransactionIds = validateTransactionsResponse.filter((transactionResponse) => transactionResponse.status)
			.map(transationStatus => transationStatus.id);

		// Filter transactions in transactionToValidate which are invalid
		const invalidTransactions = transactionsToValidate.filter(transaction => invalidTransactionIds.includes(transaction.id));
		// Filter transactions in transactionToValidate which are valid 
		const validTransactions = transactionsToValidate.filter(transaction => !invalidTransactionIds.includes(transaction.id));
		// Remove invalid transactions
		this.queues.received.removeFor(queueCheckers.checkTransactionForId(invalidTransactions));
		// Move valid transactions from the received queue to the validated queue
		this.queues.validated.enqueueMany(this.queues.received.removeFor(queueCheckers.checkTransactionForId(validTransactions)));

		return validateTransactionsResponse;
	}

	public validateTransactionAgainstTransactionsInPool(
		transaction: Transaction,
	): boolean {
		// TODO: remove the condition for checking `verifyTransactionAgainstOtherTransactions` exists, because it should always exist
		return transaction.verifyTransactionAgainstOtherTransactions
			? transaction.verifyTransactionAgainstOtherTransactions([
					...this.queues.ready.transactions,
					...this.queues.pending.transactions,
					...this.queues.verified.transactions,
			  ])
			: true;
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
}