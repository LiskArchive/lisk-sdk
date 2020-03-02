/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import { Transaction } from '../../src/types';
import { wrapTransaction } from '../utils/add_transaction_functions';
import * as queueCheckers from '../../src/queue_checkers';
import * as transactionObjects from '../../fixtures/transactions.json';

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
			).toEqual(expect.any(Function));
		});

		it('should return function which returns true for transaction whose property is included in the values', () => {
			const checkerFunction = queueCheckers.checkTransactionPropertyForValues(
				values,
				propertyName,
			);
			return expect(checkerFunction(transactions[0])).toBe(true);
		});

		it('should return function which returns false for transaction whose property is not included in the values', () => {
			const checkerFunction = queueCheckers.checkTransactionPropertyForValues(
				values,
				propertyName,
			);
			return expect(checkerFunction(unincludedTransaction)).toBe(false);
		});
	});

	describe('#returnTrueUntilLimit', () => {
		const limit = 2;

		it('should return a function', () => {
			return expect(queueCheckers.returnTrueUntilLimit(limit)).toEqual(
				expect.any(Function),
			);
		});

		it(`should return function which returns true until function is called less than ${limit} times`, () => {
			const checkerFunction = queueCheckers.returnTrueUntilLimit(limit);
			expect(checkerFunction(transactions[0])).toBe(true);
			return expect(checkerFunction(transactions[0])).toBe(true);
		});

		it(`should return function which returns false after function is called more than ${limit} times`, () => {
			const checkerFunction = queueCheckers.returnTrueUntilLimit(limit);
			checkerFunction(transactions[0]);
			checkerFunction(transactions[0]);
			return expect(checkerFunction(transactions[0])).toBe(false);
		});
	});

	describe('#checkTransactionForExpiry', () => {
		it('should return a function', () => {
			return expect(queueCheckers.checkTransactionForExpiry()).toEqual(
				expect.any(Function),
			);
		});

		it('should call transaction.isExpired function', () => {
			const transactionExpiryCheckFunction = queueCheckers.checkTransactionForExpiry();
			const transaction = {
				...transactions[0],
				receivedAt: new Date(new Date().getTime() - 29000),
			};

			const isExpiredStub = jest.spyOn(transaction, 'isExpired');
			transactionExpiryCheckFunction(transaction);

			return expect(isExpiredStub).toBeCalledTimes(1);
		});
	});

	describe('#checkTransactionForSenderPublicKey', () => {
		beforeEach(() => {
			return jest
				.spyOn(queueCheckers, 'checkTransactionPropertyForValues')
				.mockReturnValue(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForSenderPublicKey(transactions),
			).toEqual(expect.any(Function));
		});

		it('should call checkTransactionPropertyForValues with transactions senderPublicKeys values and senderId property', () => {
			queueCheckers.checkTransactionForSenderPublicKey(transactions);
			const senderProperty: queueCheckers.TransactionFilterableKeys =
				'senderPublicKey';
			const transactionSenderPublicKeys = transactions.map(
				(transaction: Transaction) => transaction.senderPublicKey,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as any,
			).toBeCalledWith(transactionSenderPublicKeys, senderProperty);
		});
	});

	describe('#checkTransactionForId', () => {
		beforeEach(() => {
			return jest
				.spyOn(queueCheckers, 'checkTransactionPropertyForValues')
				.mockReturnValue(() => true);
		});

		it('should return a function', () => {
			return expect(queueCheckers.checkTransactionForId(transactions)).toEqual(
				expect.any(Function),
			);
		});

		it('should call checkTransactionPropertyForValues with transactions id values and id property', () => {
			queueCheckers.checkTransactionForId(transactions);
			const idProperty: queueCheckers.TransactionFilterableKeys = 'id';
			const transactionIds = transactions.map(
				(transaction: Transaction) => transaction.id,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as any,
			).toBeCalledWith(transactionIds, idProperty);
		});
	});

	describe('#checkTransactionForSenderIdWithRecipientIds', () => {
		beforeEach(() => {
			return jest
				.spyOn(queueCheckers, 'checkTransactionPropertyForValues')
				.mockReturnValue(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions),
			).toEqual(expect.any(Function));
		});

		it('should call checkTransactionPropertyForValues with transacitons recipientId values and senderPublicKey property', () => {
			queueCheckers.checkTransactionForSenderIdWithRecipientIds(transactions);
			const senderId: queueCheckers.TransactionFilterableKeys = 'senderId';
			const transactionRecipientIds = transactions
				.map((transaction: Transaction) => transaction.asset.recipientId)
				.filter(id => id !== undefined);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as any,
			).toBeCalledWith(transactionRecipientIds, senderId);
		});
	});

	describe('#checkTransactionForTypes', () => {
		beforeEach(() => {
			return jest
				.spyOn(queueCheckers, 'checkTransactionPropertyForValues')
				.mockReturnValue(() => true);
		});

		it('should return a function', () => {
			return expect(
				queueCheckers.checkTransactionForTypes(transactions),
			).toEqual(expect.any(Function));
		});

		it('should call checkTransactionPropertyForValues with transaction type values and type property', () => {
			queueCheckers.checkTransactionForTypes(transactions);
			const typeProperty: queueCheckers.TransactionFilterableKeys = 'type';
			const transactionTypes = transactions.map(
				(transaction: Transaction) => transaction.type,
			);
			return expect(
				queueCheckers.checkTransactionPropertyForValues as any,
			).toBeCalledWith(transactionTypes, typeProperty);
		});
	});
});
