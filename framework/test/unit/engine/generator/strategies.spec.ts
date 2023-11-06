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

import { when } from 'jest-when';
import { utils, address } from '@liskhq/lisk-cryptography';
import { dataStructures } from '@liskhq/lisk-utils';
import { BlockAssets, BlockHeader } from '@liskhq/lisk-chain';
import { HighFeeGenerationStrategy } from '../../../../src/engine/generator/strategies';
import {
	allValidCase,
	maxTransactionsSizeCase,
	invalidTxCase,
	allInvalidCase,
} from './forging_fixtures';
import { ABI, TransactionVerifyResult, TransactionExecutionResult } from '../../../../src/abi';

const getTxMock = (
	// eslint-disable-next-line @typescript-eslint/default-param-last
	{
		id,
		senderPublicKey,
		nonce,
		fee,
		feePriority,
		bytes = 0,
		basicBytes = 0,
		valid = true,
	} = {} as any,
	abi: ABI,
) => {
	const tx = {
		id: Buffer.from(id),
		senderPublicKey: Buffer.from(senderPublicKey, 'hex'),
		nonce: BigInt(nonce),
		fee: BigInt(fee),
		feePriority,
		getBytes: jest.fn().mockReturnValue(Array(bytes)),
		getBasicBytes: jest.fn().mockReturnValue(Array(basicBytes)),
		toObject: () => ({
			id: Buffer.from(id),
			senderPublicKey: Buffer.from(senderPublicKey, 'hex'),
			nonce: BigInt(nonce),
			fee: BigInt(fee),
		}),
	};

	when(abi.verifyTransaction as jest.Mock)
		.calledWith({
			contextID: expect.any(Buffer),
			transaction: tx.toObject(),
			header: expect.any(Object),
			onlyCommand: false,
		})
		.mockResolvedValueOnce({
			result: valid === false ? TransactionVerifyResult.PENDING : TransactionVerifyResult.OK,
		} as never);

	return tx;
};

const buildProcessableTxMock = (input: any, abi: ABI) => {
	const result = input
		.map((tx: any) => {
			return getTxMock(tx, abi);
		})
		.reduce((res: any, tx: any) => {
			const senderId = address.getAddressFromPublicKey(tx.senderPublicKey);
			let txs = res.get(senderId);
			if (!txs) {
				txs = [];
			}
			txs.push(tx);
			res.set(senderId, txs);

			return res;
		}, new dataStructures.BufferMap());

	for (const txs of result.values()) {
		// Ascending sort by nonce
		txs.sort((a: any, b: any) => a.nonce > b.nonce);
	}

	return result;
};

describe('strategies', () => {
	describe('HighFeeForgingStrategy', () => {
		const maxTransactionsSize = 1000;
		const mockTxPool = {
			getProcessableTransactions: jest.fn().mockReturnValue(new dataStructures.BufferMap()),
		} as any;
		const contextID = utils.getRandomBytes(32);

		let header: BlockHeader;
		let strategy: HighFeeGenerationStrategy;
		let abi: ABI;

		beforeEach(() => {
			header = new BlockHeader({
				version: 2,
				generatorAddress: Buffer.from('address'),
				height: 20,
				previousBlockID: Buffer.from('id'),
				maxHeightGenerated: 0,
				maxHeightPrevoted: 0,
				impliesMaxPrevotes: true,
				assetRoot: utils.hash(Buffer.alloc(0)),
				transactionRoot: utils.hash(Buffer.alloc(0)),
				eventRoot: utils.hash(Buffer.alloc(0)),
				validatorsHash: utils.hash(Buffer.alloc(0)),
				signature: Buffer.alloc(0),
				stateRoot: utils.hash(Buffer.alloc(0)),
				aggregateCommit: {
					aggregationBits: Buffer.alloc(0),
					certificateSignature: Buffer.alloc(0),
					height: 0,
				},
				timestamp: 100000000,
			});
			abi = {
				verifyTransaction: jest.fn().mockResolvedValue({ result: TransactionVerifyResult.OK }),
				executeTransaction: jest
					.fn()
					.mockResolvedValue({ result: TransactionExecutionResult.OK, events: [] }),
			} as never;
			strategy = new HighFeeGenerationStrategy({
				pool: mockTxPool,
				abi,
				maxTransactionsSize,
			});
		});

		describe('getTransactionsForBlock', () => {
			it('should fetch processable transactions from transaction pool', async () => {
				// Act
				await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(mockTxPool.getProcessableTransactions).toHaveBeenCalledTimes(1);
			});

			it('should return transactions in order by highest feePriority and lowest nonce', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(allValidCase.input.transactions, abi),
				);
				(strategy['_constants'] as any).maxTransactionsSize = BigInt(
					allValidCase.input.maxTransactionsSize,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result.transactions.map((tx: any) => tx.id.toString())).toEqual(
					allValidCase.output.map(tx => tx.id),
				);
			});

			it('should forge transactions upto maximum transactions length', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(maxTransactionsSizeCase.input.transactions, abi),
				);
				(strategy['_constants'] as any).maxTransactionsSize = BigInt(
					maxTransactionsSizeCase.input.maxTransactionsSize,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result.transactions.map((tx: any) => tx.id.toString())).toEqual(
					maxTransactionsSizeCase.output.map(tx => tx.id),
				);
			});

			it('should not execute transaction if the transaction byte size exceeds max transaction byte size allowed for the block', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(maxTransactionsSizeCase.input.transactions, abi),
				);
				(strategy['_constants'] as any).maxTransactionsSize = BigInt(
					maxTransactionsSizeCase.input.maxTransactionsSize,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result.transactions.map((tx: any) => tx.id.toString())).toEqual(
					maxTransactionsSizeCase.output.map(tx => tx.id),
				);
				expect(abi.executeTransaction).toHaveBeenCalledTimes(maxTransactionsSizeCase.output.length);
			});

			it('should not include subsequent transactions from same sender if one failed', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(invalidTxCase.input.transactions, abi),
				);
				(strategy['_constants'] as any).maxTransactionsSize = BigInt(
					invalidTxCase.input.maxTransactionsSize,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result.transactions.map((tx: any) => tx.id.toString())).toEqual(
					invalidTxCase.output.map(tx => tx.id),
				);
			});

			it('should forge empty block if there are no processable transactions', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue([]);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result).toEqual({ transactions: [], events: [] });
			});

			it("should forge empty block if all processable transactions can't be processed", async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(allInvalidCase.input.transactions, abi),
				);
				(strategy['_constants'] as any).maxTransactionsSize = BigInt(
					allInvalidCase.input.maxTransactionsSize,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(contextID, header, new BlockAssets());

				// Assert
				expect(result).toEqual({ transactions: [], events: [] });
			});
		});
	});
});
