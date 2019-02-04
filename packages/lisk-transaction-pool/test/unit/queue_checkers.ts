import { expect } from 'chai';
import { Transaction } from '../../src/transaction_pool';
import { wrapTransaction } from '../utils/add_transaction_functions';
import * as queueCheckers from '../../src/queue_checkers';
import * as transactionObjects from '../../fixtures/transactions.json';
import { SinonStub } from 'sinon';

describe('queueCheckers', () => {
	const [unincludedTransaction, ...transactions] = transactionObjects.map(
		wrapTransaction,
	);

	describe('#checkTransactionPropertyForValues', () => {
		const propertyName: queueCheckers.TransactionFilterableKeys = 'id';
		const values = transactions.map(
			(transaction: Transaction) => transaction[propertyName],
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
			return expect(queueCheckers.checkTransactionForExpiry()).to.be.a(
				'function',
			);
		});

		it('should call transaction.isExpired function', () => {
			const transactionExpiryCheckFunction = queueCheckers.checkTransactionForExpiry();
			const transaction = {
				...transactions[0],
				receivedAt: new Date(new Date().getTime() - 29000),
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
			const senderProperty: queueCheckers.TransactionFilterableKeys =
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
			return expect(queueCheckers.checkTransactionForId(transactions)).to.be.a(
				'function',
			);
		});

		it('should call checkTransactionPropertyForValues with transactions id values and id property', () => {
			queueCheckers.checkTransactionForId(transactions);
			const idProperty: queueCheckers.TransactionFilterableKeys = 'id';
			const transactionIds = transactions.map(
				(transaction: Transaction) => transaction.id,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionIds, idProperty);
		});
	});

	describe('#checkTransactionForSenderIdWithRecipientIds', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transacitons recipientId values and senderId property', () => {
			queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions);
			const senderId: queueCheckers.TransactionFilterableKeys = 'senderId';
			const transactionRecipientIds = transactions.map(
				(transaction: Transaction) => transaction.recipientId,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionRecipientIds, senderId);
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
			const typeProperty: queueCheckers.TransactionFilterableKeys = 'type';
			const transactionTypes = transactions.map(
				(transaction: Transaction) => transaction.type,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionTypes, typeProperty);
		});
	});
});
