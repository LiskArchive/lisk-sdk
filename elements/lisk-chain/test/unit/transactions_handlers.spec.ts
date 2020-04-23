/*
 * Copyright © 2019 Lisk Foundation
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

import {
	Status as TransactionStatus,
	TransactionResponse,
} from '@liskhq/lisk-transactions';
import * as transactionHandlers from '../../src/transactions/transactions_handlers';
import * as randomUtils from '../utils/random';
import { Context } from '../../src/types';

describe('transactions', () => {
	const trs1 = randomUtils.transferInstance() as any;
	const trs2 = randomUtils.transferInstance() as any;

	const dummyState: Context = {
		blockVersion: 1,
		blockHeight: 1,
		blockTimestamp: 123,
	};

	let dataAccessMock: any;
	let stateStoreMock: any;

	beforeEach(() => {
		// Add matcher to transactions
		trs1.matcher = (): boolean => true;
		trs2.matcher = (): boolean => true;

		// Add prepare steps to transactions
		trs1.prepare = jest.fn();
		trs2.prepare = jest.fn();

		// Add apply steps to transactions
		trs1.apply = jest.fn();
		trs2.apply = jest.fn();

		// Add undo steps to transactions
		trs1.undo = jest.fn();
		trs2.undo = jest.fn();

		stateStoreMock = {
			createSnapshot: jest.fn(),
			restoreSnapshot: jest.fn(),
			account: {
				get: jest.fn().mockResolvedValue({ balance: '100000000000' }),
				getOrDefault: jest.fn().mockResolvedValue({}),
				createSnapshot: jest.fn(),
				restoreSnapshot: jest.fn(),
			},
			transaction: {
				add: jest.fn(),
			},
		};

		dataAccessMock = {
			getTransactionsByIDs: jest.fn().mockReturnValue([]),
		};
	});

	describe('#checkAllowedTransactions', () => {
		it('should return a proper response format', () => {
			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([trs1]);

			// Assert
			expect(response).toStrictEqual([
				{
					id: trs1.id,
					status: 1,
					errors: [],
				},
			]);
		});

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', () => {
			// Arrange
			const disallowedTransaction = {
				...trs1,
				matcher: (): boolean => false,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([disallowedTransaction]);

			// Assert
			expect(response).toHaveLength(1);
			expect(response[0]).toHaveProperty('id', disallowedTransaction.id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.FAIL);
			expect(response[0].errors).toHaveLength(1);
			expect(response[0].errors[0]).toBeInstanceOf(Error);
			expect(response[0].errors[0].message).toBe(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction type ${disallowedTransaction.type} is currently not allowed.`,
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', () => {
			// Arrange
			const { matcher, ...transactionWithoutMatcherImpl } = trs1;

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([transactionWithoutMatcherImpl]);

			// Assert
			expect(response).toHaveLength(1);
			expect(response[0]).toHaveProperty(
				'id',
				transactionWithoutMatcherImpl.id,
			);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors).toHaveLength(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', () => {
			// Arrange
			const allowedTransaction = {
				...trs1,
				matcher: (): boolean => true,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([allowedTransaction]);

			// Assert
			expect(response).toHaveLength(1);
			expect(response[0]).toHaveProperty('id', allowedTransaction.id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors).toHaveLength(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', () => {
			// Arrange
			const testTransactions = [
				trs1, // Allowed
				{
					...trs1,
					matcher: (): boolean => false, // Disallowed
				},
			];

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				testTransactions,
			);

			// Assert
			expect(response).toHaveLength(2);
			// Allowed transaction formatted response check
			expect(response[0]).toHaveProperty('id', testTransactions[0].id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors).toHaveLength(0);

			// Allowed transaction formatted response check
			expect(response[1]).toHaveProperty('id', testTransactions[1].id);
			expect(response[1]).toHaveProperty('status', TransactionStatus.FAIL);
			expect(response[1].errors).toHaveLength(1);
			expect(response[1].errors[0]).toBeInstanceOf(Error);
			expect(response[1].errors[0].message).toBe(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction type ${testTransactions[1].type} is currently not allowed.`,
			);
		});
	});

	describe('#validateTransactions', () => {
		const validResponse = { status: TransactionStatus.OK, id: trs1.id };
		const invalidResponse = { status: TransactionStatus.FAIL, id: trs2.id };

		beforeEach(() => {
			trs1.validate = jest.fn().mockReturnValue(validResponse);
			trs2.validate = jest.fn().mockReturnValue(invalidResponse);
		});

		it('should invoke validate() on each transaction', () => {
			transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(trs1.validate).toHaveBeenCalledTimes(1);
			expect(trs2.validate).toHaveBeenCalledTimes(1);
		});

		it('should return transaction responses', () => {
			const result = transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(result).toEqual([validResponse, invalidResponse]);
		});
	});

	describe('#checkPersistedTransactions', () => {
		it('should resolve in empty response if called with empty array', async () => {
			const result = await transactionHandlers.checkPersistedTransactions(
				dataAccessMock,
			)([]);

			expect(result).toEqual([]);
		});

		it('should invoke entities.Transaction to check persistence of transactions', async () => {
			dataAccessMock.getTransactionsByIDs.mockResolvedValue([trs1, trs2]);

			await transactionHandlers.checkPersistedTransactions(dataAccessMock)([
				trs1,
				trs2,
			]);

			expect(dataAccessMock.getTransactionsByIDs).toHaveBeenCalledTimes(1);
			expect(dataAccessMock.getTransactionsByIDs).toHaveBeenCalledWith([
				trs1.id,
				trs2.id,
			]);
		});

		it('should return TransactionStatus.OK for non-persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			dataAccessMock.getTransactionsByIDs.mockResolvedValue([trs1]);

			const result = await transactionHandlers.checkPersistedTransactions(
				dataAccessMock,
			)([trs1, trs2]);

			const transactionResponse = result.find(({ id }) => id === trs2.id);

			expect((transactionResponse as any).status).toEqual(TransactionStatus.OK);
			expect((transactionResponse as any).errors).toEqual([]);
		});

		it('should return TransactionStatus.FAIL for persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			dataAccessMock.getTransactionsByIDs.mockResolvedValue([trs1]);

			const result = await transactionHandlers.checkPersistedTransactions(
				dataAccessMock,
			)([trs1, trs2]);

			const transactionResponse = result.find(({ id }) => id === trs1.id);

			expect((transactionResponse as any).status).toEqual(
				TransactionStatus.FAIL,
			);
			expect((transactionResponse as any).errors).toHaveLength(1);
			expect((transactionResponse as any).errors[0].message).toEqual(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Transaction is already confirmed: ${trs1.id}`,
			);
		});
	});

	describe('#applyGenesisTransactions', () => {
		const trs1Response = {
			status: TransactionStatus.OK,
			id: trs1.id,
		};
		const trs2Response = {
			status: TransactionStatus.OK,
			id: trs2.id,
		};

		beforeEach(() => {
			trs1.apply.mockReturnValue(trs1Response);
			trs2.apply.mockReturnValue(trs2Response);
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.prepare).toHaveBeenCalledTimes(1);
			expect(trs2.prepare).toHaveBeenCalledTimes(1);
		});

		it('should apply all transactions', async () => {
			await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.apply).toHaveBeenCalledTimes(1);
			expect(trs2.apply).toHaveBeenCalledTimes(1);
		});

		it('should override the status of transaction to TransactionStatus.OK', async () => {
			trs1.apply.mockReturnValue({
				status: TransactionStatus.FAIL,
				id: trs1.id,
			});

			const result = await transactionHandlers.applyGenesisTransactions()(
				[trs1],
				stateStoreMock,
			);

			expect(result[0].status).toEqual(TransactionStatus.OK);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			// expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result).toEqual([trs1Response, trs2Response]);
		});
	});

	describe('#applyTransactions', () => {
		let trs1Response: TransactionResponse;
		let trs2Response: TransactionResponse;

		beforeEach(() => {
			trs1Response = {
				status: TransactionStatus.OK,
				id: trs1.id,
				errors: [],
			};
			trs2Response = {
				status: TransactionStatus.OK,
				id: trs2.id,
				errors: [],
			};

			trs1.apply.mockReturnValue(trs1Response);
			trs2.apply.mockReturnValue(trs2Response);
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.applyTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.prepare).toHaveBeenCalledTimes(1);
			expect(trs2.prepare).toHaveBeenCalledTimes(1);
		});
	});

	describe('#undoTransactions', () => {
		let trs1Response: TransactionResponse;
		let trs2Response: TransactionResponse;

		beforeEach(() => {
			trs1Response = {
				status: TransactionStatus.OK,
				id: trs1.id,
				errors: [],
			};
			trs2Response = {
				status: TransactionStatus.OK,
				id: trs2.id,
				errors: [],
			};

			trs1.undo.mockReturnValue(trs1Response);
			trs2.undo.mockReturnValue(trs2Response);
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.undoTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.prepare).toHaveBeenCalledTimes(1);
			expect(trs2.prepare).toHaveBeenCalledTimes(1);
		});

		it('should undo for every transaction', async () => {
			await transactionHandlers.undoTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.undo).toHaveBeenCalledTimes(1);
			expect(trs2.undo).toHaveBeenCalledTimes(1);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.undoTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			// expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result).toEqual([trs1Response, trs2Response]);
		});
	});
});
