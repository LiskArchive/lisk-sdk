/*
 * Copyright © 2020 Lisk Foundation
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
import { address } from '@liskhq/lisk-cryptography';
import * as createDebug from 'debug';
import { EventEmitter } from 'events';
import { dataStructures } from '@liskhq/lisk-utils';

import { TransactionPoolError } from './errors';
import { Job } from './job';
import { TransactionList } from './transaction_list';
import { Status, Transaction, TransactionStatus } from './types';

const debug = createDebug('lisk:transaction_pool');

type VerifyFunction = (transaction: Transaction) => Promise<TransactionStatus>;

interface StateMachineWithLockOnly {
	executeLock: boolean;
}

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: bigint;
	readonly transactionReorganizationInterval?: number;
	readonly minReplacementFeeDifference?: bigint;
	readonly maxPayloadLength: number;
	readonly stateMachine: StateMachineWithLockOnly | undefined;
	verifyTransaction(transaction: Transaction): Promise<number>;
}

interface AddTransactionResponse {
	readonly status: Status;
	readonly error?: Error;
}

export const DEFAULT_MAX_TRANSACTIONS = 4096;
export const DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT = 64;
export const DEFAULT_MIN_ENTRANCE_FEE_PRIORITY = BigInt(0);
export const DEFAULT_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 hours in ms
export const DEFAULT_EXPIRE_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
export const DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE = BigInt(10);
export const DEFAULT_REORGANIZE_TIME = 500;
export const events = {
	EVENT_TRANSACTION_REMOVED: 'EVENT_TRANSACTION_REMOVED',
	EVENT_TRANSACTION_ADDED: 'EVENT_TRANSACTION_ADDED',
};

export class TransactionPool {
	public events: EventEmitter;

	private readonly _allTransactions: dataStructures.BufferMap<Transaction>;
	private readonly _transactionList: dataStructures.BufferMap<TransactionList>;
	private readonly _verifyFunction: VerifyFunction;
	private readonly _maxTransactions: number;
	private readonly _maxTransactionsPerAccount: number;
	private readonly _transactionExpiryTime: number;
	private readonly _minEntranceFeePriority: bigint;
	private readonly _transactionReorganizationInterval: number;
	private readonly _minReplacementFeeDifference: bigint;
	private readonly _maxPayloadLength: number;
	private readonly _reorganizeJob: Job<void>;
	private readonly _feePriorityQueue: dataStructures.MinHeap<Buffer, bigint>;
	private readonly _expireJob: Job<void>;
	private readonly _stateMachine: StateMachineWithLockOnly | undefined;

	public constructor(config: TransactionPoolConfig) {
		this.events = new EventEmitter();
		this._feePriorityQueue = new dataStructures.MinHeap<Buffer, bigint>();
		this._allTransactions = new dataStructures.BufferMap<Transaction>();
		this._transactionList = new dataStructures.BufferMap<TransactionList>();
		// eslint-disable-next-line @typescript-eslint/unbound-method
		this._verifyFunction = config.verifyTransaction;
		this._maxTransactions = config.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS;
		this._maxTransactionsPerAccount =
			config.maxTransactionsPerAccount ?? DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT;
		this._transactionExpiryTime = config.transactionExpiryTime ?? DEFAULT_EXPIRY_TIME;
		this._minEntranceFeePriority =
			config.minEntranceFeePriority ?? DEFAULT_MIN_ENTRANCE_FEE_PRIORITY;
		this._transactionReorganizationInterval =
			config.transactionReorganizationInterval ?? DEFAULT_REORGANIZE_TIME;
		this._minReplacementFeeDifference =
			config.minReplacementFeeDifference ?? DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
		this._maxPayloadLength = config.maxPayloadLength;
		this._reorganizeJob = new Job(
			async () => this._reorganize(),
			this._transactionReorganizationInterval,
		);
		this._expireJob = new Job(async () => this._expire(), DEFAULT_EXPIRE_INTERVAL);
		this._stateMachine = config.stateMachine;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async start(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this._reorganizeJob.start();
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this._expireJob.start();
	}

	public stop(): void {
		this._reorganizeJob.stop();
		this._expireJob.stop();
	}

	public getAll(): ReadonlyArray<Transaction> {
		return this._allTransactions.values();
	}

	public get(id: Buffer): Transaction | undefined {
		return this._allTransactions.get(id);
	}

	public contains(id: Buffer): boolean {
		return this._allTransactions.has(id);
	}

	/*
	1. Reject duplicate transaction
	2. Reject the transaction with lower feePriority than the minEntranceFeePriority
	3. Reject the transaction when its feePriority is lower than the lowest feePriority present in the TxPool.
	4. Apply the transaction using applyFunction and check if it is PROCESSABLE, UNPROCESSABLE or INVALID.
	5. If PROCESSABLE or UNPROCESSABLE then add it to transactionList and feePriorityQueue, if INVALID then return a relevant error
	*/
	public async add(incomingTx: Transaction): Promise<AddTransactionResponse> {
		// Reject a transaction when its size is greater than maxPayloadLength
		if (incomingTx.getBytes().byteLength > this._maxPayloadLength) {
			const error = new TransactionPoolError(
				`Transaction byte length is greater than ${this._maxPayloadLength}`,
				incomingTx.id,
			);

			return { status: Status.FAIL, error };
		}
		// Check for duplicate
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (this._allTransactions.has(incomingTx.id)) {
			debug('Received duplicate transaction', incomingTx.id);

			// Since we receive too many duplicate transactions
			// To avoid too many errors we are returning Status.OK
			return { status: Status.OK };
		}

		// Check for minimum entrance fee priority to the TxPool and if its low then reject the incoming tx
		// eslint-disable-next-line no-param-reassign
		incomingTx.feePriority = this._calculateFeePriority(incomingTx);

		if (incomingTx.feePriority < this._minEntranceFeePriority) {
			const error = new TransactionPoolError(
				'Rejecting transaction due to failed minimum entrance fee priority requirement.',
				incomingTx.id,
				'.fee',
				incomingTx.feePriority.toString(),
				this._minEntranceFeePriority.toString(),
			);

			return { status: Status.FAIL, error };
		}

		// Check if incoming transaction fee is greater than the minimum fee priority in the TxPool if the TxPool is full
		const lowestFeePriorityTrx = this._feePriorityQueue.peek();
		if (
			this._allTransactions.size >= this._maxTransactions &&
			lowestFeePriorityTrx &&
			incomingTx.feePriority <= lowestFeePriorityTrx.key
		) {
			let totalUnprocessable = 0;
			for (const txList of this._transactionList.values()) {
				totalUnprocessable += txList.getUnprocessable().length;
			}

			// If TxPool is full with only unprocessable transactions then it will evict the transaction with the lowestFeePriority
			if (totalUnprocessable >= Math.floor(this._maxTransactions / 2)) {
				this._evictUnprocessable();
			} else {
				const error = new TransactionPoolError(
					'Rejecting transaction due to fee priority when the pool is full.',
					incomingTx.id,
					'.fee',
					incomingTx.feePriority.toString(),
					lowestFeePriorityTrx.key.toString(),
				);

				return { status: Status.FAIL, error };
			}
		}

		const incomingTxAddress = address.getAddressFromPublicKey(incomingTx.senderPublicKey);

		// _verifyFunction is injected from user through constructor
		const txStatus = await this._verifyFunction(incomingTx);
		if (txStatus === TransactionStatus.INVALID) {
			return {
				status: Status.FAIL,
				error: new Error('Invalid transaction'),
			};
		}
		/*
			Evict transactions if pool is full
				1. Evict unprocessable by fee priority
				2. Evict processable by fee priority and highest nonce
		*/
		const exceededTransactionsCount = this._allTransactions.size - this._maxTransactions;

		if (exceededTransactionsCount >= 0) {
			const isEvicted = this._evictUnprocessable();

			if (!isEvicted) {
				this._evictProcessable();
			}
		}

		// Add address of incoming trx if it doesn't exist in transaction list
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!this._transactionList.has(incomingTxAddress)) {
			this._transactionList.set(
				incomingTxAddress,
				new TransactionList(incomingTxAddress, {
					maxSize: this._maxTransactionsPerAccount,
					minReplacementFeeDifference: this._minReplacementFeeDifference,
				}),
			);
		}
		// Add the PROCESSABLE, UNPROCESSABLE transaction to _transactionList and set PROCESSABLE as true
		const { added, removedID, reason } = (
			this._transactionList.get(incomingTxAddress) as TransactionList
		).add(incomingTx, txStatus === TransactionStatus.PROCESSABLE);

		if (!added) {
			return {
				status: Status.FAIL,
				error: new TransactionPoolError(reason, incomingTx.id),
			};
		}

		if (removedID) {
			debug('Removing from transaction pool with id', removedID);
			const removedTx = this._allTransactions.get(removedID) as Transaction;
			this._allTransactions.delete(removedID);
			this.events.emit(events.EVENT_TRANSACTION_REMOVED, {
				id: removedTx.id,
				nonce: removedTx.nonce.toString(),
				senderPublicKey: removedTx.senderPublicKey,
				reason: 'Transaction List executed remove',
			});
		}

		// Add received time to the incoming tx object
		// eslint-disable-next-line no-param-reassign
		incomingTx.receivedAt = new Date();
		this._allTransactions.set(incomingTx.id, incomingTx);

		// Add to feePriorityQueue
		this._feePriorityQueue.push(this._calculateFeePriority(incomingTx), incomingTx.id);

		this.events.emit(events.EVENT_TRANSACTION_ADDED, { transaction: incomingTx });
		return { status: Status.OK };
	}

	public remove(tx: Transaction): boolean {
		const foundTx = this._allTransactions.get(tx.id);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!foundTx) {
			return false;
		}

		this._allTransactions.delete(tx.id);
		debug('Removing from transaction pool with id', tx.id);
		const senderId = address.getAddressFromPublicKey(foundTx.senderPublicKey);
		(this._transactionList.get(senderId) as TransactionList).remove(tx.nonce);
		if ((this._transactionList.get(senderId) as TransactionList).size === 0) {
			this._transactionList.delete(senderId);
		}

		// Remove from feePriorityQueue
		this._feePriorityQueue.clear();
		for (const txObject of this.getAll()) {
			this._feePriorityQueue.push(
				txObject.feePriority ?? this._calculateFeePriority(txObject),
				txObject.id,
			);
		}

		return true;
	}

	public getProcessableTransactions(): dataStructures.BufferMap<Transaction[]> {
		const processableTransactions = new dataStructures.BufferMap<Transaction[]>();
		for (const list of this._transactionList.values()) {
			const transactions = list.getProcessable();
			if (transactions.length !== 0) {
				processableTransactions.set(list.address, [...transactions]);
			}
		}

		return processableTransactions;
	}

	private _calculateFeePriority(trx: Transaction): bigint {
		return trx.fee / BigInt(trx.getBytes().length);
	}

	private _evictUnprocessable(): boolean {
		const unprocessableFeePriorityHeap = new dataStructures.MinHeap<Transaction>();
		// Loop through tx lists and push unprocessable tx to fee priority heap
		for (const txList of this._transactionList.values()) {
			const unprocessableTransactions = txList.getUnprocessable();

			for (const unprocessableTx of unprocessableTransactions) {
				unprocessableFeePriorityHeap.push(unprocessableTx.feePriority as bigint, unprocessableTx);
			}
		}

		if (unprocessableFeePriorityHeap.count < 1) {
			return false;
		}

		const evictedTransaction = unprocessableFeePriorityHeap.pop();

		if (!evictedTransaction) {
			return false;
		}

		this.events.emit(events.EVENT_TRANSACTION_REMOVED, {
			id: evictedTransaction.value.id,
			nonce: evictedTransaction.value.nonce.toString(),
			senderPublicKey: evictedTransaction.value.senderPublicKey,
			reason: 'Pool exceeded the size limit',
		});
		return this.remove(evictedTransaction.value);
	}

	private _evictProcessable(): boolean {
		const processableFeePriorityHeap = new dataStructures.MinHeap<Transaction>();
		// Loop through tx lists and push processable tx to fee priority heap
		for (const txList of this._transactionList.values()) {
			// Push highest nonce tx to processable fee priority heap
			const processableTransactions = txList.getProcessable();
			if (processableTransactions.length) {
				const processableTransactionWithHighestNonce =
					processableTransactions[processableTransactions.length - 1];
				processableFeePriorityHeap.push(
					processableTransactionWithHighestNonce.feePriority as bigint,
					processableTransactionWithHighestNonce,
				);
			}
		}

		if (processableFeePriorityHeap.count < 1) {
			return false;
		}

		const evictedTransaction = processableFeePriorityHeap.pop();

		if (!evictedTransaction) {
			return false;
		}

		this.events.emit(events.EVENT_TRANSACTION_REMOVED, {
			id: evictedTransaction.value.id,
			nonce: evictedTransaction.value.nonce.toString(),
			senderPublicKey: evictedTransaction.value.senderPublicKey,
			reason: 'Pool exceeded the size limit',
		});
		return this.remove(evictedTransaction.value);
	}

	private async _reorganize(): Promise<void> {
		/*
			Promote transactions and remove invalid and subsequent transactions by nonce
		*/
		if (this._stateMachine?.executeLock) {
			return;
		}

		for (const txList of this._transactionList.values()) {
			const promotableTransactions = txList.getPromotable();
			// If no promotable transactions, check next list
			if (!promotableTransactions.length) {
				continue;
			}
			const processableTransactions = txList.getProcessable();
			const allTransactions = [...processableTransactions, ...promotableTransactions];
			const verifyResults = [];
			const successfulTransactionIDs: Buffer[] = [];

			for (let i = 0; i < allTransactions.length; i += 1) {
				const transaction = allTransactions[i];
				try {
					const status = await this._verifyFunction(transaction);
					verifyResults.push({
						id: transaction.id,
						status,
						transaction,
					});
					if (status === TransactionStatus.INVALID) {
						break;
					}
					if (status === TransactionStatus.UNPROCESSABLE) {
						// if the first transaction is unprocessable, then it's not processable
						if (successfulTransactionIDs.length === 0) {
							break;
						}
						// if the nonce is not sequential from the previous successful one, then it's not processable
						// at least 1 successfulTransactionIDs means at least one verifyResults
						if (verifyResults[i - 1].transaction.nonce + BigInt(1) !== transaction.nonce) {
							break;
						}
					}
					successfulTransactionIDs.push(transaction.id);
				} catch (error) {
					verifyResults.push({
						id: transaction.id,
						status: TransactionStatus.INVALID,
						transaction,
					});
					break;
				}
			}

			// Promote all transactions which were successful
			txList.promote(promotableTransactions.filter(tx => successfulTransactionIDs.includes(tx.id)));

			// Remove invalid transaction and all subsequent transactions
			const firstInvalidTransaction = verifyResults.find(
				r => r.status === TransactionStatus.INVALID,
			);
			const invalidTransaction = firstInvalidTransaction
				? allTransactions.find(tx => tx.id.equals(firstInvalidTransaction.id))
				: undefined;

			if (invalidTransaction) {
				for (const tx of allTransactions) {
					if (tx.nonce >= invalidTransaction.nonce) {
						this.events.emit(events.EVENT_TRANSACTION_REMOVED, {
							id: tx.id,
							nonce: tx.nonce.toString(),
							senderPublicKey: tx.senderPublicKey,
							reason: `Invalid transaction ${invalidTransaction.id.toString('hex')}`,
						});
						this.remove(tx);
					}
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async _expire(): Promise<void> {
		for (const transaction of this._allTransactions.values()) {
			const timeDifference = Math.round(
				Math.abs((transaction.receivedAt as Date).getTime() - new Date().getTime()),
			);
			if (timeDifference > this._transactionExpiryTime) {
				this.events.emit(events.EVENT_TRANSACTION_REMOVED, {
					id: transaction.id,
					nonce: transaction.nonce.toString(),
					senderPublicKey: transaction.senderPublicKey,
					reason: 'Transaction exceeded the expiry time',
				});
				this.remove(transaction);
			}
		}
	}
}
