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

import { when } from 'jest-when';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {
	Status as TransactionStatus,
	TransactionResponse,
	BaseTransaction,
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
			expect(response).toHaveProperty('transactionsResponses', [
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
			expect(response.transactionsResponses.length).toBe(1);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'id',
				disallowedTransaction.id,
			);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'status',
				TransactionStatus.FAIL,
			);
			expect(response.transactionsResponses[0].errors.length).toBe(1);
			expect(response.transactionsResponses[0].errors[0]).toBeInstanceOf(Error);
			expect(response.transactionsResponses[0].errors[0].message).toBe(
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
			expect(response.transactionsResponses.length).toBe(1);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'id',
				transactionWithoutMatcherImpl.id,
			);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).toBe(0);
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
			expect(response.transactionsResponses.length).toBe(1);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'id',
				allowedTransaction.id,
			);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).toBe(0);
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
			expect(response.transactionsResponses.length).toBe(2);
			// Allowed transaction formatted response check
			expect(response.transactionsResponses[0]).toHaveProperty(
				'id',
				testTransactions[0].id,
			);
			expect(response.transactionsResponses[0]).toHaveProperty(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).toBe(0);

			// Allowed transaction formatted response check
			expect(response.transactionsResponses[1]).toHaveProperty(
				'id',
				testTransactions[1].id,
			);
			expect(response.transactionsResponses[1]).toHaveProperty(
				'status',
				TransactionStatus.FAIL,
			);
			expect(response.transactionsResponses[1].errors.length).toBe(1);
			expect(response.transactionsResponses[1].errors[0]).toBeInstanceOf(Error);
			expect(response.transactionsResponses[1].errors[0].message).toBe(
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

			expect(result).toEqual({
				transactionsResponses: [validResponse, invalidResponse],
			});
		});
	});

	describe('#checkPersistedTransactions', () => {
		it('should resolve in empty response if called with empty array', async () => {
			const result = await transactionHandlers.checkPersistedTransactions(
				dataAccessMock,
			)([]);

			expect(result).toEqual({ transactionsResponses: [] });
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

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs2.id,
			);

			expect((transactionResponse as any).status).toEqual(TransactionStatus.OK);
			expect((transactionResponse as any).errors).toEqual([]);
		});

		it('should return TransactionStatus.FAIL for persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			dataAccessMock.getTransactionsByIDs.mockResolvedValue([trs1]);

			const result = await transactionHandlers.checkPersistedTransactions(
				dataAccessMock,
			)([trs1, trs2]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs1.id,
			);

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

		it('should add transaction to state store', async () => {
			await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(stateStoreMock.transaction.add).toHaveBeenCalledWith(trs1);
			expect(stateStoreMock.transaction.add).toHaveBeenCalledWith(trs2);
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

			expect(result.transactionsResponses[0].status).toEqual(
				TransactionStatus.OK,
			);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.applyGenesisTransactions()(
				[trs1, trs2],
				stateStoreMock,
			);

			// expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result.transactionsResponses).toEqual([
				trs1Response,
				trs2Response,
			]);
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
			// sinonSandbox
			// jest.spyOn(transactionHandlers, 'verifyTotalSpending')
			// 	.mockReturnValue([trs1Response, trs2Response]);

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

		describe('when transactions have conflict on total spending', () => {
			let trs3: BaseTransaction;
			let trs4: BaseTransaction;
			let trs5: BaseTransaction;

			beforeEach(async () => {
				const senderId = getAddressFromPublicKey(trs1.senderPublicKey);
				trs3 = {
					...trs1,
				};
				trs4 = {
					...trs1,
				};
				trs5 = {
					...trs1,
					asset: {
						...trs1.asset,
						recipientId: senderId,
						amount: '100000000000000',
					},
				};

				when(stateStoreMock.account.get)
					.calledWith(senderId)
					.mockReturnValue({
						address: senderId,
						balance: (BigInt(trs3.fee) + BigInt(trs4.fee)).toString(),
					});
			});

			it('should return transaction error with amount', async () => {
				const {
					transactionsResponses,
				} = await transactionHandlers.applyTransactions()(
					[trs3, trs4, trs5],
					stateStoreMock,
				);
				expect(transactionsResponses[0].errors).toHaveLength(1);
				expect(transactionsResponses[0].errors[0].dataPath).toEqual('.amount');
			});
		});

		describe('when transactions have no conflict on total spending', () => {
			beforeEach(async () => {
				const senderId = getAddressFromPublicKey(trs1.senderPublicKey);
				when(stateStoreMock.account.get)
					.calledWith(senderId)
					.mockReturnValue({
						address: senderId,
						balance: '10000000000',
					});
				when(stateStoreMock.account.get)
					.calledWith(trs1.asset.recipientId)
					.mockReturnValue({
						address: trs1.asset.recipientId,
						balance: '0',
					});
				when(stateStoreMock.account.get)
					.calledWith(trs2.asset.recipientId)
					.mockReturnValue({
						address: trs2.asset.recipientId,
						balance: '0',
					});
			});

			it('should return transaction responses', async () => {
				const result = await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(result.transactionsResponses).toEqual([
					trs1Response,
					trs2Response,
				]);
			});

			it('should create snapshot before apply', async () => {
				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(stateStoreMock.account.createSnapshot).toHaveBeenCalledTimes(2);
			});

			it('should apply transaction', async () => {
				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(trs1.apply).toHaveBeenCalledTimes(1);
				expect(trs2.apply).toHaveBeenCalledTimes(1);
				expect(trs1.apply).toHaveBeenCalledWith(stateStoreMock);
				expect(trs2.apply).toHaveBeenCalledWith(stateStoreMock);
			});

			it('should update response for exceptions if response is not OK', async () => {
				(trs1Response as any).status = TransactionStatus.FAIL;
				trs1.apply.mockReturnValue(trs1Response);

				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(
					exceptionHandlers.updateTransactionResponseForExceptionTransactions,
				).toHaveBeenCalledTimes(1);
			});

			it('should not update response for exceptions if response is OK', async () => {
				(trs1Response as any).status = TransactionStatus.OK;
				trs1.apply.mockReturnValue(trs1Response);

				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(
					exceptionHandlers.updateTransactionResponseForExceptionTransactions,
				).not.toBeCalled();
			});

			it('should add to state store if transaction response is OK', async () => {
				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(stateStoreMock.transaction.add).toHaveBeenCalledTimes(2);
				expect(stateStoreMock.transaction.add).toHaveBeenCalledWith(trs1);
				expect(stateStoreMock.transaction.add).toHaveBeenCalledWith(trs2);
			});

			it('should not add to state store if transaction response is not OK', async () => {
				(trs1Response as any).status = TransactionStatus.FAIL;
				trs1.apply.mockReturnValue(trs1Response);
				(trs2Response as any).status = TransactionStatus.FAIL;
				trs2.apply.mockReturnValue(trs2Response);

				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(stateStoreMock.transaction.add).not.toBeCalled();
			});

			it('should not restore snapshot if transaction response is Ok', async () => {
				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(stateStoreMock.account.restoreSnapshot).not.toBeCalled();
			});

			it('should restore snapshot if transaction response is not Ok', async () => {
				(trs1Response as any).status = TransactionStatus.FAIL;
				trs1.apply.mockReturnValue(trs1Response);

				await transactionHandlers.applyTransactions()(
					[trs1, trs2],
					stateStoreMock,
				);

				expect(stateStoreMock.account.restoreSnapshot).toHaveBeenCalledTimes(1);
			});
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
			expect(result.transactionsResponses).toEqual([
				trs1Response,
				trs2Response,
			]);
		});
	});

	describe('#verifyTransactions', () => {
		let trs1Response: TransactionResponse;
		let trs2Response: TransactionResponse;
		let slotsMock: any;

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

			slotsMock = {
				getSlotNumber: jest.fn(),
			};

			jest.spyOn(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
		});

		it('should initialize the state store', async () => {
			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			// expect(StateStoreStub).toHaveBeenCalledTimes(1);
			// expect(StateStoreStub).toHaveBeenCalledWith(storageMock, {
			// 	mutate: false,
			// });
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.prepare).toHaveBeenCalledTimes(1);
			expect(trs2.prepare).toHaveBeenCalledTimes(1);
		});

		it('should create snapshot for every transaction', async () => {
			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(stateStoreMock.createSnapshot).toHaveBeenCalledTimes(2);
		});

		it('should apply all transaction', async () => {
			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(trs1.apply).toHaveBeenCalledTimes(1);
			expect(trs2.apply).toHaveBeenCalledTimes(1);
		});

		it('should override response if transaction is in future', async () => {
			// const futureDate = new Date() + 3600;

			when(slotsMock.getSlotNumber)
				.mockReturnValue(5)
				.calledWith(10)
				.mockReturnValueOnce(10);
			trs1.timestamp = 10;

			const result = await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1],
				stateStoreMock,
			);

			expect(result.transactionsResponses).toHaveLength(1);
			expect(result.transactionsResponses[0].status).toEqual(
				TransactionStatus.FAIL,
			);
			expect(result.transactionsResponses[0].errors[0].message).toEqual(
				'Invalid transaction timestamp. Timestamp is in the future',
			);
		});

		it('should restore snapshot for every transaction', async () => {
			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(stateStoreMock.restoreSnapshot).toHaveBeenCalledTimes(2);
		});

		it('should update response for exceptions if response is not OK', async () => {
			(trs1Response as any).status = TransactionStatus.FAIL;
			trs1.apply.mockReturnValue(trs1Response);

			await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).toHaveBeenCalledTimes(1);
			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).toHaveBeenCalledWith([trs1Response], [trs1, trs2], undefined);
		});

		it('should return transaction responses', async () => {
			const result = await transactionHandlers.verifyTransactions(slotsMock)(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(result.transactionsResponses).toEqual([
				trs1Response,
				trs2Response,
			]);
		});
	});

	describe('#processSignature', () => {
		const signature = {
			publicKey: '12356677',
			signature: 'signagure',
			transactionId: '123',
		};
		let addMultisignatureStub: any;

		beforeEach(async () => {
			addMultisignatureStub = jest.fn();

			trs1.addMultisignature = addMultisignatureStub;
		});

		it('should prepare transaction', async () => {
			await transactionHandlers.processSignature()(
				trs1,
				signature,
				stateStoreMock,
			);

			expect(trs1.prepare).toHaveBeenCalledTimes(1);
		});

		it('should add signature to transaction', async () => {
			await transactionHandlers.processSignature()(
				trs1,
				signature,
				stateStoreMock,
			);

			expect(addMultisignatureStub).toHaveBeenCalledTimes(1);
		});
	});

	describe('#verifyTotalSpending', () => {
		it('should not perform any check if there is only one transaction per sender', async () => {
			const account1 = randomUtils.account();
			const account2 = randomUtils.account();
			trs1.senderId = account1.address;
			trs2.senderId = account2.address;

			const result = await transactionHandlers.verifyTotalSpending(
				[trs1, trs2],
				stateStoreMock,
			);
			expect(result).toEqual([]);
		});

		it('should return error response if total spending is more than account balance', async () => {
			const accountBalance = '6';

			const account = randomUtils.account(accountBalance);
			when(stateStoreMock.account.get)
				.calledWith(account.address)
				.mockReturnValue(account);

			const validTransaction = randomUtils.transferInstance();
			(validTransaction as any).senderId = account.address;
			(validTransaction as any).asset.amount = '3';
			(validTransaction as any).fee = '2';

			const inValidTransaction1 = randomUtils.transferInstance();
			(inValidTransaction1 as any).senderId = account.address;
			(inValidTransaction1 as any).asset.amount = '3';
			(inValidTransaction1 as any).fee = '2';

			const inValidTransaction2 = randomUtils.transferInstance();
			(inValidTransaction2 as any).senderId = account.address;
			(inValidTransaction2 as any).asset.amount = '1';
			(inValidTransaction2 as any).fee = '1';

			// First transaction is valid, while second and third exceed the balance
			const transactions = [
				validTransaction, //   Valid: Spend 5 while balance is 6
				inValidTransaction1, // Invalid: Spend 5 + 5 = 10 while balance is 6
				inValidTransaction2, // Invalid: Spend 5 + 2 = 7 while balance is 6
			];

			const result = await transactionHandlers.verifyTotalSpending(
				transactions as any,
				stateStoreMock,
			);

			expect(result).toHaveLength(2);

			expect(result && result[0].id).toEqual(inValidTransaction1.id);
			expect(result && result[0].status).toEqual(TransactionStatus.FAIL);
			expect(result && result[0].errors[0].message).toEqual(
				`Account does not have enough LSK for total spending. balance: ${accountBalance}, spending: 10`,
			);

			expect(result && result[1].id).toEqual(inValidTransaction2.id);
			expect(result && result[1].status).toEqual(TransactionStatus.FAIL);
			expect(result && result[1].errors[0].message).toEqual(
				`Account does not have enough LSK for total spending. balance: ${accountBalance}, spending: 7`,
			);
		});

		it('should not return error response if total spending equal to account balance', async () => {
			const accountBalance = '8';

			const account = randomUtils.account(accountBalance);
			when(stateStoreMock.account.get)
				.calledWith(account.address)
				.mockReturnValue(account);

			const validTransaction1 = randomUtils.transferInstance();
			(validTransaction1 as any).senderId = account.address;
			(validTransaction1 as any).asset.amount = '2';
			(validTransaction1 as any).fee = '2';

			const validTransaction2 = randomUtils.transferInstance();
			(validTransaction2 as any).senderId = account.address;
			(validTransaction2 as any).asset.amount = '2';
			(validTransaction2 as any).fee = '2';

			const transactions = [
				validTransaction1, // Valid: Spend 4 while balance 8
				validTransaction2, // Valid: Spend 4 + 4 while balance 8
			];
			const result = await transactionHandlers.verifyTotalSpending(
				transactions as any,
				stateStoreMock,
			);

			expect(result).toEqual([]);
		});

		it('should not return error response if total spending is less than account balance', async () => {
			const accountBalance = '10';

			const account = randomUtils.account(accountBalance);
			when(stateStoreMock.account.get)
				.calledWith(account.address)
				.mockReturnValue(account);

			const validTransaction1 = randomUtils.transferInstance();
			(validTransaction1 as any).senderId = account.address;
			(validTransaction1 as any).asset.amount = '2';
			(validTransaction1 as any).fee = '2';

			const validTransaction2 = randomUtils.transferInstance();
			(validTransaction2 as any).senderId = account.address;
			(validTransaction2 as any).asset.amount = '2';
			(validTransaction2 as any).fee = '2';

			const transactions = [
				validTransaction1, // Valid: Spend 4 while balance 10
				validTransaction2, // Valid: Spend 4 + 4 while balance 10
			];
			const result = await transactionHandlers.verifyTotalSpending(
				transactions as any,
				stateStoreMock,
			);

			expect(result).toEqual([]);
		});
	});
});
