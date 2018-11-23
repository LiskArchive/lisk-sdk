import { Transaction } from  './transaction_pool';

//* tslint:disable */
interface QueueIndex {
	[index: string]: Transaction;
}

export class Queue {
	private _transactions: ReadonlyArray<Transaction>;
	private _index: QueueIndex;

	public get transactions(): ReadonlyArray<Transaction> {
		return this._transactions;
	}

	public get index(): QueueIndex {
		return this._index
	}

	public constructor() {
		this._transactions = [];
		this._index = {};
	}

	public enqueueMany(transactions: ReadonlyArray<Transaction>): void {
	}

	public enqueueOne(transaction: Transaction): void {
	}

	public exists(transaction: Transaction): boolean {
	}

	public removeFor(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
	}

	public dequeueUntil(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
	}
}
