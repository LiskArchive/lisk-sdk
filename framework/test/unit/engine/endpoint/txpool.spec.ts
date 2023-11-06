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

import { utils, address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { Chain, Transaction, Event, TransactionAttrs } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { ABI, TransactionExecutionResult, TransactionVerifyResult } from '../../../../src/abi';
import { Logger } from '../../../../src/logger';
import { Broadcaster } from '../../../../src/engine/generator/broadcaster';
import { InvalidTransactionError } from '../../../../src/engine/generator/errors';
import { fakeLogger } from '../../../utils/mocks';
import { TxpoolEndpoint } from '../../../../src/engine/endpoint/txpool';
import { VerifyStatus } from '../../../../src';
import { ED25519_PUBLIC_KEY_LENGTH } from '../../../../src/engine/bft/constants';

const ED25519_SIGNATURE_LENGTH = 64;

describe('txpool endpoint', () => {
	const logger: Logger = fakeLogger;
	const tx = new Transaction({
		module: 'token',
		command: 'transfer',
		params: Buffer.alloc(20),
		fee: BigInt(100000),
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(ED25519_PUBLIC_KEY_LENGTH),
		signatures: [Buffer.alloc(ED25519_SIGNATURE_LENGTH)],
	});
	const chainID = Buffer.alloc(0);
	const events = [
		{
			data: utils.getRandomBytes(32),
			index: 0,
			module: 'token',
			topics: [Buffer.from([0])],
			name: 'Token Event Name',
			height: 12,
		},
	];
	const eventsJson = events.map(e => new Event(e).toJSON());

	let endpoint: TxpoolEndpoint;
	let broadcaster: Broadcaster;
	let pool: TransactionPool;
	let abi: ABI;
	let chain: Chain;

	const senderPublicKey = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH);
	const senderLisk32Address = cryptoAddress.getLisk32AddressFromPublicKey(senderPublicKey);

	const transactionAttributes: TransactionAttrs[] = [
		{
			module: 'module0',
			command: 'command0',
			senderPublicKey: utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH),
			nonce: BigInt(88),
			fee: BigInt(23),
			params: Buffer.from('params0'),
			signatures: [utils.getRandomBytes(ED25519_SIGNATURE_LENGTH)],
		},
		{
			module: 'module1',
			command: 'command1',
			senderPublicKey,
			nonce: BigInt(12),
			fee: BigInt(34),
			params: Buffer.from('params1'),
			signatures: [utils.getRandomBytes(ED25519_SIGNATURE_LENGTH)],
		},
		{
			module: 'module2',
			command: 'command2',
			senderPublicKey: utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH),
			nonce: BigInt(12),
			fee: BigInt(34),
			params: Buffer.from('params2'),
			signatures: [utils.getRandomBytes(ED25519_SIGNATURE_LENGTH)],
		},
	];

	const transactionsFromPool = transactionAttributes.map(
		transaction => new Transaction(transaction),
	);

	beforeEach(() => {
		broadcaster = { enqueueTransactionId: jest.fn() } as never;

		pool = {
			contains: jest.fn().mockReturnValue(false),
			add: jest.fn().mockResolvedValue({}),
			getAll: jest.fn().mockReturnValue(transactionsFromPool),
		} as never;

		abi = {
			verifyTransaction: jest.fn().mockResolvedValue({ result: TransactionVerifyResult.OK }),
			executeTransaction: jest.fn(),
		} as never;

		chain = {
			lastBlock: {
				header: {
					toObject: jest.fn(),
				},
				transactions: [],
				assets: {
					getAll: jest.fn(),
				},
			},
		} as never;

		endpoint = new TxpoolEndpoint({
			abi,
			broadcaster,
			pool,
			chain,
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
						chainID,
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
						chainID,
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
						chainID,
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
						chainID,
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
						chainID,
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
						chainID,
					}),
				).resolves.toEqual({
					transactionId: tx.id.toString('hex'),
				});
				expect(broadcaster.enqueueTransactionId).toHaveBeenCalledWith(tx.id);
			});
		});
	});

	describe('getTransactionsFromPool', () => {
		it('should return all transactions in the pool in JSON format, when no address is provided', async () => {
			const transactions = await endpoint.getTransactionsFromPool({
				logger,
				params: {},
				chainID,
			});

			expect(transactions).toHaveLength(transactionsFromPool.length);
			expect(transactions[0].id).toBe(transactionsFromPool[0].id.toString('hex'));
		});

		it('should return only transactions sent from the provided address, when address is provided', async () => {
			const transactions = await endpoint.getTransactionsFromPool({
				logger,
				params: { address: senderLisk32Address },
				chainID,
			});

			expect(transactions).toHaveLength(1);
			expect(transactions[0].id).toBe(transactionsFromPool[1].id.toString('hex'));
		});

		it('should return no transactions, when provided address does not correspond to any transaction in the pool', async () => {
			const transactions = await endpoint.getTransactionsFromPool({
				logger,
				params: { address: 'lskw95gtvf3fpjm5y49hrc4fuhoy4n7dtp75adgx5' },
				chainID,
			});

			expect(transactions).toHaveLength(0);
		});
	});

	describe('dryRunTransaction', () => {
		describe('when request data is invalid', () => {
			it('should reject with validation error', async () => {
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							invalid: 'schema',
						},
						chainID,
					}),
				).rejects.toThrow("must have required property 'transaction'");
			});

			it('should reject with error when transaction bytes is invalid', async () => {
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: 'xxxx',
						},
						chainID,
					}),
				).rejects.toThrow();
			});

			it('should reject with error when skipVerify is not boolean', async () => {
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: 'xxxx',
							skipVerify: 'test',
						},
						chainID,
					}),
				).rejects.toThrow("'.skipVerify' should be of type 'boolean'");
			});
		});

		describe('when verify transaction fails', () => {
			it('should return false with empty events array', async () => {
				(abi.verifyTransaction as jest.Mock).mockResolvedValue({
					result: TransactionVerifyResult.INVALID,
				});
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						chainID,
					}),
				).resolves.toEqual({
					result: TransactionVerifyResult.INVALID,
					events: [],
					errorMessage: undefined,
				});
			});
		});

		describe('when execute transaction returns INVALID', () => {
			it('should return false with corresponding events', async () => {
				(abi.executeTransaction as jest.Mock).mockResolvedValue({
					result: TransactionExecutionResult.INVALID,
					events,
				});
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						chainID,
					}),
				).resolves.toEqual({
					result: TransactionVerifyResult.INVALID,
					events: eventsJson,
				});
			});
		});

		describe('when execute transaction returns FAIL', () => {
			it('should return false with corresponding events', async () => {
				(abi.executeTransaction as jest.Mock).mockResolvedValue({
					result: TransactionExecutionResult.FAIL,
					events,
				});
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						chainID,
					}),
				).resolves.toEqual({
					result: TransactionExecutionResult.FAIL,
					events: eventsJson,
				});
			});
		});

		describe('when strict is false', () => {
			it('should call verifyTransaction with onlyCommand true', async () => {
				(abi.executeTransaction as jest.Mock).mockResolvedValue({
					result: TransactionExecutionResult.OK,
					events,
				});
				await endpoint.dryRunTransaction({
					logger,
					params: {
						transaction: tx.getBytes().toString('hex'),
					},
					chainID,
				});

				expect(abi.verifyTransaction).toHaveBeenCalledWith({
					contextID: expect.anything(),
					transaction: expect.anything(),
					onlyCommand: true,
				});
			});
		});

		describe('when strict is true', () => {
			it('should call verifyTransaction with onlyCommand false', async () => {
				(abi.executeTransaction as jest.Mock).mockResolvedValue({
					result: TransactionExecutionResult.OK,
					events,
				});
				await endpoint.dryRunTransaction({
					logger,
					params: {
						transaction: tx.getBytes().toString('hex'),
						strict: true,
					},
					chainID,
				});

				expect(abi.verifyTransaction).toHaveBeenCalledWith({
					contextID: expect.anything(),
					transaction: expect.anything(),
					onlyCommand: false,
				});
			});
		});

		it('should not verify transaction when skipVerify', async () => {
			(abi.verifyTransaction as jest.Mock).mockResolvedValue({
				result: TransactionVerifyResult.OK,
			});

			(abi.executeTransaction as jest.Mock).mockResolvedValue({
				result: TransactionExecutionResult.OK,
				events,
			});

			await expect(
				endpoint.dryRunTransaction({
					logger,
					params: {
						transaction: tx.getBytes().toString('hex'),
						skipVerify: true,
					},
					chainID,
				}),
			).toResolve();

			expect(abi.verifyTransaction).toHaveBeenCalledTimes(0);
		});

		describe('when both verification is success & execution returns OK', () => {
			it('should return true with corresponding events', async () => {
				(abi.executeTransaction as jest.Mock).mockResolvedValue({
					result: TransactionExecutionResult.OK,
					events,
				});
				await expect(
					endpoint.dryRunTransaction({
						logger,
						params: {
							transaction: tx.getBytes().toString('hex'),
						},
						chainID,
					}),
				).resolves.toEqual({
					result: VerifyStatus.OK,
					events: eventsJson,
				});
			});
		});
	});
});
