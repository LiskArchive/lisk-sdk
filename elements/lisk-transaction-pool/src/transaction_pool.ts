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
import { EventEmitter } from 'events';
import {
	CheckerFunction,
	CheckTransactionsResponseWithPassAndFail,
	CheckTransactionsResponseWithPassFailAndPending,
	checkTransactionsWithPassAndFail,
	checkTransactionsWithPassFailAndPending,
	Status,
	TransactionResponse,
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
	readonly senderId: string;
	containsUniqueData?: boolean;
	verifiedOnce?: boolean;
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
	addVerifiedSignature(signature: string): TransactionResponse;
	isReady(): boolean;
}

export interface TransactionPoolConfiguration {
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
	readonly queueName: QueueNames;
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

export const EVENT_ADDED_TRANSACTIONS = 'transactionsAdded';
export const EVENT_REMOVED_TRANSACTIONS = 'transactionsRemoved';
export const EVENT_VERIFIED_TRANSACTION_ONCE = 'transactionVerifiedOnce';
export const ACTION_ADD_VERIFIED_REMOVED_TRANSACTIONS =
	'addVerifiedRemovedTransactions';
export const ACTION_REMOVE_CONFIRMED_TRANSACTIONS =
	'removeConfirmedTransactions';
export const ACTION_ADD_TRANSACTIONS = 'addTransactions';
export const ACTION_EXPIRE_TRANSACTIONS = 'expireTransactions';
export const ACTION_PROCESS_VERIFIED_TRANSACTIONS =
	'processVerifiedTransactions';
export const ACTION_VALIDATE_RECEIVED_TRANSACTIONS =
	'validateReceivedTransactions';
export const ACTION_VERIFY_VALIDATED_TRANSACTIONS =
	'verifyValidatedTransactions';
export const ACTION_ADD_VERIFIED_TRANSACTIONS = 'addVerifiedTransactions';
export const ACTION_ADD_PENDING_TRANSACTIONS = 'addPendingTransactions';

export class TransactionPool extends EventEmitter {
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
	private readonly _validateTransactionsJob: Job<
		CheckTransactionsResponseWithPassAndFail
	>;
	private readonly _verifyTransactions: CheckerFunction;
	private readonly _verifyTransactionsJob: Job<
		CheckTransactionsResponseWithPassAndFail
	>;
	private readonly _processTransactions: CheckerFunction;
	private readonly _processTransactionsJob: Job<
		CheckTransactionsResponseWithPassAndFail
	>;

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
		super();
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
		// tslint:disable-next-line:no-floating-promises
		this._expireTransactionsJob.start();

		this._receivedTransactionsProcessingInterval = receivedTransactionsProcessingInterval;
		this._receivedTransactionsProcessingLimitPerInterval = receivedTransactionsLimitPerProcessing;
		this._validateTransactions = validateTransactions;

		this._validateTransactionsJob = new Job(
			this.validateReceivedTransactions.bind(this),
			this._receivedTransactionsProcessingInterval,
		);
		// tslint:disable-next-line:no-floating-promises
		this._validateTransactionsJob.start();

		this._validatedTransactionsProcessingInterval = validatedTransactionsProcessingInterval;
		this._validatedTransactionsProcessingLimitPerInterval = validatedTransactionsLimitPerProcessing;
		this._verifyTransactions = verifyTransactions;

		this._verifyTransactionsJob = new Job(
			this.verifyValidatedTransactions.bind(this),
			this._validatedTransactionsProcessingInterval,
		);
		// tslint:disable-next-line:no-floating-promises
		this._verifyTransactionsJob.start();

		this._verifiedTransactionsProcessingInterval = verifiedTransactionsProcessingInterval;
		this._verifiedTransactionsProcessingLimitPerInterval = verifiedTransactionsLimitPerProcessing;
		this._processTransactions = processTransactions;

		this._processTransactionsJob = new Job(
			this.processVerifiedTransactions.bind(this),
			this._verifiedTransactionsProcessingInterval,
		);
		// tslint:disable-next-line:no-floating-promises
		this._processTransactionsJob.start();
	}

	public cleanup(): void {
		this.removeTransactionsFromQueues(
			Object.keys(this.queues),
			queueCheckers.returnTrueUntilLimit(this._maxTransactionsPerQueue),
		);
		this._expireTransactionsJob.stop();
		this._validateTransactionsJob.stop();
		this._verifyTransactionsJob.stop();
		this._processTransactionsJob.stop();
	}

	public addTransaction(transaction: Transaction): AddTransactionResult {
		const receivedQueue: QueueNames = 'received';
		// Transactions which are added to the received queue should fire the event  "EVENT_VERIFIED_TRANSACTION_ONCE"
		// When they are verified for the first time. VerifiedOnce flag is primarily used for it.
		transaction.verifiedOnce = false;

		return this.addTransactionToQueue(receivedQueue, transaction);
	}

