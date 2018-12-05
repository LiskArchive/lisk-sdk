import publicKeys from '../fixtures/public_keys.json';
import { expect } from 'chai';
import transactionObjects from '../fixtures/transactions.json';
import { TransactionPool } from '../src/transaction_pool';
import { wrapTransferTransaction } from './utils/add_transaction_functions';
import * as sinon from 'sinon';
import { Queue } from '../src/queue';
import * as queueCheckers from '../src/queue_checkers';

describe('transaction pool', () => {
	let transactionPool: TransactionPool;
	const transactions = transactionObjects.map(wrapTransferTransaction);

	let checkerStubs: {
		[key: string]: sinon.SinonStub;
	};

	beforeEach(async () => {
		checkerStubs = {
			checkTransactionPropertyForValues: sandbox.stub(
				queueCheckers,
				'checkTransactionPropertyForValues',
			),
			checkTransactionForSenderPublicKey: sandbox.stub(
				queueCheckers,
				'checkTransactionForSenderPublicKey',
			),
			checkTransactionForId: sandbox.stub(
				queueCheckers,
				'checkTransactionForId',
			),
			checkTransactionForRecipientId: sandbox.stub(
				queueCheckers,
				'checkTransactionForRecipientId',
			),
		};

		transactionPool = new TransactionPool();
		Object.keys(transactionPool.queues).forEach(queueName => {
			sandbox
				.stub((transactionPool as any)._queues, queueName)
				.value(sinon.createStubInstance(Queue));
		});
	});

	describe('#addTransactions', () => {});
	describe('#getProcessableTransactions', () => {});
	describe('#onDeleteBlock', () => {
		const block = {
			transactions: [transactions[0], transactions[1], transactions[2]],
		};

		it('should call checkTransactionForRecipientId with block transactions', async () => {
			transactionPool.onDeleteBlock(block);
			expect(checkerStubs.checkTransactionForRecipientId).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call removeFor for verified, pending and ready queues once', async () => {
			transactionPool.onDeleteBlock(block);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for verified queue with transactions from the deleted block', async () => {
			transactionPool.onDeleteBlock(block);
			expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				block.transactions,
			);
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onDeleteBlock(block);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});

	describe('#onNewBlock', () => {
		const block = {
			transactions: [transactions[0], transactions[1], transactions[2]],
		};

		it('should call checkTransactionForId with block transactions', async () => {
			transactionPool.onNewBlock(block);
			expect(checkerStubs.checkTransactionForId).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call checkTransactionForSenderPublicKey with block transactions', async () => {
			transactionPool.onNewBlock(block);
			expect(checkerStubs.checkTransactionForSenderPublicKey).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call removeFor for received and validated queues once', async () => {
			transactionPool.onNewBlock(block);
			const { received, validated } = transactionPool.queues;
			expect(received.removeFor).to.be.calledOnce;
			expect(validated.removeFor).to.be.calledOnce;
		});

		it('should call removeFor for pending, verified and ready queues thrice', async () => {
			transactionPool.onNewBlock(block);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledThrice;
			expect(verified.removeFor).to.be.calledThrice;
			expect(ready.removeFor).to.be.calledThrice;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onNewBlock(block);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith([
				...removedTransactions,
				...removedTransactions,
			]);
		});
	});

	describe('#onRoundRollback', () => {
		it('should call checkTransactionForProperty with block sender addresses and "senderPublicKey" property', async () => {
			transactionPool.onRoundRollback(publicKeys);
			const senderProperty = 'senderPublicKey';
			expect(
				checkerStubs.checkTransactionPropertyForValues.calledWithExactly(
					publicKeys,
					senderProperty,
				),
			).to.equal(true);
		});

		it('should call removeFor for pending, verified and ready queues once', async () => {
			transactionPool.onRoundRollback(publicKeys);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', async () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onRoundRollback(publicKeys);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});
});
