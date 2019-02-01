import { Queue } from '../../src/queue';
import * as transactionObjects from '../../fixtures/transactions.json';
import { wrapTransaction } from '../utils/add_transaction_functions';
import { expect } from 'chai';
import {
	returnTrueUntilLimit,
	checkTransactionForId,
} from '../../src/queue_checkers';

describe('queue', () => {
	const transactions = transactionObjects.map(wrapTransaction);
	let queue: Queue;

	beforeEach(() => {
		queue = new Queue();
	});

	describe('#enqueueOne', () => {
		it('should enqueue 1000 transactions in under 100 milliseconds', async () => {
			const startTime = new Date().getTime();
			transactions.forEach(transaction => queue.enqueueOne(transaction));
			const endTime = new Date().getTime();
			expect(endTime - startTime).to.be.lessThan(100);
		});
	});

	describe('#dequeueUntil', () => {
		beforeEach(async () => {
			transactions.forEach(transaction => queue.enqueueOne(transaction));
		});

		it('should dequeue 1000 transactions in under 100 milliseconds', async () => {
			const startTime = new Date().getTime();
			queue.dequeueUntil(returnTrueUntilLimit(1000));
			const endTime = new Date().getTime();
			expect(endTime - startTime).to.be.lessThan(100);
		});
	});

	describe('#removeFor', () => {
		beforeEach(async () => {
			transactions.forEach(transaction => queue.enqueueOne(transaction));
		});

		it('should remove 1000 transactions in under 100 milliseconds', async () => {
			const startTime = new Date().getTime();
			queue.removeFor(checkTransactionForId(transactions));
			const endTime = new Date().getTime();
			expect(endTime - startTime).to.be.lessThan(100);
		});
	});

	describe('#peekUntil', () => {
		beforeEach(async () => {
			transactions.forEach(transaction => queue.enqueueOne(transaction));
		});

		it('should peek 100 transactions in under 100 milliseconds', async () => {
			const startTime = new Date().getTime();
			queue.peekUntil(returnTrueUntilLimit(100));
			const endTime = new Date().getTime();
			expect(endTime - startTime).to.be.lessThan(100);
		});
	});
});
