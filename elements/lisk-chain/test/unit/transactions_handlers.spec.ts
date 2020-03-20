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
import * as votesWeightHandler from '../../src/transactions/votes_weight';
import * as exceptionHandlers from '../../src/transactions/exceptions_handlers';
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

	beforeEach(async () => {
		// Add matcher to transactions
		trs1.matcher = () => true;
		trs2.matcher = () => true;

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
		it('should return a proper response format', async () => {
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

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', async () => {
			// Arrange
			const disallowedTransaction = {
				...trs1,
				matcher: () => false,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([disallowedTransaction]);

			// Assert
			expect(response.length).toBe(1);
			expect(response[0]).toHaveProperty('id', disallowedTransaction.id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.FAIL);
			expect(response[0].errors.length).toBe(1);
			expect(response[0].errors[0]).toBeInstanceOf(Error);
			expect(response[0].errors[0].message).toBe(
				`Transaction type ${disallowedTransaction.type} is currently not allowed.`,
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', async () => {
			// Arrange
			const { matcher, ...transactionWithoutMatcherImpl } = trs1;

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([transactionWithoutMatcherImpl]);

			// Assert
			expect(response.length).toBe(1);
			expect(response[0]).toHaveProperty(
				'id',
				transactionWithoutMatcherImpl.id,
			);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors.length).toBe(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', async () => {
			// Arrange
			const allowedTransaction = {
				...trs1,
				matcher: () => true,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(
				dummyState,
			)([allowedTransaction]);

			// Assert
			expect(response.length).toBe(1);
			expect(response[0]).toHaveProperty('id', allowedTransaction.id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors.length).toBe(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', async () => {
			// Arrange
			const testTransactions = [
				trs1, // Allowed
				{
					...trs1,
					matcher: () => false, // Disallowed
				},
			];

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				testTransactions,
			);

			// Assert
			expect(response.length).toBe(2);
			// Allowed transaction formatted response check
			expect(response[0]).toHaveProperty('id', testTransactions[0].id);
			expect(response[0]).toHaveProperty('status', TransactionStatus.OK);
			expect(response[0].errors.length).toBe(0);

			// Allowed transaction formatted response check
			expect(response[1]).toHaveProperty('id', testTransactions[1].id);
			expect(response[1]).toHaveProperty('status', TransactionStatus.FAIL);
			expect(response[1].errors.length).toBe(1);
			expect(response[1].errors[0]).toBeInstanceOf(Error);
			expect(response[1].errors[0].message).toBe(
				`Transaction type ${testTransactions[1].type} is currently not allowed.`,
			);
		});
	});

	describe('#validateTransactions', () => {
		const validResponse = { status: TransactionStatus.OK, id: trs1.id };
		const invalidResponse = { status: TransactionStatus.FAIL, id: trs2.id };

		beforeEach(async () => {
			trs1.validate = jest.fn().mockReturnValue(validResponse);
			trs2.validate = jest.fn().mockReturnValue(invalidResponse);
		});

		it('should invoke validate() on each transaction', async () => {
			transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(trs1.validate).toHaveBeenCalledTimes(1);
			expect(trs2.validate).toHaveBeenCalledTimes(1);
		});

		it('should update responses for exceptions for invalid responses', async () => {
			jest.spyOn(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
			transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).toHaveBeenCalledTimes(1);
			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).toHaveBeenCalledWith([invalidResponse], [trs1, trs2], undefined);
		});

		it('should return transaction responses', async () => {
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

		beforeEach(async () => {
			trs1.apply.mockReturnValue(trs1Response);
			trs2.apply.mockReturnValue(trs2Response);
			jest.spyOn(votesWeightHandler, 'prepare');
			jest.spyOn(votesWeightHandler, 'apply');
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

		it('should call transaction to vote.apply', async () => {
			await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(votesWeightHandler.apply).toHaveBeenCalledTimes(2);
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

		beforeEach(async () => {
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

			jest.spyOn(votesWeightHandler, 'prepare');
			jest.spyOn(votesWeightHandler, 'apply');

			jest.spyOn(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
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

		beforeEach(async () => {
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

			jest.spyOn(votesWeightHandler, 'undo');
			jest.spyOn(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
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

		it('should undo round information for every transaction', async () => {
			await transactionHandlers.undoTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(votesWeightHandler.undo).toHaveBeenCalledTimes(2);
		});

		it('should update exceptions for responses which are not OK', async () => {
			(trs1Response as any).status = TransactionStatus.FAIL;
			trs1.undo.mockReturnValue(trs1Response);

			await transactionHandlers.undoTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).toHaveBeenCalledTimes(1);
			// expect(
			// 	exceptionHandlers.updateTransactionResponseForExceptionTransactions
			// ).toHaveBeenCalledWith([trs1Response], [trs1, trs2]);
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
