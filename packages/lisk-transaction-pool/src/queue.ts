import { Transaction } from './transaction_pool';

interface QueueIndex {
	[index: string]: Transaction;
}

interface RemoveForReduceObject {
	readonly affected: Transaction[];
	readonly unaffected: Transaction[];
}

interface DequeueUntilReduceObject {
	readonly affected: Transaction[];
	readonly conditionFailedOnce: boolean;
	readonly unaffected: Transaction[];
}

export class Queue {
	// tslint:disable-next-line variable-name
	private readonly _index: QueueIndex;
	// tslint:disable-next-line variable-name
	private _transactions: ReadonlyArray<Transaction>;

	public get transactions(): ReadonlyArray<Transaction> {
		return this._transactions;
	}

	public get index(): QueueIndex {
		return this._index;
	}

	public constructor() {
		this._transactions = [];
		this._index = {};
	}

	public dequeueUntil(
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		const reduceResult: DequeueUntilReduceObject = this._transactions.reduceRight(
			(
				{ affected, unaffected, conditionFailedOnce }: DequeueUntilReduceObject,
				transaction: Transaction,
			) => {
				// Add transaction to the unaffected list if the condition failed for this transaction or any previous transaction
				if (conditionFailedOnce || !condition(transaction)) {
					return {
						affected,
						unaffected: [transaction, ...unaffected],
						conditionFailedOnce: true,
					};
				}

				// Delete the index of the transaction which passed the condition
				// tslint:disable-next-line no-dynamic-delete
				delete this._index[transaction.id];

				return {
					affected: [transaction, ...affected],
					unaffected,
					conditionFailedOnce: false,
				};
			},
			{
				affected: [],
				unaffected: [],
				conditionFailedOnce: false,
			},
		);

		this._transactions = reduceResult.unaffected;

		return reduceResult.affected;
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

	public removeFor(
		condition: (transaction: Transaction) => boolean,
	): ReadonlyArray<Transaction> {
		const { unaffected, affected } = this._transactions.reduce(
			(reduceObject: RemoveForReduceObject, transaction: Transaction) => {
				if (condition(transaction)) {
					reduceObject.affected.push(transaction);
					// tslint:disable-next-line no-dynamic-delete
					delete this._index[transaction.id];
				} else {
					reduceObject.unaffected.push(transaction);
				}

				return reduceObject;
			},
			{ unaffected: [], affected: [] },
		);
		this._transactions = unaffected;

		return affected;
	}
}
