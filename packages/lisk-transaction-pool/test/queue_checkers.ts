import { expect } from 'chai';
import { Transaction } from '../src/transaction_pool';
import * as queueCheckers from '../src/queue_checkers';
import TransactionObjects from '../fixtures/transactions.json';
import { SinonStub } from 'sinon';
import { wrapTransferTransaction } from './utils/add_transaction_functions';

describe('queueCheckers', () => {
	const [unincludedTransaction, ...transactions] = TransactionObjects.map(wrapTransferTransaction);

	describe('#checkTransactionPropertyForValues', () => {
		const propertyName: queueCheckers.transactionFilterableKeys =
			'senderPublicKey';
		const values = transactions.map(
			(transaction: Transaction) => transaction.senderPublicKey,
		);

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionPropertyForValues(values, propertyName),
			).to.be.a('function');
		});

		it('should return function which returns true for transaction whose property is included in the values', () => {
			const checkerFunction = queueCheckers.checkTransactionPropertyForValues(
				values,
				propertyName,
			);
			return expect(checkerFunction(transactions[0])).to.equal(true);
		});

		it('should return function which returns false for transaction whose property is not included in the values', () => {
			const checkerFunction = queueCheckers.checkTransactionPropertyForValues(
				values,
				propertyName,
			);
			return expect(checkerFunction(unincludedTransaction)).to.equal(false);
		});
	});

	describe('#returnTrueUntilLimit', () => {
		const limit = 2;

		it('should return a function', () => {
			return expect(queueCheckers.returnTrueUntilLimit(limit)).to.be.a(
				'function',
			);
		});

		it(`should return function which returns true until function is called less than ${limit} times`, () => {
			const checkerFunction = queueCheckers.returnTrueUntilLimit(limit);
			expect(checkerFunction(transactions[0])).to.equal(true);
			return expect(checkerFunction(transactions[0])).to.equal(true);
		});

		it(`should return function which returns false after function is called more than ${limit} times`, () => {
			const checkerFunction = queueCheckers.returnTrueUntilLimit(limit);
			checkerFunction(transactions[0]);
			checkerFunction(transactions[0]);
			return expect(checkerFunction(transactions[0])).to.equal(false);
		});
	});

	describe('#checkTransactionForExpiry', () => {
		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForExpiry()
			).to.be.a('function');
		});

		it('should call transaction.isExpired function', () => {
			const transactionExpiryCheckFunction = queueCheckers.checkTransactionForExpiry();
			const transaction = {
				...transactions[0],
				receivedAt: new Date((new Date().getTime() - 29000))
			};

			const isExpiredStub = sandbox.stub(transaction, 'isExpired');
			transactionExpiryCheckFunction(transaction);

			return expect(isExpiredStub).to.be.calledOnce;
		});
	});

	describe('#checkTransactionForSenderPublicKey', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForSenderPublicKey(transactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transactions senderPublicKeys values and senderPublicKey property', () => {
			queueCheckers.checkTransactionForSenderPublicKey(transactions);
			const senderProperty: queueCheckers.transactionFilterableKeys =
				'senderPublicKey';
			const transactionSenderPublicKeys = transactions.map(
				(transaction: Transaction) => transaction.senderPublicKey,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionSenderPublicKeys, senderProperty);
		});
	});

	describe('#checkTransactionForId', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForId(transactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transactions id values and id property', () => {
			queueCheckers.checkTransactionForId(transactions);
			const idProperty: queueCheckers.transactionFilterableKeys = 'id';
			const transactionIds = transactions.map(
				(transaction: Transaction) => transaction.id,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionIds, idProperty);
		});
	});

	describe('#checkTransactionForRecipientId', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForRecipientId(transactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transacitons recipientId values and recipientId property', () => {
			queueCheckers.checkTransactionForRecipientId(transactions);
			const recipientProperty: queueCheckers.transactionFilterableKeys =
				'recipientId';
			const transactionRecipientIds = transactions.map(
				(transaction: Transaction) => transaction.recipientId,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionRecipientIds, recipientProperty);
		});
	});

	describe('#checkTransactionForTypes', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForTypes(transactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transaction type values and type property', () => {
			queueCheckers.checkTransactionForTypes(transactions);
			const typeProperty: queueCheckers.transactionFilterableKeys = 'type';
			const transactionTypes = transactions.map(
				(transaction: Transaction) => transaction.type,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionTypes, typeProperty);
		});
	});
});
