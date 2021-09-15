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
import { BlockHeader } from '@liskhq/lisk-chain/dist-node/block_header';
import { getAddressFromPublicKey, hash } from '@liskhq/lisk-cryptography';
import { dataStructures } from '@liskhq/lisk-utils';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { HighFeeGenerationStrategy } from '../../../../src/node/generator/strategies';
import {
	allValidCase,
	maxPayloadLengthCase,
	invalidTxCase,
	allInvalidCase,
} from './forging_fixtures';
import { StateMachine, VerifyStatus } from '../../../../src/node/state_machine';
import { fakeLogger } from '../../../utils/node';

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
	stateMachine: StateMachine,
) => {
	const tx = {
		id: Buffer.from(id),
		senderPublicKey: Buffer.from(senderPublicKey, 'hex'),
		nonce: BigInt(nonce),
		fee: BigInt(fee),
		feePriority,
		getBytes: jest.fn().mockReturnValue(Array(bytes)),
		getBasicBytes: jest.fn().mockReturnValue(Array(basicBytes)),
	};

	when(stateMachine.verifyTransaction as jest.Mock)
		.calledWith(expect.objectContaining({ _transaction: tx }))
		.mockResolvedValueOnce({
			status: valid === false ? VerifyStatus.PENDING : VerifyStatus.OK,
		} as never);

	return tx;
};

const buildProcessableTxMock = (input: any, stateMachine: StateMachine) => {
	const result = input
		.map((tx: any) => {
			return getTxMock(tx, stateMachine);
		})
		.reduce((res: any, tx: any) => {
			const senderId = getAddressFromPublicKey(tx.senderPublicKey);
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
		const logger = fakeLogger;
		const maxPayloadLength = 1000;
		const mockTxPool = {
			getProcessableTransactions: jest.fn().mockReturnValue(new dataStructures.BufferMap()),
		} as any;
		const chain = {
			constants: {
				networkIdentifier: Buffer.from('network identifier'),
			},
		} as never;
		const stateMachine = {
			verifyTransaction: jest.fn(),
			executeTransaction: jest.fn(),
		} as any;
		let header: BlockHeader;
		let strategy: HighFeeGenerationStrategy;

		beforeEach(() => {
			header = new BlockHeader({
				version: 2,
				generatorAddress: Buffer.from('address'),
				height: 20,
				previousBlockID: Buffer.from('id'),
				maxHeightGenerated: 0,
				maxHeightPrevoted: 0,
				assetsRoot: hash(Buffer.alloc(0)),
				transactionRoot: hash(Buffer.alloc(0)),
				validatorsHash: hash(Buffer.alloc(0)),
				stateRoot: hash(Buffer.alloc(0)),
				aggregateCommit: {
					aggregationBits: Buffer.alloc(0),
					certificateSignature: Buffer.alloc(0),
					height: 0,
				},
				timestamp: 100000000,
			});
			strategy = new HighFeeGenerationStrategy({
				pool: mockTxPool,
				chain,
				stateMachine,
				maxPayloadLength,
			});
			strategy.init({
				logger,
				blockchainDB: new InMemoryKVStore() as never,
			});
		});

		describe('getTransactionsForBlock', () => {
			it('should fetch processable transactions from transaction pool', async () => {
				// Act
				await strategy.getTransactionsForBlock(header);

				// Assert
				expect(mockTxPool.getProcessableTransactions).toHaveBeenCalledTimes(1);
			});
			it('should return transactions in order by highest feePriority and lowest nonce', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(allValidCase.input.transactions, stateMachine),
				);
				(strategy['_constants'] as any).maxPayloadLength = BigInt(
					allValidCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(header);

				// Assert
				expect(result.map((tx: any) => tx.id.toString())).toEqual(
					allValidCase.output.map(tx => tx.id),
				);
			});

			it('should forge transactions upto maximum payload length', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(maxPayloadLengthCase.input.transactions, stateMachine),
				);
				(strategy['_constants'] as any).maxPayloadLength = BigInt(
					maxPayloadLengthCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(header);

				// Assert
				expect(result.map((tx: any) => tx.id.toString())).toEqual(
					maxPayloadLengthCase.output.map(tx => tx.id),
				);
			});

			it('should not include subsequent transactions from same sender if one failed', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(invalidTxCase.input.transactions, stateMachine),
				);
				(strategy['_constants'] as any).maxPayloadLength = BigInt(
					invalidTxCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(header);

				// Assert
				expect(result.map((tx: any) => tx.id.toString())).toEqual(
					invalidTxCase.output.map(tx => tx.id),
				);
			});

			it('should forge empty block if there are no processable transactions', async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue([]);

				// Act
				const result = await strategy.getTransactionsForBlock(header);

				// Assert
				expect(result).toEqual([]);
			});

			it("should forge empty block if all processable transactions can't be processed", async () => {
				// Arrange
				mockTxPool.getProcessableTransactions.mockReturnValue(
					buildProcessableTxMock(allInvalidCase.input.transactions, stateMachine),
				);
				(strategy['_constants'] as any).maxPayloadLength = BigInt(
					allInvalidCase.input.maxPayloadLength,
				);

				// Act
				const result = await strategy.getTransactionsForBlock(header);

				// Assert
				expect(result).toEqual([]);
			});
		});
	});
});
