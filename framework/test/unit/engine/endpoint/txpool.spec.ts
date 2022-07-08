/*
 * Copyright © 2021 Lisk Foundation
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

import { intToBuffer } from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { ABI, TransactionVerifyResult } from '../../../../src/abi';
import { Logger } from '../../../../src/logger';
import { Broadcaster } from '../../../../src/engine/generator/broadcaster';
import { InvalidTransactionError } from '../../../../src/engine/generator/errors';
import { fakeLogger } from '../../../utils/mocks';
import { TxpoolEndpoint } from '../../../../src/engine/endpoint/txpool';

describe('generator endpoint', () => {
	const logger: Logger = fakeLogger;
	const tx = new Transaction({
		params: Buffer.alloc(20),
		commandID: intToBuffer(0, 4),
		fee: BigInt(100000),
		moduleID: intToBuffer(2, 4),
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(32),
		signatures: [Buffer.alloc(64)],
	});
	const networkIdentifier = Buffer.alloc(0);

	let endpoint: TxpoolEndpoint;
	let broadcaster: Broadcaster;
	let pool: TransactionPool;
	let abi: ABI;

	beforeEach(() => {
		broadcaster = {
			enqueueTransactionId: jest.fn(),
		} as never;
		pool = {
			contains: jest.fn().mockReturnValue(false),
			add: jest.fn().mockResolvedValue({}),
		} as never;
		abi = {
			verifyTransaction: jest.fn().mockResolvedValue({ result: TransactionVerifyResult.OK }),
		} as never;
		endpoint = new TxpoolEndpoint({
			abi,
			broadcaster,
			pool,
		});
	});

	describe('postTransaction', () => {
		describe('when request data is invalid', () => {
			it('should reject with validation error', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							invalid: 'schema',
						},
						networkIdentifier,
					}),
				).rejects.toThrow(LiskValidationError);
			});

			it('should reject with error when transaction bytes is invalid', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: 'xxxx',
						},
						networkIdentifier,
					}),
				).rejects.toThrow();
			});
		});

		describe('when verify transaction fails', () => {
			it('should throw when transaction is invalid', async () => {
				(abi.verifyTransaction as jest.Mock).mockResolvedValue({
					result: TransactionVerifyResult.INVALID,
				});
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).rejects.toThrow(InvalidTransactionError);
			});
		});

		describe('when transaction pool already contains the transaction', () => {
			it('should return the transaction id', async () => {
				(pool.contains as jest.Mock).mockReturnValue(true);
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toEqual({
					transactionId: tx.id.toString('hex'),
				});
			});
		});

		describe('when failed to add to the transaction', () => {
			it('should throw when transaction is invalid', async () => {
				(pool.add as jest.Mock).mockResolvedValue({
					error: new Error('invalid tx'),
				});
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).rejects.toThrow(InvalidTransactionError);
			});
		});

		describe('when successfully to add to the transaction pool', () => {
			it('should return the transaction id', async () => {
				await expect(
					endpoint.postTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						networkIdentifier,
					}),
				).resolves.toEqual({
					transactionId: tx.id.toString('hex'),
				});
				expect(broadcaster.enqueueTransactionId).toHaveBeenCalledWith(tx.id);
			});
		});
	});
});
