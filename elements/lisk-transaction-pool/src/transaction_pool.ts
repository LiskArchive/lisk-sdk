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
import { TransactionList } from './transaction_list';
import { Status, Transaction, TransactionResponse } from './types';

type ApplyFunction = (
	transactions: ReadonlyArray<Transaction>,
) => Promise<ReadonlyArray<TransactionResponse>>;

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minimumEntranceFee?: bigint;
	readonly minReplacementFeeDifference?: bigint;
	// tslint:disable-next-line no-mixed-interface
	readonly applyTransaction: ApplyFunction;
}

export const DEFAULT_MAX_TRANSACTIONS = 4096;
export const DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT = 64;
export const DEFAULT_MINIMUM_ENTRANCE_FEE = BigInt(1);
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
	private readonly _minimumEntranceFee: bigint;
	private readonly _minReplacementFeeDifference: bigint;
	private readonly _reorganizeJob: Job<void>;

	public constructor(config: TransactionPoolConfig) {
		this.events = new EventEmitter();
		this._allTransactions = {};
		this._transactionList = {};
		this._applyFunction = config.applyTransaction;
		this._maxTransactions = config.maxTransactions ?? DEFAULT_MAX_TRANSACTIONS;
		this._maxTransactionsPerAccount =
			config.maxTransactionsPerAccount ?? DEFAULT_MAX_TRANSACTIONS_PER_ACCOUNT;
		this._transactionExpiryTime =
			config.transactionExpiryTime ?? DEFAULT_EXPIRY_TIME;
		this._minimumEntranceFee =
			config.minimumEntranceFee ?? DEFAULT_MINIMUM_ENTRANCE_FEE;
		this._minReplacementFeeDifference =
			config.minReplacementFeeDifference ??
			DEFAULT_MINIMUM_REPLACEMENT_FEE_DIFFERENCE;
		this._reorganizeJob = new Job(
			() => this._reorganize(),
			DEFAULT_REORGANIZE_TIME,
		);
		// FIXME: This is log to supress ts build error
		console.log(
			this._applyFunction,
			this._allTransactions,
			this._maxTransactions,
			this._transactionExpiryTime,
			this._maxTransactionsPerAccount,
			this._minimumEntranceFee,
			this._minReplacementFeeDifference,
		);
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
		console.log(id, this._transactionList);
		return undefined;
	}

	public contains(id: string): boolean {
		console.log(id);
		return false;
	}

	public async addTransaction(incomingTx: Transaction): Promise<boolean> {
		// Check for duplicate
		if (this._allTransactions[incomingTx.id]) {
			return false;
		}
		// Check for minimum entrance fee to the TxPool and if its low then reject the incoming tx
		if (incomingTx.fee < this._minimumEntranceFee) {
			return false;
		}
		// Check if incoming transaction fee is greater than the minimum fee in the TxPool if the TxPool is full
		// TODO: Use feePriorityQueue to reject transaction with lowest fee when txPool is full

		const incomingTxAddress = getAddressFromPublicKey(
			incomingTx.senderPublicKey,
		);

		const txResponse = await this._applyFunction([incomingTx]);
		const txResponseErrors = txResponse[0].errors;

		// If applyTransaction fails for the transaction then throw error
		if (
			(txResponseErrors.length === 1 &&
				txResponseErrors[0].dataPath === '.nonce' &&
				txResponseErrors[0].actual &&
				txResponseErrors[0].expected &&
				txResponseErrors[0].actual > txResponseErrors[0].expected) ||
			txResponse[0].status === Status.FAIL
		) {
			throw new Error(
				`Transaction with transaction id ${incomingTx.id} is an invalid transaction`,
			);
		}

		// Add address of incoming trx if it doesn't exist in transaction list
		if (!this._transactionList[incomingTxAddress]) {
			this._transactionList[incomingTxAddress] = new TransactionList(
				incomingTxAddress,
			);
		}

		// Add received time to the incoming tx object
		incomingTx.receivedAt = new Date();
		this._allTransactions[incomingTx.id] = incomingTx;

		return this._transactionList[incomingTxAddress].add(incomingTx);
	}

	public removeTransaction(tx: Transaction): boolean {
		// FIXME: this is log to supress ts build error
		console.log(tx);
		return false;
	}

	public getProcessableTransactions(): {
		readonly [address: string]: ReadonlyArray<Transaction>;
	} {
		return {};
	}

	private async _reorganize(): Promise<void> {}
}
