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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as Debug from 'debug';
import { EventEmitter } from 'events';

import { TransactionPoolError } from './errors';
import { Job } from './job';
import { MinHeap } from './min_heap';
import { TransactionList } from './transaction_list';
import {
	Status,
	Transaction,
	TransactionError,
	TransactionResponse,
	TransactionStatus,
} from './types';

const debug = Debug('lisk:transaction_pool');

type ApplyFunction = (
	transactions: ReadonlyArray<Transaction>,
) => Promise<ReadonlyArray<TransactionResponse>>;

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: bigint;
	readonly transactionReorganizationInterval?: number;
	readonly minReplacementFeeDifference?: bigint;
	// tslint:disable-next-line no-mixed-interface
	readonly applyTransactions: ApplyFunction;
}

interface AddTransactionResponse {
	readonly status: Status;
	readonly errors: ReadonlyArray<TransactionError>;
}

export const DEFAULT_MAX_TRANSACTIONS = 4096;
export const DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT = 64;
export const DEFAULT_MIN_ENTRANCE_FEE_PRIORITY = BigInt(1);
// tslint:disable-next-line no-magic-numbers
export const DEFAULT_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 hours in ms
// tslint:disable-next-line no-magic-numbers
export const DEFAULT_EXPIRE_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
// tslint:disable-next-line no-magic-numbers
export const DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE = BigInt(10);
export const DEFAULT_REORGANIZE_TIME = 500;

// FIXME: Remove this once implemented
// tslint:disable
export class TransactionPool {
	public events: EventEmitter;

	private _allTransactions: { [id: string]: Transaction };
	private _transactionList: { [address: string]: TransactionList };
	private readonly _applyFunction: ApplyFunction;
	private readonly _maxTransactions: number;
	private readonly _maxTransactionsPerAccount: number;
	private readonly _transactionExpiryTime: number;
	private readonly _minEntranceFeePriority: bigint;
	private readonly _transactionReorganizationInterval: number;
	private readonly _minReplacementFeeDifference: bigint;
	private readonly _reorganizeJob: Job<void>;
	private readonly _feePriorityQueue: MinHeap<string, bigint>;
	private readonly _expireJob: Job<void>;

	public constructor(config: TransactionPoolConfig) {
		this.events = new EventEmitter();
		this._feePriorityQueue = new MinHeap<string, bigint>();
		this._allTransactions = {};
		this._transactionList = {};
		this._applyFunction = config.applyTransactions;
		this._maxTransactions = config.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS;
		this._maxTransactionsPerAccount =
			config.maxTransactionsPerAccount ?? DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT;
		this._transactionExpiryTime =
			config.transactionExpiryTime ?? DEFAULT_EXPIRY_TIME;
		this._minEntranceFeePriority =
			config.minEntranceFeePriority ?? DEFAULT_MIN_ENTRANCE_FEE_PRIORITY;
		this._transactionReorganizationInterval =
			config.transactionReorganizationInterval ?? DEFAULT_REORGANIZE_TIME;
		this._minReplacementFeeDifference =
			config.minReplacementFeeDifference ??
			DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
		this._reorganizeJob = new Job(
			() => this._reorganize(),
			this._transactionReorganizationInterval,
		);
		this._expireJob = new Job(() => this._expire(), DEFAULT_EXPIRE_INTERVAL);
	}

	public async start(): Promise<void> {
		this._reorganizeJob.start();
		this._expireJob.start();
	}

	public stop(): void {
		this._reorganizeJob.stop();
		this._expireJob.stop();
	}

	public getAll(): ReadonlyArray<Transaction> {
		return Object.values(this._allTransactions);
	}

	public get(id: string): Transaction | undefined {
		return this._allTransactions[id];
	}

	public contains(id: string): boolean {
		return this._allTransactions[id] !== undefined;
	}

