/*
 * Copyright © 2018 Lisk Foundation
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
 */

'use strict';

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	checkAllowedTransactions,
} = require('../../../../../../src/modules/chain/transactions/transactions_handlers');

// TODO: re-implement for new transaction processing
describe('transactions', () => {
	afterEach(() => sinonSandbox.restore());

	const dummyTransactions = [
		{
			id: 'aTransactionId',
			matcher: () => true,
			type: 0,
		},
	];
	const dummyState = {
		version: 1,
		height: 1,
		timestamp: 'aTimestamp',
	};

	describe('#checkAllowedTransactions', () => {
		it('should return a proper response format', async () => {
			// Act
			const response = checkAllowedTransactions(dummyState)(dummyTransactions);

			// Assert
			expect(response).to.have.deep.property('transactionsResponses', [
				{
					id: 'aTransactionId',
					status: 1,
					errors: [],
				},
			]);
		});

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', async () => {
			// Arrange
			const disallowedTransaction = {
				...dummyTransactions[0],
				matcher: () => false,
			};

			// Act
			const response = checkAllowedTransactions(dummyState)([
				disallowedTransaction,
			]);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				disallowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(1);
			expect(response.transactionsResponses[0].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[0].errors[0].message).to.equal(
				`Transaction type ${
					disallowedTransaction.type
				} is currently not allowed.`
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', async () => {
			// Arrange
			const {
				matcher,
				...transactionWithoutMatcherImpl
			} = dummyTransactions[0];

			// Act
			const response = checkAllowedTransactions(dummyState)([
				transactionWithoutMatcherImpl,
			]);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactionWithoutMatcherImpl.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', async () => {
			// Arrange
			const allowedTransaction = {
				...dummyTransactions[0],
				matcher: () => true,
			};

			// Act
			const response = checkAllowedTransactions(dummyState)([
				allowedTransaction,
			]);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				allowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', async () => {
			// Arrange
			const testTransactions = [
				dummyTransactions[0], // Allowed
				{
					...dummyTransactions[0],
					matcher: () => false, // Disallowed
				},
			];

			// Act
			const response = checkAllowedTransactions(dummyState)(testTransactions);

			// Assert
			expect(response.transactionsResponses.length).to.equal(2);
			// Allowed transaction formatted response check
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				testTransactions[0].id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);

			// Allowed transaction formatted response check
			expect(response.transactionsResponses[1]).to.have.property(
				'id',
				testTransactions[1].id
			);
			expect(response.transactionsResponses[1]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[1].errors.length).to.equal(1);
			expect(response.transactionsResponses[1].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[1].errors[0].message).to.equal(
				`Transaction type ${testTransactions[1].type} is currently not allowed.`
			);
		});
	});
});
