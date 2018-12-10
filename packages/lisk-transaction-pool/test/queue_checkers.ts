import { expect } from 'chai';
import { Transaction } from '../src/transaction_pool';
import { wrapTransferTransaction } from './utils/add_transaction_functions';
import * as queueCheckers from '../src/queue_checkers';
import transactions from '../fixtures/transactions.json';
import { SinonStub } from 'sinon';

describe('queueCheckers', () => {
	const [unincludedTransaction, ...includedTransactions] = transactions.map(wrapTransferTransaction);

	describe('#checkTransactionPropertyForValues', () => {
		const propertyName: queueCheckers.TransactionFilterableKeys =
			'senderPublicKey';
		const values = includedTransactions.map(
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
			return expect(checkerFunction(includedTransactions[0])).to.equal(true);
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

	describe('#checkTransactionForSenderPublicKey', () => {
		beforeEach(() => {
			return sandbox
				.stub(queueCheckers, 'checkTransactionPropertyForValues')
				.returns(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForSenderPublicKey(includedTransactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transactions senderPublicKeys values and senderPublicKey property', () => {
			queueCheckers.checkTransactionForSenderPublicKey(includedTransactions);
			const senderProperty: queueCheckers.TransactionFilterableKeys =
				'senderPublicKey';
			const transactionSenderPublicKeys = includedTransactions.map(
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
				queueCheckers.checkTransactionForId(includedTransactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transactions id values and id property', () => {
			queueCheckers.checkTransactionForId(includedTransactions);
			const idProperty: queueCheckers.TransactionFilterableKeys = 'id';
			const transactionIds = includedTransactions.map(
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
				queueCheckers.checkTransactionForRecipientId(includedTransactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transacitons recipientId values and recipientId property', () => {
			queueCheckers.checkTransactionForRecipientId(includedTransactions);
			const recipientProperty: queueCheckers.TransactionFilterableKeys =
				'recipientId';
			const transactionRecipientIds = includedTransactions.map(
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
				queueCheckers.checkTransactionForTypes(includedTransactions),
			).to.be.a('function');
		});

		it('should call checkTransactionPropertyForValues with transaciton type values and type property', () => {
			queueCheckers.checkTransactionForTypes(includedTransactions);
			const typeProperty: queueCheckers.TransactionFilterableKeys = 'type';
			const transactionTypes = includedTransactions.map(
				(transaction: Transaction) => transaction.type,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as SinonStub,
			).to.be.calledWith(transactionTypes, typeProperty);
		});
	});
});
