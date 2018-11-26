import { Queue } from '../src/queue';
import { Transaction } from '../src/transaction_pool';
import { expect } from 'chai';
import transactions from '../fixtures/transactions.json';
import { wrapTransferTransaction } from './utils/add_transaction_functions';

console.log(transactions);
const transferTransactionInstances = transactions.map(wrapTransferTransaction);

describe('Queue', () => {
	let queue: Queue;

	beforeEach(() => {
		return (queue = new Queue());
	});

	describe('#enqueueOne', () => {
		it('should add transaction to the queue', () => {
			const transaction = transferTransactionInstances[0];
			queue.enqueueOne(transaction);
			return expect(queue.transactions).to.include(transaction);
		});

		it('should add transaction to the queue index', () => {
			const transaction = transferTransactionInstances[0];
			queue.enqueueOne(transaction);
			return expect(queue.index[transaction.id]).to.deep.equal(transaction);
		});
	});

	describe('#enqueueMany', () => {
		it('should add transactions to the queue', () => {
			const transactions = transferTransactionInstances;
			queue.enqueueMany(transactions);
			return transactions.forEach((transaction: Transaction) =>
				expect(queue.transactions).to.include(transaction),
			);
		});

		it('should add transactions to the queue index', () => {
			const transactions = transferTransactionInstances;
			queue.enqueueMany(transactions);
			return transactions.forEach((transaction: Transaction) =>
				expect(queue.index[transaction.id]).to.eq(transaction),
			);
		});
	});

	describe('#exists', () => {
		it('should return true if transaction exists in queue', () => {
			const transaction = transferTransactionInstances[0];
			queue.enqueueOne(transaction);
			return expect(queue.exists(transaction)).to.equal(true);
		});

		it('should return false if transaction does not exist in queue', () => {
			const transaction = transferTransactionInstances[0];
			return expect(queue.exists(transaction)).to.equal(false);
		});
	});

	describe('#removeFor', () => {
		let transactions: ReadonlyArray<Transaction>;
		const alwaysReturnFalse = () => () => false;
		const checkIdsExists = (
			ids: ReadonlyArray<string>,
		): ((transaction: Transaction) => boolean) => {
			return (transaction: Transaction) => ids.indexOf(transaction.id) !== -1;
		};

		beforeEach(() => {
			transactions = transferTransactionInstances;
			return queue.enqueueMany(transactions);
		});

		it('should not remove any transactions if the condition fails for all transactions', () => {
			const deletedTransactions = queue.removeFor(alwaysReturnFalse());
			expect(deletedTransactions).to.have.length(0);
			return expect(queue.transactions).to.deep.equal(transactions);
		});

		it('should return removed transactions which pass condition', () => {
			const [
				toRemoveTransaction1,
				toRemoveTransaction2,
				...tokeepTransactions
			] = transactions;
			const condition = checkIdsExists([
				toRemoveTransaction1.id,
				toRemoveTransaction2.id,
			]);

			const removedTransactions = queue.removeFor(condition);
			expect(removedTransactions).to.deep.equal([
				toRemoveTransaction1,
				toRemoveTransaction2,
			]);
			return expect(queue.transactions).to.deep.equal(tokeepTransactions);
		});

		it('should remove transactions which pass condition', () => {
			const [
				toRemoveTransaction1,
				toRemoveTransaction2,
				...tokeepTransactions
			] = transactions;
			const condition = checkIdsExists([
				toRemoveTransaction1.id,
				toRemoveTransaction2.id,
			]);

			queue.removeFor(condition);
			expect(queue.transactions).not.to.contain([
				toRemoveTransaction1,
				toRemoveTransaction2,
			]);
			return expect(queue.transactions).to.deep.equal(tokeepTransactions);
		});

		it('should remove queue index for transactions which pass condition', () => {
			const [
				toRemoveTransaction1,
				toRemoveTransaction2,
				...tokeepTransactions
			] = transactions;
			const condition = checkIdsExists([
				toRemoveTransaction1.id,
				toRemoveTransaction2.id,
			]);

			queue.removeFor(condition);
			expect(queue.index[toRemoveTransaction1.id]).not.to.exist;
			expect(queue.index[toRemoveTransaction2.id]).not.to.exist;
			return expect(queue.transactions).to.deep.equal(tokeepTransactions);
		});
	});

	describe('#dequeueUntil', () => {
		let transactions: ReadonlyArray<Transaction>;

		const returnTrueUntilLimit = (limit: number) => {
			let currentValue = 0;

			return () => currentValue++ < limit;
		};

		beforeEach(() => {
			transactions = transferTransactionInstances;
			return queue.enqueueMany(transactions);
		});

		it('should not dequeue any transactions if the condition fails for first transaction', () => {
			const dequeuedTransactions = queue.dequeueUntil(returnTrueUntilLimit(0));
			expect(dequeuedTransactions).to.have.length(0);
			return expect(queue.transactions).to.deep.equal(transactions);
		});

		it('should return dequeued transactions which pass condition', () => {
			const [secondToLastTransaciton, lastTransaction] = transactions.slice(
				transactions.length - 2,
				transactions.length,
			);
			const condition = returnTrueUntilLimit(2);

			const dequeuedTransactions = queue.dequeueUntil(condition);
			return expect(dequeuedTransactions).to.deep.equal([
				secondToLastTransaciton,
				lastTransaction,
			]);
		});

		it('should dequeue 2 transactions', () => {
			const condition = returnTrueUntilLimit(2);

			queue.dequeueUntil(condition);
			return expect(queue.transactions).to.deep.equal(
				transactions.slice(0, transactions.length - 2),
			);
		});

		it('should remove queue index for transactions which pass condition', () => {
			const [secondToLastTransaciton, lastTransaction] = transactions.slice(
				transactions.length - 2,
				transactions.length,
			);
			const condition = returnTrueUntilLimit(2);

			queue.dequeueUntil(condition);
			expect(queue.index[lastTransaction.id]).not.to.exist;
			return expect(queue.index[secondToLastTransaciton.id]).not.to.exist;
		});
	});
});
