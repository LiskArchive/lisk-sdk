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
 */

import { Status as TransactionStatus } from '@liskhq/lisk-transactions';
import {
	HighFeeForgingStrategy,
} from '../../../../../../../src/application/node/forger/strategies';
import {
	allValidCase,
	maxPayloadLengthCase,
	invalidTxCase,
	allInvalidCase,
} from './forging_fixtures';

const getTxMock = (
	// eslint-disable-next-line @typescript-eslint/default-param-last
	{
		id,
		senderId,
		nonce,
		fee,
		feePriority,
		bytes = 0,
		basicBytes = 0,
		valid = true,
	} = {} as any,
	chainMock: any,
) => {
	const tx = {
		id,
		senderId,
		nonce,
		fee,
		feePriority,
		getBytes: jest.fn().mockReturnValue(Array(bytes)),
		getBasicBytes: jest.fn().mockReturnValue(Array(basicBytes)),
	};

	chainMock.applyTransactionsWithStateStore
		.calledWith([tx], undefined)
		.mockResolvedValueOnce([
			{
				id,
				status: valid ? TransactionStatus.OK : TransactionStatus.FAIL,
			},
		]);

	return tx;
};

const buildProcessableTxMock = (input: any, chainMock: jest.Mock) => {
	const result = input
		.map((tx: any) => {
			return getTxMock(tx, chainMock);
		})
		.reduce((res: any, tx: any) => {
			if (!res[tx.senderId]) {
				res[tx.senderId] = [];
			}

			res[tx.senderId].push(tx);

			return res;
		}, {});

	for (const senderId of Object.keys(result)) {
		// Ascending sort by nonce
		result[senderId] = result[senderId].sort((a: any, b: any) => a.nonce > b.nonce);
	}

	return result;
};

describe('strategies', () => {
	describe('HighFeeForgingStrategy', () => {
		const maxPayloadLength = 1000;
		const mockTxPool = {
			getProcessableTransactions: jest.fn().mockReturnValue({}),
		} as any;
		const mockChainModule = {
			newStateStore: jest.fn(),
			applyTransactionsWithStateStore: jest.fn(),
		} as any;
		let strategy: any;

		beforeEach(() => {
			strategy = new HighFeeForgingStrategy({
				transactionPoolModule: mockTxPool,
				chainModule: mockChainModule,
				maxPayloadLength,
			});
		});

		describe('getTransactionsForBlock', () => {
			it('should fetch processable transactions from transaction pool', async () => {
				// Act
				await strategy.getTransactionsForBlock();

				// Assert
				expect(mockTxPool.getProcessableTransactions).toHaveBeenCalledTimes(1);
			});
			it('should return transactions in order by highest feePriority and lowest nonce', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(
						allValidCase.input.transactions,
						mockChainModule,
					),
				);
				strategy.constants.maxPayloadLength = BigInt(
					allValidCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result.map((tx: any) => tx.id)).toEqual(
					allValidCase.output.map(tx => tx.id),
				);
			});

			it('should forge transactions upto maximum payload length', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(
						maxPayloadLengthCase.input.transactions,
						mockChainModule,
					),
				);
				strategy.constants.maxPayloadLength = BigInt(
					maxPayloadLengthCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result.map((tx: any) => tx.id)).toEqual(
					maxPayloadLengthCase.output.map(tx => tx.id),
				);
			});

			it('should not include subsequent transactions from same sender if one failed', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(
						invalidTxCase.input.transactions,
						mockChainModule,
					),
				);
				strategy.constants.maxPayloadLength = BigInt(
					invalidTxCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result.map((tx: any) => tx.id)).toEqual(
					invalidTxCase.output.map(tx => tx.id),
				);
			});

			it('should forge empty block if there are no processable transactions', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue([]);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result).toEqual([]);
			});
			it("should forge empty block if all processable transactions can't be processed", async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(
						allInvalidCase.input.transactions,
						mockChainModule,
					),
				);
				strategy.constants.maxPayloadLength = BigInt(
					allInvalidCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result).toEqual([]);
			});
		});
	});
});
