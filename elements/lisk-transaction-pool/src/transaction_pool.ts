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

interface TransactionHandledResult {
	readonly transactionsResponses: ReadonlyArray<TransactionResponse>;
}

type ApplyFunction = (
	transactions: ReadonlyArray<Transaction>,
) => Promise<TransactionHandledResult>;

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: bigint;
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
		this._minReplacementFeeDifference =
			config.minReplacementFeeDifference ??
			DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
		this._reorganizeJob = new Job(
			() => this._reorganize(),
			DEFAULT_REORGANIZE_TIME,
		);
		// FIXME: This is log to supress ts build error
		// Remove this line after using this._transactionExpiryTime
		debug('TransactionPool expiry time', this._transactionExpiryTime);
	}

	public async start(): Promise<void> {
		await this._reorganizeJob.start();
	}

	public stop(): void {
		this._reorganizeJob.stop();
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

	/*
	1. Check if transaction already exists in pool for rejection
	2. Check for minimum entrance fee criteria to the pool for rejection
	3. Check if transaction.fee is greater than the minimum fee in the pool for rejection
	4. Apply transaction and check if its ok to be processable
	5. Add to transactionList and feePriorityQueue
	*/
	public async add(incomingTx: Transaction): Promise<AddTransactionResponse> {
		// Check for duplicate
		if (this._allTransactions[incomingTx.id]) {
			debug('Received duplicate transaction', incomingTx.id);

			// Since we receive too many duplicate transactions
			// To avoid too many errors we are returning Status.OK
			return { status: Status.OK, errors: [] };
		}

		// Check for minimum entrance fee to the TxPool and if its low then reject the incoming tx
		incomingTx.feePriority = this._calculateFeePriority(incomingTx);
		if (incomingTx.feePriority < this._minEntranceFeePriority) {
			const error = new TransactionPoolError(
				`Rejecting transaction due to failed minimum entrance fee requirement`,
				incomingTx.id,
				'.fee',
				incomingTx.feePriority.toString(),
				this._minEntranceFeePriority.toString(),
			);

			return { status: Status.FAIL, errors: [error] };
		}

		// Check if incoming transaction fee is greater than the minimum fee in the TxPool if the TxPool is full
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

		this._feePriorityQueue.push(incomingTx.feePriority, incomingTx.id);

		const incomingTxAddress = getAddressFromPublicKey(
			incomingTx.senderPublicKey,
		);

		// _applyFunction is injected from chain module applyTransaction
		const { transactionsResponses } = await this._applyFunction([incomingTx]);
		const txStatus = this._getStatus(transactionsResponses);

		// If applyTransaction fails for the transaction then throw error
		if (txStatus === TransactionStatus.INVALID) {
			return { status: Status.FAIL, errors: transactionsResponses[0].errors };
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

		// Add the transaction to _transactionList as PROCESSABLE
		this._transactionList[incomingTxAddress].add(
			incomingTx,
			txStatus === TransactionStatus.PROCESSABLE,
		);

		return { status: Status.OK, errors: [] };
	}

	public remove(tx: Transaction): boolean {
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

	private async _reorganize(): Promise<void> {}

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
			txResponseErrors[0].actual > txResponseErrors[0].expected
		) {
			debug('Received UNPROCESSABLE transaction');

			return TransactionStatus.UNPROCESSABLE;
		}

		debug('Received INVALID transaction');
		return TransactionStatus.INVALID;
	}
}
