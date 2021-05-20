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
import { dataStructures } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';

import { Transport } from '../../../../src/node/transport';
import { genesis } from '../../../fixtures';
import { createTransferTransaction } from '../../../utils/node/transaction';
import {
	transactionIdsSchema,
	getHighestCommonBlockRequestSchema,
	transactionsSchema,
	getBlocksFromIdRequestSchema,
} from '../../../../src/node/transport/schemas';

describe('Transport', () => {
	const defaultBroadcastInterval = 5000;
	const defaultReleaseLimit = 100;
	const encodedBlock = Buffer.from('encodedBlock');
	const networkIdentifier = '93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';
	const defaultRateLimit = 10000;

	let transport: any;
	let transactionPoolStub: any;
	let synchronizerStub: any;
	let chainStub: any;
	let loggerStub: any;
	let processorStub: any;
	let channelStub: any;
	let networkStub: any;

	beforeEach(() => {
		// Needs to reset the job registered
		channelStub = {
			invoke: jest.fn(),
			publish: jest.fn(),
		};
		loggerStub = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		};
		transactionPoolStub = {
			contains: jest.fn().mockReturnValue(true),
			get: jest.fn(),
			getProcessableTransactions: jest.fn().mockReturnValue(new dataStructures.BufferMap()),
			add: jest.fn(),
		};
		networkStub = {
			requestFromPeer: jest.fn(),
			applyPenaltyOnPeer: jest.fn(),
			broadcast: jest.fn(),
		};
		synchronizerStub = {};
		chainStub = {
			deserializeTransaction: jest.fn().mockImplementation(val => ({ ...val, toJSON: () => val })),
			dataAccess: {
				getTransactionByID: jest.fn(),
				getTransactionsByIDs: jest.fn(),
				getHighestCommonBlockHeader: jest.fn(),
				getBlockHeaderByID: jest.fn().mockReturnValue({ height: 123 }),
				getBlocksByHeightBetween: jest.fn().mockReturnValue([{ height: 123 }]),
				decodeTransaction: jest.fn(),
				encodeBlockHeader: jest.fn().mockReturnValue(encodedBlock),
				encode: jest.fn().mockReturnValue(encodedBlock),
			},
		};
		processorStub = {
			validateTransaction: jest.fn(),
		};
		transport = new Transport({
			channel: channelStub,
			logger: loggerStub,
			// Modules
			synchronizer: synchronizerStub,
			transactionPoolModule: transactionPoolStub,
			chainModule: chainStub,
			processorModule: processorStub,
			networkModule: networkStub,
		});
		jest.spyOn(transport['_broadcaster'], 'enqueueTransactionId');
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllTimers();
	});

	describe('handleBroadcastTransaction', () => {
		describe('when a transaction is given', () => {
			it('should enqueue to the broadcaster', async () => {
				// Arrange
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});

				// Act
				transport['_broadcaster']._transactionIdQueue = [];
				await transport.handleBroadcastTransaction(tx);

				// Assert
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});

			it('should broadcast after 5 sec', async () => {
				// Arrange
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});

				// Act
				await transport.handleBroadcastTransaction(tx);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				const transactionIdsBuffer = codec.encode(transactionIdsSchema, {
					transactionIds: [tx.id],
				});

				// Assert
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: transactionIdsBuffer,
				});
			});
		});

		describe('when a duplicate transaction is given', () => {
			it('should not enqueue to the broadcaster', async () => {
				// Arrange
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});

				// Act
				transport['_broadcaster']._transactionIdQueue = [];
				await transport.handleBroadcastTransaction(tx);
				await transport.handleBroadcastTransaction(tx);

				// Assert
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});
		});

		describe('when the transaction is not in the pool', () => {
			it('should not broadcast after 5 sec', async () => {
				// Arrange
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});

				// Act
				await transport.handleBroadcastTransaction(tx);
				transactionPoolStub.contains.mockReturnValue(false);
				jest.advanceTimersByTime(defaultBroadcastInterval);

				// Assert
				expect(networkStub.broadcast).not.toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: [tx.id],
					},
				});
			});
		});

		describe('when 25 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
				// Arrange
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = createTransferTransaction({
						nonce: BigInt(v),
						fee: BigInt('100000000'),
						amount: BigInt(v + 1),
						recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
						networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
						passphrase: genesis.passphrase,
					});
					return tx;
				});

				// Act
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}

				// Assert
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(25);
			});

			it('should broadcast all after 5 sec', async () => {
				// Arrange
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = createTransferTransaction({
						nonce: BigInt('0'),
						fee: BigInt('100000000'),
						amount: BigInt(v + 1),
						recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
						networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
						passphrase: genesis.passphrase,
					});
					return tx;
				});
				const transactionIdsBuffer = codec.encode(transactionIdsSchema, {
					transactionIds: txs.map(tx => tx.id),
				});

				// Act
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);

				// Assert
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: transactionIdsBuffer,
				});
			});
		});

		describe('when 50 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
				// Arrange
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = createTransferTransaction({
						nonce: BigInt('0'),
						fee: BigInt('100000000'),
						amount: BigInt(v + 1),
						recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
						networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
						passphrase: genesis.passphrase,
					});
					return tx;
				});

				// Act
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}

				// Assert
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(50);
			});

			it('should broadcast all after 10 sec', async () => {
				// Arrange
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = createTransferTransaction({
						nonce: BigInt('0'),
						fee: BigInt('100000000'),
						amount: BigInt(v + 1),
						networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
						passphrase: genesis.passphrase,
						recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					});
					return tx;
				});
				const transactionIdsBuffer = codec.encode(transactionIdsSchema, {
					transactionIds: txs.map(tx => tx.id).splice(0, defaultReleaseLimit),
				});

				// Act
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval * 2);

				// Assert
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: transactionIdsBuffer,
				});
			});
		});
	});

	describe('handleRPCGetHighestCommonBlock', () => {
		const defaultPeerId = 'peer-id';

		describe('when commonBlock has not been found', () => {
			beforeEach(() => {
				chainStub.dataAccess.getHighestCommonBlockHeader.mockResolvedValue(undefined);
			});

			it('should return null', async () => {
				// Arrange
				const ids = [Buffer.from('15196562876801949910')];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, { ids });

				// Act
				const result = await transport.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId);

				// Assert
				expect(chainStub.dataAccess.getHighestCommonBlockHeader).toHaveBeenCalledWith(ids);
				expect(result).toBeUndefined();
			});
		});

		describe('when commonBlock has been found', () => {
			const validBlock = {
				ids: [Buffer.from('15196562876801949910').toString('hex')],
			};

			beforeEach(() => {
				chainStub.dataAccess.getHighestCommonBlockHeader.mockResolvedValue(validBlock);
			});

			it('should return the result', async () => {
				// Arrange
				const ids = [Buffer.from('15196562876801949910')];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, { ids });

				// Act
				const result = await transport.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId);

				// Assert
				expect(chainStub.dataAccess.getHighestCommonBlockHeader).toHaveBeenCalledWith(ids);
				expect(result).toBe(encodedBlock);
			});
		});
	});

	describe('handleRPCGetTransactions', () => {
		const defaultPeerId = 'peer-id';
		describe('when it is called more than 3 times within 10 sec', () => {
			it('should apply penalty', async () => {
				// Arrange & Act
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				jest.advanceTimersByTime(defaultRateLimit);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});

		describe('when it is called with undefined', () => {
			let tx: Transaction;
			beforeEach(() => {
				tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				const processableTransactions = new dataStructures.BufferMap();
				processableTransactions.set(tx.id, tx);
				transactionPoolStub.getProcessableTransactions.mockReturnValue(processableTransactions);
			});

			it('should resolve to the transactions which are in the transaction pool', async () => {
				// Act
				const result = await transport.handleRPCGetTransactions(undefined, defaultPeerId);
				const expectedResult = codec.decode(transactionsSchema, result);

				// Assert
				expect(expectedResult).toEqual({
					transactions: [tx.getBytes()],
				});
			});
		});

		describe('when it is called without ids', () => {
			let tx: any;
			beforeEach(() => {
				tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				const processableTransactions = new dataStructures.BufferMap();
				processableTransactions.set(tx.id, [tx]);
				transactionPoolStub.getProcessableTransactions.mockReturnValue(processableTransactions);
			});

			it('should return transaction from pool', async () => {
				// Act
				const result = await transport.handleRPCGetTransactions({}, defaultPeerId);
				const expectedResult = codec.decode(transactionsSchema, result);

				// Assert
				expect(expectedResult).toEqual({
					transactions: [tx.getBytes()],
				});
			});
		});

		describe('when it is called without ids, but exceeds maximum', () => {
			// Arrange
			const ids = new Array(defaultReleaseLimit + 10)
				.fill(0)
				.map((_, v) => Buffer.from(`10000000000000000${v}`));
			const transactionIds = codec.encode(transactionIdsSchema, { transactionIds: ids });

			it('should throw an error', async () => {
				// Assert
				await expect(
					transport.handleRPCGetTransactions(transactionIds, defaultPeerId),
				).rejects.toThrow('must NOT have more than 100 items');
			});

			it('should apply penalty', async () => {
				// Assert
				await expect(transport.handleRPCGetTransactions(transactionIds, defaultPeerId)).toReject();
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});
		});

		describe('when it is called without ids, and all exists in the pool', () => {
			let tx: any;
			beforeEach(() => {
				tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				transactionPoolStub.get.mockReturnValue(tx);
			});

			it('should call find get with the id', async () => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, { transactionIds: [tx.id] });

				// Act
				await transport.handleRPCGetTransactions(transactionIds, defaultPeerId);

				// Assert
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
			});

			it('should return transaction in the pool', async () => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, { transactionIds: [tx.id] });

				// Act
				const result = await transport.handleRPCGetTransactions(transactionIds, defaultPeerId);
				const expectedResult = codec.decode(transactionsSchema, result);

				// Assert
				expect(expectedResult).toStrictEqual({ transactions: [tx.getBytes()] });
			});
		});

		describe('when it is called without ids, and some exists in the pool and some in database', () => {
			let tx: any;
			let txDatabase: any;
			beforeEach(() => {
				tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				const txDatabaseInstance = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('bbc303f04202d23e1fea25859b140257e53bef5a', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				txDatabase = txDatabaseInstance;
				when(transactionPoolStub.get).calledWith(tx.id).mockReturnValue(tx);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([txDatabase]);
			});

			it('should call find get with the id', async () => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, {
					transactionIds: [tx.id, txDatabase.id],
				});

				// Act
				await transport.handleRPCGetTransactions(transactionIds, defaultPeerId);

				// Assert
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(txDatabase.id);
			});

			it('should return transaction in the pool', async () => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, {
					transactionIds: [tx.id, txDatabase.id],
				});

				// Act
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([txDatabase]);
				const result = await transport.handleRPCGetTransactions(transactionIds, defaultPeerId);
				const expectedResult = codec.decode<{ transactions: Buffer[] }>(transactionsSchema, result);

				// Assert
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(expectedResult.transactions).toHaveLength(2);
				expect(expectedResult.transactions).toStrictEqual([tx.getBytes(), txDatabase.getBytes()]);
			});
		});
	});

	describe('handleEventPostTransactionsAnnouncement', () => {
		const defaultPeerId = 'peer-id';

		let txInstance: Transaction;
		let tx2Instance: Transaction;
		let validTransactionsRequest: Buffer;

		beforeEach(() => {
			txInstance = createTransferTransaction({
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				amount: BigInt('100'),
				recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
				networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
				passphrase: genesis.passphrase,
			});
			tx2Instance = createTransferTransaction({
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				amount: BigInt('100'),
				recipientAddress: Buffer.from('bbc303f04202d23e1fea25859b140257e53bef5a', 'hex'),
				networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
				passphrase: genesis.passphrase,
			});
			const decodedData = codec.encode(transactionIdsSchema, {
				transactionIds: [txInstance.id, tx2Instance.id],
			});

			validTransactionsRequest = decodedData;
		});

		describe('when it is called more than 3 times within 10 sec', () => {
			it('should apply penalty', async () => {
				// Act
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				jest.advanceTimersByTime(defaultRateLimit);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});

		describe('when invalid schema is received', () => {
			it('should apply penalty', async () => {
				// Assert
				await expect(
					transport.handleEventPostTransactionsAnnouncement({}, defaultPeerId),
				).toReject();
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});
		});

		describe('when none of the transactions ids are known', () => {
			beforeEach(() => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, {
					transactionIds: [txInstance.id, tx2Instance.id],
				});

				transactionPoolStub.contains.mockReturnValue(false);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
				chainStub.dataAccess.decodeTransaction
					.mockReturnValueOnce(txInstance)
					.mockReturnValueOnce(tx2Instance);
				when(networkStub.requestFromPeer)
					.calledWith(expect.anything())
					.mockResolvedValue({
						data: transactionIds,
						peerId: defaultPeerId,
					} as never);
			});

			it('should request all the transactions', async () => {
				// Assert
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(networkStub.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getTransactions',
					data: validTransactionsRequest,
					peerId: defaultPeerId,
				});
			});

			it('should handle the received transactions', async () => {
				// Assert
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(chainStub.dataAccess.decodeTransaction).toHaveBeenCalledTimes(1);
				expect(processorStub.validateTransaction).toHaveBeenCalledTimes(1);
				expect(transactionPoolStub.contains).toHaveBeenCalledTimes(3);
				expect(transactionPoolStub.add).toHaveBeenCalledTimes(1);
			});

			it('should apply penalty when validateTransactions fails', async () => {
				// Act
				transactionPoolStub.contains.mockReturnValue(false);
				const error = new Error('validate error');
				processorStub.validateTransaction.mockImplementation(() => {
					throw error;
				});
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});

			it('should not apply penalty when add fails', async () => {
				// Act
				const error = new Error('validate error');
				transactionPoolStub.add.mockResolvedValue({ errors: [error] });

				// Assert
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(networkStub.applyPenaltyOnPeer).not.toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});
		});

		describe('when some of the transactions ids are known', () => {
			beforeEach(() => {
				const transactionIds = codec.encode(transactionIdsSchema, {
					transactionIds: [tx2Instance.id],
				});

				when(transactionPoolStub.contains).calledWith(txInstance.id).mockReturnValue(true);
				when(networkStub.requestFromPeer)
					.calledWith(expect.anything())
					.mockResolvedValue({
						data: transactionIds,
						peerId: defaultPeerId,
					} as never);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
				chainStub.dataAccess.decodeTransaction.mockReturnValue(tx2Instance);
			});

			it('should request all the transactions', async () => {
				// Arrange
				const transactionIds = codec.encode(transactionIdsSchema, {
					transactionIds: [tx2Instance.id],
				});

				// Act
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);

				// Assert
				expect(networkStub.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getTransactions',
					data: transactionIds,
					peerId: defaultPeerId,
				});
			});

			it('should handle the received transactions', async () => {
				// Act
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);

				// Assert
				expect(chainStub.dataAccess.decodeTransaction).toHaveBeenCalledTimes(1);
				expect(processorStub.validateTransaction).toHaveBeenCalledTimes(1);
				expect(transactionPoolStub.contains).toHaveBeenCalledTimes(3);
				expect(transactionPoolStub.add).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Handle rate limiting', () => {
		const defaultPeerId = 'peer-id';
		const DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY = 10;
		const DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY = 10;
		const DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;

		describe(`when getLastBlock is called more than ${DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY} times within 10 sec`, () => {
			it('should apply penalty', () => {
				// Arrange
				[...new Array(DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY + 1)].map(() =>
					transport.handleRPCGetLastBlock(defaultPeerId),
				);
				jest.advanceTimersByTime(defaultRateLimit);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});

		describe(`when getBlocksFromId is called more than ${DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY} times within 10 sec`, () => {
			it('should apply penalty', () => {
				// Arrange
				const blockIds = codec.encode(getBlocksFromIdRequestSchema, {
					blockId: Buffer.from('123'),
				});
				[...new Array(DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY + 1)].map(async () =>
					transport.handleRPCGetBlocksFromId(blockIds, defaultPeerId),
				);
				jest.advanceTimersByTime(defaultRateLimit);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});

		describe(`when getHighestCommonBlock is called more than ${DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY} times within 10 sec`, () => {
			const validData = {
				ids: [Buffer.from('15196562876801949910')],
			};
			const blockIds = codec.encode(getHighestCommonBlockRequestSchema, validData);

			it('should apply penalty when called ', async () => {
				// Arrange
				[...new Array(DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY + 1)].map(async () =>
					transport.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId),
				);
				jest.advanceTimersByTime(defaultRateLimit);

				// Assert
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});
	});
});