	/*
	1. Reject duplicate transaction
	2. Reject the transaction with lower feePriority than the minEntrancefeePriority
	3. Reject the transaction when its feePriority is lower than the lowest feePriority present in the TxPool.
	4. Apply the transaction using applyFunction and check if it is PROCESSABLE, UNPROCESSABLE or INVALID.
	5. If PROCESSABLE or UNPROCESSABLE then add it to transactionList and feePriorityQueue, if INVALID then return a relevant error
	*/
	public async add(incomingTx: Transaction): Promise<AddTransactionResponse> {
		// Check for duplicate
		if (this._allTransactions[incomingTx.id]) {
			debug('Received duplicate transaction', incomingTx.id);

			// Since we receive too many duplicate transactions
			// To avoid too many errors we are returning Status.OK
			return { status: Status.OK, errors: [] };
		}

		// Check for minimum entrance fee priority to the TxPool and if its low then reject the incoming tx
		incomingTx.feePriority = this._calculateFeePriority(incomingTx);
		if (incomingTx.feePriority < this._minEntranceFeePriority) {
			const error = new TransactionPoolError(
				`Rejecting transaction due to failed minimum entrance fee priority requirement`,
				incomingTx.id,
				'.fee',
				incomingTx.feePriority.toString(),
				this._minEntranceFeePriority.toString(),
			);

			return { status: Status.FAIL, errors: [error] };
		}

		// Check if incoming transaction fee is greater than the minimum fee priority in the TxPool if the TxPool is full
		const lowestFeePriorityTrx = this._feePriorityQueue.peek();
		if (
			Object.keys(this._allTransactions).length >= this._maxTransactions &&
			lowestFeePriorityTrx &&
			incomingTx.feePriority <= lowestFeePriorityTrx.key
		) {
			const error = new TransactionPoolError(
				`Rejecting transaction due to fee priority when the pool is full`,
				incomingTx.id,
				'.fee',
				incomingTx.feePriority.toString(),
				lowestFeePriorityTrx.key.toString(),
			);

			return { status: Status.FAIL, errors: [error] };
		}

		const incomingTxAddress = getAddressFromPublicKey(
			incomingTx.senderPublicKey,
		);

		// _applyFunction is injected from chain module applyTransaction
		const transactionsResponses = await this._applyFunction([incomingTx]);
		const txStatus = this._getStatus(transactionsResponses);

		// If applyTransaction fails for the transaction then throw error
		if (txStatus === TransactionStatus.INVALID) {
			return { status: Status.FAIL, errors: transactionsResponses[0].errors };
		}

		/*
			Evict transactions if pool is full
				1. Evict unprocessable by fee priority
				2. Evict processable by fee priority and highest nonce
		*/
		const exceededTransactionsCount =
			Object.keys(this._allTransactions).length - this._maxTransactions;

		if (exceededTransactionsCount > 0) {
			const isEvicted = this._evictUnprocessable();

			if (!isEvicted) {
				this._evictProcessable();
			}
		}

		// Add address of incoming trx if it doesn't exist in transaction list
		if (!this._transactionList[incomingTxAddress]) {
			this._transactionList[incomingTxAddress] = new TransactionList(
				incomingTxAddress,
				{
					maxSize: this._maxTransactionsPerAccount,
					minReplacementFeeDifference: this._minReplacementFeeDifference,
				},
			);
		}

		// Add the PROCESSABLE, UNPROCESSABLE transaction to _transactionList and set PROCESSABLE as true
		const { added, removedID } = this._transactionList[incomingTxAddress].add(
			incomingTx,
			txStatus === TransactionStatus.PROCESSABLE,
		);

		if (!added) {
			return {
				status: Status.FAIL,
				errors: [
					new TransactionPoolError(
						'Transaction was not added because of nonce or fee',
						incomingTx.id,
					),
				],
			};
		}

		if (removedID) {
			debug('Removing from transaction pool with id', removedID);
			delete this._allTransactions[removedID];
		}

		// Add received time to the incoming tx object
		incomingTx.receivedAt = new Date();
		this._allTransactions[incomingTx.id] = incomingTx;

		// Add to feePriorityQueue
		this._feePriorityQueue.push(
			this._calculateFeePriority(incomingTx),
			incomingTx.id,
		);

		return { status: Status.OK, errors: [] };
	}

