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
import { EventEmitter } from 'events';

import { Job } from './job';
import { MinHeap } from './min_heap';
import { TransactionList } from './transaction_list';
import {
	Status,
	Transaction,
	TransactionResponse,
	TransactionStatus,
} from './types';

type ApplyFunction = (
	transactions: ReadonlyArray<Transaction>,
) => Promise<ReadonlyArray<TransactionResponse>>;

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: bigint;
	readonly minReplacementFeeDifference?: bigint;
	// tslint:disable-next-line no-mixed-interface
	readonly applyTransaction: ApplyFunction;
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
	private readonly _minReplacementFeeDifference: bigint;
	private readonly _reorganizeJob: Job<void>;
	private readonly _feePriorityQueue: MinHeap<string, bigint>;
	private readonly _expireJob: Job<void>;

	public constructor(config: TransactionPoolConfig) {
		this.events = new EventEmitter();
		this._feePriorityQueue = new MinHeap<string, bigint>();
		this._allTransactions = {};
		this._transactionList = {};
		this._applyFunction = config.applyTransaction;
		this._maxTransactions = config.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS;
		this._maxTransactionsPerAccount =
			config.maxTransactionsPerAccount ?? DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT;
		this._transactionExpiryTime =
			config.transactionExpiryTime ?? DEFAULT_EXPIRY_TIME;
		this._minEntranceFeePriority =
			config.minEntranceFeePriority ?? DEFAULT_MIN_ENTRANCE_FEE_PRIORITY;
		this._minReplacementFeeDifference =
			config.minReplacementFeeDifference ??
			DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
		this._reorganizeJob = new Job(
			() => this._reorganize(),
			DEFAULT_REORGANIZE_TIME,
		);
		this._expireJob = new Job(() => this._expire(), DEFAULT_EXPIRE_TIME);

		// FIXME: This is log to supress ts build error
		console.log(this._transactionExpiryTime);
	}

	public async start(): Promise<void> {
		await this._reorganizeJob.start();
		await this._expireJob.start();
	}

	public stop(): void {
		this._reorganizeJob.stop();
		this._expireJob.stop();
	}

	public getAllTransactions(): ReadonlyArray<Transaction> {
		return Object.values(this._allTransactions);
	}

	public get(id: string): Transaction | undefined {
		return this._allTransactions[id];
	}

	public contains(id: string): boolean {
		return this._allTransactions[id] !== undefined;
	}

	public async addTransaction(incomingTx: Transaction): Promise<boolean> {
		// Check for duplicate
		if (this._allTransactions[incomingTx.id]) {
			return false;
		}
		// Check for minimum entrance fee to the TxPool and if its low then reject the incoming tx
		incomingTx.feePriority = this._calculateFeePriority(incomingTx);
		if (incomingTx.feePriority < this._minEntranceFeePriority) {
			return false;
		}

		// Check if incoming transaction fee is greater than the minimum fee in the TxPool if the TxPool is full
		const lowestFeePriorityTrx = this._feePriorityQueue.peek();
		if (
			Object.keys(this._allTransactions).length >= this._maxTransactions &&
			lowestFeePriorityTrx &&
			incomingTx.feePriority <= lowestFeePriorityTrx.key
		) {
			return false;
		}
		this._feePriorityQueue.push(incomingTx.feePriority, incomingTx.id);

		const incomingTxAddress = getAddressFromPublicKey(
			incomingTx.senderPublicKey,
		);

		const txResponse = await this._applyFunction([incomingTx]);
		const txStatus = this._getStatus(txResponse);

		// If applyTransaction fails for the transaction then throw error
		if (txStatus === TransactionStatus.INVALID) {
			throw new Error(
				`Transaction with transaction id ${incomingTx.id} is an invalid transaction`,
			);
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

		// Add received time to the incoming tx object
		incomingTx.receivedAt = new Date();
		this._allTransactions[incomingTx.id] = incomingTx;

		// Add to feePriorityQueue
		this._feePriorityQueue.push(
			this._calculateFeePriority(incomingTx),
			incomingTx.id,
		);
		// Add the transaction in the _transactionList
		return this._transactionList[incomingTxAddress].add(
			incomingTx,
			txStatus === TransactionStatus.PROCESSABLE,
		);
	}

	public removeTransaction(tx: Transaction): boolean {
		const foundTx = this._allTransactions[tx.id];
		if (!foundTx) {
			return false;
		}

		delete this._allTransactions[tx.id];
		this._transactionList[
			getAddressFromPublicKey(foundTx.senderPublicKey)
		].remove(tx.nonce);

		// Remove from feePriorityQueue
		this._feePriorityQueue.clear();
		for (const txObject of this.getAllTransactions()) {
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
			processableTransactions[address] = [...transactions];
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
			return TransactionStatus.PROCESSABLE;
		}
		const txResponseErrors = txResponse[0].errors;
		if (
			txResponse[0].errors.length === 1 &&
			txResponseErrors[0].dataPath === '.nonce' &&
			txResponseErrors[0].actual &&
			txResponseErrors[0].expected &&
			txResponseErrors[0].actual > txResponseErrors[0].expected
		) {
			return TransactionStatus.UNPROCESSABLE;
		}

		return TransactionStatus.INVALID;
	}

	private async _reorganize(): Promise<void> {
		/* 
			Promote transactions and remove invalid and subsequent transactions by nonce
		*/
		for (const txList of Object.values(this._transactionList)) {
			const allSortedTransactionsInList = txList.getAll();
			const promotableTransactions = txList.getPromotable();

			// If no promotable transactions, check next list
			if (!(promotableTransactions.length > 0)) {
				continue;
			}

			const applyResults = await this._applyFunction([
				...allSortedTransactionsInList,
			]);
			const successfulTransactions: string[] = [];
			let firstInvalidTransactionId: string | undefined;
			for (const result of applyResults) {
				// If a tx is invalid, all subsequent are also invalid, so exit loop.
				if (result.status === Status.FAIL) {
					firstInvalidTransactionId = result.id;
					break;
				}
				successfulTransactions.push(result.id);
			}
			// Promote all transactions which were successful
			txList.promote(
				promotableTransactions.filter(tx =>
					successfulTransactions.includes(tx.id),
				),
			);

			// Remove invalid transaction and all subsequent transactions
			const invalidTransaction = firstInvalidTransactionId
				? allSortedTransactionsInList.find(
						tx => tx.id == firstInvalidTransactionId,
				  )
				: undefined;
			if (invalidTransaction) {
				for (const tx of allSortedTransactionsInList) {
					if (tx.nonce >= invalidTransaction.nonce) {
						this.removeTransaction(tx);
					}
				}
			}
		}

		/* 
			Evict transactions if pool is full 
				1. Evict unprocessable by fee priority
				2. Evict processable by fee priority and highest nonce
		*/
		const exceededTransactionsCount =
			Object.keys(this._allTransactions).length - this._maxTransactions;

		if (exceededTransactionsCount > 0) {
			let evictedTransactionsCount = 0;
			const unprocessableFeePriorityHeap = new MinHeap<number, Transaction>();

			// Loop through tx lists and push unprocessable tx to fee priority heap
			for (const txList of Object.values(this._transactionList)) {
				const unprocessableTransactions = txList.getUnprocessable();

				for (const unprocessableTx of unprocessableTransactions) {
					unprocessableFeePriorityHeap.push(
						unprocessableTx,
						unprocessableTx.feePriority,
					);
				}
			}

			// Evict unprocessable transactions by fee priority
			while (
				evictedTransactionsCount < exceededTransactionsCount &&
				unprocessableFeePriorityHeap.count
			) {
				const evictedTransaction = unprocessableFeePriorityHeap.pop();
				evictedTransactionsCount = this.removeTransaction(
					evictedTransaction?.key as Transaction,
				)
					? evictedTransactionsCount + 1
					: evictedTransactionsCount;
			}

			// Evict processable by fee priority and highest nonce
			while (evictedTransactionsCount < exceededTransactionsCount) {
				const processableFeePriorityHeap = new MinHeap<number, Transaction>();
				// Create fee priority heap with highest nonce tx from each tx list
				for (const txList of Object.values(this._transactionList)) {
					// Push highest nonce tx to processable fee priorty heap
					const processableTransactions = txList.getProcessable();
					const processableTransactionWithHighestNonce =
						processableTransactions[processableTransactions.length - 1];
					if (processableTransactions.length) {
						processableFeePriorityHeap.push(
							processableTransactionWithHighestNonce,
							processableTransactionWithHighestNonce.feePriority,
						);
					}
				}

				while (
					evictedTransactionsCount < exceededTransactionsCount &&
					processableFeePriorityHeap.count
				) {
					const evictedTransaction = processableFeePriorityHeap.pop();
					evictedTransactionsCount = this.removeTransaction(
						evictedTransaction?.key as Transaction,
					)
						? evictedTransactionsCount + 1
						: evictedTransactionsCount;
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

			if (timeDifference > DEFAULT_EXPIRY_TIME) {
				this.removeTransaction(transaction);
			}
		}
	}
}
