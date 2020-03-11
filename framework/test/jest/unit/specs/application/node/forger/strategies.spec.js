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

'use strict';

const { when } = require('jest-when');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	HighFeeForgingStrategy,
} = require('../../../../../../../src/application/node/forger/strategies');
const {
	allValidCase,
	maxPayloadLengthCase,
	maxPayloadSkipHighByte,
	invalidTxCase,
	allInvalidCase,
} = require('./forging_fixtures');

const getTxMock = (
	{ id, senderId, nonce, fee, bytes = 0, basicBytes = 0, valid = true } = {},
	chainMock,
) => {
	const tx = {
		id,
		senderId,
		nonce,
		fee,
		getBytes: jest.fn().mockReturnValue(Array(bytes)),
		getBasicBytes: jest.fn().mockReturnValue(Array(basicBytes)),
	};

	when(chainMock.applyTransactionsWithStateStore)
		.calledWith([tx], undefined)
		.mockResolvedValueOnce({
			transactionsResponses: [
				{
					id,
					status: valid ? TransactionStatus.OK : TransactionStatus.FAIL,
				},
			],
		});

	return tx;
};

const buildProcessableTxMock = (input, chainMock) => {
	const result = input
		.map(tx => {
			return getTxMock(tx, chainMock);
		})
		.reduce((res, tx) => {
			if (!res[tx.senderId]) {
				res[tx.senderId] = [];
			}

			res[tx.senderId].push(tx);

			return res;
		}, {});

	for (const senderId of Object.keys(result)) {
		// Ascending sort by nonce
		result[senderId] = result[senderId].sort((a, b) => a.nonce > b.nonce);
	}

	return result;
};

describe('strategies', () => {
	describe('HighFeeForgingStrategy', () => {
		const maxPayloadLength = 1000;
		const mockTxPool = {
			getProcessableTransactions: jest.fn().mockReturnValue({}),
		};
		const mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		const mockChainModule = {
			newStateStore: jest.fn(),
			applyTransactionsWithStateStore: jest.fn(),
		};
		let strategy;

		beforeEach(() => {
			strategy = new HighFeeForgingStrategy({
				logger: mockLogger,
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
				expect(mockTxPool.getProcessableTransactions).toBeCalledTimes(1);
			});
			it('should return transactions in order by highest fee and lowest nonce', async () => {
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
				expect(result.map(tx => tx.id)).toEqual(
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
				expect(result.map(tx => tx.id)).toEqual(
					maxPayloadLengthCase.output.map(tx => tx.id),
				);
			});

			it('should forge transactions to fit maximum payload and skip high byte size valid transactions', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(
						maxPayloadSkipHighByte.input.transactions,
						mockChainModule,
					),
				);
				strategy.constants.maxPayloadLength = BigInt(
					maxPayloadSkipHighByte.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock();

				// Assert
				expect(result.map(tx => tx.id)).toEqual(
					maxPayloadSkipHighByte.output.map(tx => tx.id),
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
				expect(result.map(tx => tx.id)).toEqual(
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
