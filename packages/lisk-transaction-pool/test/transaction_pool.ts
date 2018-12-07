import addresses from '../fixtures/addresses.json';
import { expect } from 'chai';
import transactionsObjects from '../fixtures/transactions.json';
import { TransactionPool, Transaction } from '../src/transaction_pool';
import { wrapTransferTransaction } from './utils/add_transaction_functions';
import * as sinon from 'sinon';
import { Queue } from '../src/queue';
import * as queueCheckers from '../src/queue_checkers';

describe('transaction pool', () => {
	const expireTransactionsInterval = 1000;
	const transactions = transactionsObjects.map(wrapTransferTransaction);
	let transactionPool: TransactionPool;

	let checkerStubs: {
		[key: string]: sinon.SinonStub;
	};

	beforeEach('add transactions in the transaction pool', () => {
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
			checkTransactionForExpiry: sandbox.stub(
				queueCheckers,
				'checkTransactionForExpiry'
			),
		};


		transactionPool = new TransactionPool({ expireTransactionsInterval });
		// Stub queues
		Object.keys(transactionPool.queues).forEach(queueName => {
			sandbox
				.stub((transactionPool as any)._queues, queueName)
				.value(sinon.createStubInstance(Queue));
		});
	});

	afterEach(() => {
		(transactionPool as any).expireTransactionsJob.stop();
	});

	describe('addTransactions', () => {});
	describe('getProcessableTransactions', () => {});
	describe('onDeleteBlock', () => {
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

		it('should call enqueueMany for verified queue with transactions from the deleted block', () => {
			transactionPool.onDeleteBlock(block);
			expect(transactionPool.queues.verified.enqueueMany).to.be.calledWith(
				block.transactions,
			);
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
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

	describe('onNewBlock', () => {
		const block = {
			transactions: [transactions[0], transactions[1], transactions[2]],
		};

		it('should call checkTransactionForId with block transactions', () => {
			transactionPool.onNewBlock(block);
			expect(checkerStubs.checkTransactionForId).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call checkTransactionForSenderPublicKey with block transactions', () => {
			transactionPool.onNewBlock(block);
			expect(checkerStubs.checkTransactionForSenderPublicKey).to.be.calledWithExactly(
				block.transactions,
			);
		});

		it('should call removeFor for received and validated queues once', () => {
			transactionPool.onNewBlock(block);
			const { received, validated } = transactionPool.queues;
			expect(received.removeFor).to.be.calledOnce;
			expect(validated.removeFor).to.be.calledOnce;
		});

		it('should call removeFor for pending, verified and ready queues thrice', () => {
			transactionPool.onNewBlock(block);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledThrice;
			expect(verified.removeFor).to.be.calledThrice;
			expect(ready.removeFor).to.be.calledThrice;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
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

	describe('onRoundRollback', () => {
		const roundDelegateAddresses = addresses;

		it('should call checkTransactionForProperty with block sender addresses and "senderPublicKey" property', () => {
			transactionPool.onRoundRollback(roundDelegateAddresses);
			const senderProperty = 'senderPublicKey';
			expect(
				checkerStubs.checkTransactionPropertyForValues.calledWithExactly(
					roundDelegateAddresses,
					senderProperty,
				),
			).to.equal(true);
		});

		it('should call removeFor for pending, verified and ready queues once', () => {
			transactionPool.onRoundRollback(roundDelegateAddresses);
			const { pending, verified, ready } = transactionPool.queues;
			expect(pending.removeFor).to.be.calledOnce;
			expect(verified.removeFor).to.be.calledOnce;
			expect(ready.removeFor).to.be.calledOnce;
		});

		it('should call enqueueMany for validated queue with transactions removed from other queues', () => {
			const { received, validated, ...otherQueues } = transactionPool.queues;
			const removedTransactions = Object.keys(otherQueues)
				.map(queueName => {
					const removedTransactions = [transactions[0]];
					(transactionPool.queues[queueName]
						.removeFor as sinon.SinonStub).returns(removedTransactions);
					return removedTransactions;
				})
				.reduce((acc, value) => acc.concat(value), []);
			transactionPool.onRoundRollback(roundDelegateAddresses);
			expect(transactionPool.queues.validated.enqueueMany).to.be.calledWith(
				removedTransactions,
			);
		});
	});

	describe('#expireTransactions', () => {
		let removeTransactionsFromQueuesStub: sinon.SinonStub;
		let expireTransactions: () => Promise<ReadonlyArray<Transaction>>;

		beforeEach(async () => {
			removeTransactionsFromQueuesStub = sandbox.stub(transactionPool as any, 'removeTransactionsFromQueues');
			expireTransactions = (transactionPool as any)['expireTransactions'].bind(transactionPool);
		});

		it('should call removeTransactionsFromQueues once', async () => {
			await expireTransactions();
			expect(removeTransactionsFromQueuesStub).to.be.calledOnce
		});
	});
});