	public addPendingTransaction(transaction: Transaction): AddTransactionResult {
		const pendingQueue: QueueNames = 'pending';

		return this.addTransactionToQueue(pendingQueue, transaction);
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

		// Move transactions from the validated queue to the received queue where account was a receipient in the verified removed transactions
		// Rationale is explained in issue #963
		const removedTransactionsByRecipientIdFromValidatedQueue = this._queues.validated.removeFor(
			queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions),
		);

		this._queues.received.enqueueMany(
			removedTransactionsByRecipientIdFromValidatedQueue,
		);

		// Move transactions from the verified, pending and ready queues to the validated queue where account was a receipient in the verified removed transactions
		const removedTransactionsByRecipientIdFromOtherQueues = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions),
		);

		this._queues.validated.enqueueMany(
			removedTransactionsByRecipientIdFromOtherQueues,
		);

		// Add transactions to the verified queue which were included in the verified removed transactions
		this._queues.verified.enqueueMany(transactions);

		this.emit(EVENT_ADDED_TRANSACTIONS, {
			action: ACTION_ADD_VERIFIED_REMOVED_TRANSACTIONS,
			to: 'verified',
			payload: transactions,
		});
	}

	// It is assumed that signature is verified for this transaction before this function is called
	public addVerifiedSignature(
		signatureObject: SignatureObject,
	): TransactionResponse {
		const transaction = this.findInTransactionPool(
			signatureObject.transactionId,
		);
		if (transaction) {
			return transaction.addVerifiedSignature(signatureObject.signature);
		}

		return {
			id: signatureObject.transactionId,
			status: Status.FAIL,
			errors: [new Error('Could not find transaction in transaction pool')],
		};
	}

	public existsInTransactionPool(id: string): boolean {
		return Object.keys(this._queues).reduce(
			(previousValue, queueName) =>
				previousValue || this._queues[queueName].exists(id),
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
			queueCheckers.returnTrueUntilLimit(limit),
		);
	}

	public removeConfirmedTransactions(
		transactions: ReadonlyArray<Transaction>,
	): void {
		// Remove transactions in the transaction pool which were included in the confirmed transactions
		const removedTransactions = this.removeTransactionsFromQueues(
			Object.keys(this._queues),
			queueCheckers.checkTransactionForId(transactions),
		);

		const { received, validated, ...otherQueues } = this._queues;

		const confirmedTransactionsWithUniqueData = transactions.filter(
			(transaction: Transaction) => transaction.containsUniqueData,
		);

		// Remove transactions from the validated queue which were sent from the accounts in the confirmed transactions
		const removedTransactionsBySenderPublicKeysFromValidatedQueue = this._queues.validated.removeFor(
			queueCheckers.checkTransactionForSenderPublicKey(transactions),
		);

		// Remove transactions from the validated queue if they are of a type which includes unique data and that type is included in the confirmed transactions
		const removedTransactionsByTypesFromValidatedQueue = this._queues.validated.removeFor(
			queueCheckers.checkTransactionForTypes(
				confirmedTransactionsWithUniqueData,
			),
		);

		// Add removed transactions from the validated queue to the received queue
		// Rationale is explained in issue #963
		this._queues.received.enqueueMany([
			...removedTransactionsBySenderPublicKeysFromValidatedQueue,
			...removedTransactionsByTypesFromValidatedQueue,
		]);

		// Remove transactions from the verified, pending and ready queues which were sent from the accounts in the confirmed transactions
		const removedTransactionsBySenderPublicKeysFromOtherQueues = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForSenderPublicKey(transactions),
		);

		// Remove all transactions from the verified, pending and ready queues if they are of a type which includes unique data and that type is included in the confirmed transactions
		const removedTransactionsByTypesFromOtherQueues = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForTypes(
				confirmedTransactionsWithUniqueData,
			),
		);

		this.emit(EVENT_REMOVED_TRANSACTIONS, {
			action: ACTION_REMOVE_CONFIRMED_TRANSACTIONS,
			payload: removedTransactions,
		});

		// Add transactions which need to be reverified to the validated queue
		this._queues.validated.enqueueMany([
			...removedTransactionsBySenderPublicKeysFromOtherQueues,
			...removedTransactionsByTypesFromOtherQueues,
		]);
	}

	public reverifyTransactionsFromSenders(
		senderPublicKeys: ReadonlyArray<string>,
	): void {
		const { received, validated, ...otherQueues } = this._queues;
		const senderProperty: queueCheckers.TransactionFilterableKeys =
			'senderPublicKey';

		// Move transactions from the validated queue to the received queue which were sent from sender accounts
		// Rationale is explained in issue #963
		const removedTransactionsBySenderPublicKeysFromValidatedQueue = this._queues.validated.removeFor(
			queueCheckers.checkTransactionPropertyForValues(
				senderPublicKeys,
				senderProperty,
			),
		);

		this._queues.received.enqueueMany(
			removedTransactionsBySenderPublicKeysFromValidatedQueue,
		);

		// Move transactions from the verified, pending and ready queues to the validated queue which were sent from sender accounts
		const removedTransactionsBySenderPublicKeysFromOtherQueues = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionPropertyForValues(
				senderPublicKeys,
				senderProperty,
			),
		);

		this._queues.validated.enqueueMany(
			removedTransactionsBySenderPublicKeysFromOtherQueues,
		);
	}

	// This function is currently unused, the usability of this function will be decided after performance tests
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
		if (this.existsInTransactionPool(transaction.id)) {
			return {
				isFull: false,
				alreadyExists: true,
				queueName,
			};
		}

		if (this._queues[queueName].size() >= this._maxTransactionsPerQueue) {
			return {
				isFull: true,
				alreadyExists: false,
				queueName,
			};
		}
		// Add receivedAt property for the transaction
		transaction.receivedAt = new Date();

		this._queues[queueName].enqueueOne(transaction);

		this.emit(EVENT_ADDED_TRANSACTIONS, {
			action: ACTION_ADD_TRANSACTIONS,
			to: queueName,
			payload: [transaction],
		});

		// If transaction is added to one of the queues which semantically mean that transactions are verified, then fire the event.
		if (queueName === 'verified' || queueName === 'pending') {
			this.emit(EVENT_VERIFIED_TRANSACTION_ONCE, {
				action:
					queueName === 'verified'
						? ACTION_ADD_VERIFIED_TRANSACTIONS
						: ACTION_ADD_PENDING_TRANSACTIONS,
				payload: [transaction],
			});
		}

		return {
			isFull: false,
			alreadyExists: false,
			queueName,
		};
	}

	private async expireTransactions(): Promise<ReadonlyArray<Transaction>> {
		const expiredTransactions = this.removeTransactionsFromQueues(
			Object.keys(this._queues),
			queueCheckers.checkTransactionForExpiry(),
		);

		this.emit(EVENT_REMOVED_TRANSACTIONS, {
			action: ACTION_EXPIRE_TRANSACTIONS,
			payload: expiredTransactions,
		});

		return expiredTransactions;
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
		const removedTransactions = this.removeTransactionsFromQueues(
			Object.keys(otherQueues),
			queueCheckers.checkTransactionForId(failedTransactions),
		);

		// Move all passed transactions to the ready queue
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

		this.emit(EVENT_REMOVED_TRANSACTIONS, {
			action: ACTION_PROCESS_VERIFIED_TRANSACTIONS,
			payload: removedTransactions,
		});

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
		if (
			this.queues.validated.size() >= this._maxTransactionsPerQueue ||
			this.queues.received.size() === 0
		) {
			return {
				passedTransactions: [],
				failedTransactions: [],
			};
		}

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
		const removedTransactions = this._queues.received.removeFor(
			queueCheckers.checkTransactionForId(failedTransactions),
		);
		// Move valid transactions from the received queue to the validated queue
		this._queues.validated.enqueueMany(
			this._queues.received.removeFor(
				queueCheckers.checkTransactionForId(passedTransactions),
			),
		);

		this.emit(EVENT_REMOVED_TRANSACTIONS, {
			action: ACTION_VALIDATE_RECEIVED_TRANSACTIONS,
			payload: removedTransactions,
		});

		return {
			passedTransactions,
			failedTransactions,
		};
	}

	private async verifyValidatedTransactions(): Promise<
		CheckTransactionsResponseWithPassFailAndPending
	> {
		if (
			this.queues.verified.size() >= this._maxTransactionsPerQueue ||
			this.queues.validated.size() === 0
		) {
			return {
				passedTransactions: [],
				failedTransactions: [],
				pendingTransactions: [],
			};
		}

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
		const removedTransactions = this._queues.validated.removeFor(
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

		this.emit(EVENT_REMOVED_TRANSACTIONS, {
			action: ACTION_VERIFY_VALIDATED_TRANSACTIONS,
			payload: removedTransactions,
		});

		// Checking which transactions were verified for the first time, filtering them and firing an event for those transactions
		const transactionsVerifiedForFirstTime = [
			...pendingTransactions,
			...passedTransactions,
		].filter(transaction => transaction.verifiedOnce === false);

		transactionsVerifiedForFirstTime.forEach(
			transaction => delete transaction.verifiedOnce,
		);

		this.emit(EVENT_VERIFIED_TRANSACTION_ONCE, {
			action: ACTION_VERIFY_VALIDATED_TRANSACTIONS,
			payload: transactionsVerifiedForFirstTime,
		});

		return {
			passedTransactions,
			failedTransactions,
			pendingTransactions,
		};
	}
}