	public remove(tx: Transaction): boolean {
		const foundTx = this._allTransactions[tx.id];
		if (!foundTx) {
			return false;
		}

		delete this._allTransactions[tx.id];
		debug('Removing from transaction pool with id', tx.id);
		const senderId = getAddressFromPublicKey(foundTx.senderPublicKey);
		this._transactionList[senderId].remove(tx.nonce);
		if (this._transactionList[senderId].size === 0) {
			delete this._transactionList[senderId];
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

	public getProcessableTransactions(): {
		readonly [address: string]: ReadonlyArray<Transaction>;
	} {
		const processableTransactions: {
			[address: string]: ReadonlyArray<Transaction>;
		} = {};
		for (const address of Object.keys(this._transactionList)) {
			const transactions = this._transactionList[address].getProcessable();
			if (transactions.length !== 0) {
				processableTransactions[address] = [...transactions];
			}
		}

		return processableTransactions;
	}

	private _calculateFeePriority(trx: Transaction): bigint {
		return (trx.fee - trx.minFee) / BigInt(trx.getBytes().length);
	}

	private _getStatus(
		txResponse: ReadonlyArray<TransactionResponse>,
	): TransactionStatus {
		if (txResponse[0].status === Status.OK) {
			debug('Received PROCESSABLE transaction');

			return TransactionStatus.PROCESSABLE;
		}
		const txResponseErrors = txResponse[0].errors;
		if (
			txResponse[0].errors.length === 1 &&
			txResponseErrors[0].dataPath === '.nonce' &&
			txResponseErrors[0].actual &&
			txResponseErrors[0].expected &&
			BigInt(txResponseErrors[0].actual) > BigInt(txResponseErrors[0].expected)
		) {
			debug('Received UNPROCESSABLE transaction');

			return TransactionStatus.UNPROCESSABLE;
		}

		debug('Received INVALID transaction');
		return TransactionStatus.INVALID;
	}

	private _evictUnprocessable(): boolean {
		const unprocessableFeePriorityHeap = new MinHeap<Transaction>();
		// Loop through tx lists and push unprocessable tx to fee priority heap
		for (const txList of Object.values(this._transactionList)) {
			const unprocessableTransactions = txList.getUnprocessable();

			for (const unprocessableTx of unprocessableTransactions) {
				unprocessableFeePriorityHeap.push(
					unprocessableTx.feePriority as bigint,
					unprocessableTx,
				);
			}
		}

		if (unprocessableFeePriorityHeap.count < 1) {
			return false;
		}

		const evictedTransaction = unprocessableFeePriorityHeap.pop();

		if (!evictedTransaction) {
			return false;
		}

		return this.remove(evictedTransaction.value);
	}

	private _evictProcessable(): boolean {
		const processableFeePriorityHeap = new MinHeap<Transaction>();
		// Loop through tx lists and push processable tx to fee priority heap
		for (const txList of Object.values(this._transactionList)) {
			// Push highest nonce tx to processable fee priorty heap
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

		return this.remove(evictedTransaction.value);
	}

	private async _reorganize(): Promise<void> {
		/*
			Promote transactions and remove invalid and subsequent transactions by nonce
		*/
		for (const txList of Object.values(this._transactionList)) {
			const promotableTransactions = txList.getPromotable();
			// If no promotable transactions, check next list
			if (!promotableTransactions.length) {
				continue;
			}
			const processableTransactions = txList.getProcessable();
			const allTransactions = [
				...processableTransactions,
				...promotableTransactions,
			];
			const applyResults = await this._applyFunction(allTransactions);

			const successfulTransactionIds: string[] = [];
			let firstInvalidTransactionId: string | undefined;

			for (const result of applyResults) {
				// If a tx is invalid, all subsequent are also invalid, so exit loop.
				if (result.status === Status.FAIL) {
					firstInvalidTransactionId = result.id;
					break;
				}
				successfulTransactionIds.push(result.id);
			}

			// Promote all transactions which were successful
			txList.promote(
				promotableTransactions.filter(tx =>
					successfulTransactionIds.includes(tx.id),
				),
			);

			// Remove invalid transaction and all subsequent transactions
			const invalidTransaction = firstInvalidTransactionId
				? allTransactions.find(tx => tx.id == firstInvalidTransactionId)
				: undefined;

			if (invalidTransaction) {
				for (const tx of allTransactions) {
					if (tx.nonce >= invalidTransaction.nonce) {
						this.remove(tx);
					}
				}
			}
		}
	}

	private async _expire(): Promise<void> {
		for (const transaction of Object.values(this._allTransactions)) {
			const timeDifference = Math.round(
				Math.abs(
					(transaction.receivedAt as Date).getTime() - new Date().getTime(),
				),
			);
			if (timeDifference > this._transactionExpiryTime) {
				this.remove(transaction);
			}
		}
	}
}
