import { Transaction } from  './transaction_pool';

interface QueueIndex {
	[index: string]: Transaction;
};

interface RemoveForReduceObject {
	readonly effected: Transaction[];
	readonly uneffected: Transaction[];
};

interface dequeueUntilReduceObject {
	readonly effected: Transaction[];
	readonly uneffected: Transaction[];
	readonly conditionFailedOnce: boolean;
};

export class Queue {
	private _index: QueueIndex;
	private _transactions: ReadonlyArray<Transaction>;

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

	public dequeueUntil(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
		const { effected, uneffected } = this._transactions.reduceRight(({effected, uneffected, conditionFailedOnce}: dequeueUntilReduceObject, transaction: Transaction) => {
			// Add transaction to the uneffected list if the condition failed for this transaction or any previous transaction
			if (conditionFailedOnce || !condition(transaction)) {
				return {
					effected,
					uneffected: [transaction, ...uneffected],
					conditionFailedOnce: true,
				};
			}

			// delete the index of the transaction which passed the condition
			delete this._index[transaction.id];

			return {
				effected: [transaction, ...effected],
				uneffected,
				conditionFailedOnce: false,
			};
		}, {
			effected: [],
			uneffected: [],
			conditionFailedOnce: false
		});

		this._transactions = uneffected;

		return effected;
	}

	public enqueueMany(transactions: ReadonlyArray<Transaction>): void {
		this._transactions = [...transactions, ...this._transactions];

		transactions.forEach((transaction: Transaction) => {
			this._index[transaction.id] = transaction;
		});
	}

	public enqueueOne(transaction: Transaction): void {
		this._transactions = [transaction, ...this._transactions];
		this._index[transaction.id] = transaction;
	}

	public exists(transaction: Transaction): boolean {
		return !!this._index[transaction.id];
	}

	public removeFor(condition: (transaction: Transaction) => boolean): ReadonlyArray<Transaction> {
		const { uneffected, effected } = this._transactions.reduce((reduceObject: RemoveForReduceObject, transaction: Transaction) => {
			if (condition(transaction)) {
				reduceObject.effected.push(transaction)
				// tslint:disable-next-line
				delete this._index[transaction.id];
			} else {
				reduceObject.uneffected.push(transaction);
			}

			return reduceObject;
		}, {uneffected: [], effected: []});
		this._transactions = uneffected;

		return effected;
	}
}