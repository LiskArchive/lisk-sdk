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

'use strict';

const { when } = require('jest-when');
const { TransferTransaction } = require('@liskhq/lisk-transactions');
const {
	Transport,
} = require('../../../../../../../src/application/node/transport');

describe('Transport', () => {
	const defaultBroadcastInterval = 5000;
	const defaultReleaseLimit = 100;

	let transport: any;
	let transactionPoolStub: any;
	let synchronizerStub: any;
	let chainStub: any;
	let loggerStub: any;
	let processorStub: any;
	let channelStub: any;

	beforeEach(async () => {
		// Needs to reset the job registered
		channelStub = {
			invoke: jest.fn(),
			invokeFromNetwork: jest.fn(),
			publish: jest.fn(),
			publishToNetwork: jest.fn(),
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
			getProcessableTransactions: jest.fn().mockReturnValue({}),
			add: jest.fn(),
		};
		synchronizerStub = {};
		chainStub = {
			getHighestCommonBlock: jest.fn(),
			deserializeTransaction: jest
				.fn()
				.mockImplementation(val => ({ ...val, toJSON: () => val })),
			validateTransactions: jest
				.fn()
				.mockResolvedValue([{ status: 1, errors: [] }]),
			dataAccess: {
				getTransactionsByIDs: jest.fn(),
			},
			serializeBlockHeader: jest.fn(),
		};
		processorStub = {};
		transport = new Transport({
			channel: channelStub,
			logger: loggerStub,
			// Unique requirements
			applicationState: {},
			// Modules
			synchronizer: synchronizerStub,
			transactionPoolModule: transactionPoolStub,
			chainModule: chainStub,
			processorModule: processorStub,
			// Constants
			broadcasts: {
				broadcastInterval: defaultBroadcastInterval,
				releaseLimit: defaultReleaseLimit,
				active: true,
			},
		});
		jest.spyOn(transport.broadcaster, 'enqueueTransactionId');
		jest.useFakeTimers();
	});

	afterEach(async () => {
		jest.clearAllTimers();
	});

	describe('handleBroadcastTransaction', () => {
		describe('when a transaction is given', () => {
			it('should enqueue to the broadcaster', async () => {
				const tx = new TransferTransaction({
					asset: { amount: '100', recipientId: '123L' },
				});
				transport['_broadcaster']._transactionIdQueue = [];

				await transport.handleBroadcastTransaction(tx);
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});

			it('should broadcast after 5 sec', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('1234567890', 'signature');
				await transport.handleBroadcastTransaction(tx);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.publishToNetwork).toHaveBeenCalledWith(
					'broadcastToNetwork',
					{
						event: 'postTransactionsAnnouncement',
						data: {
							transactionIds: [tx.id],
						},
					},
				);
			});
		});

		describe('when a duplicate transaction is given', () => {
			it('should not enqueue to the broadcaster', async () => {
				const tx = new TransferTransaction({
					asset: { amount: '100', recipientId: '123L' },
				});
				transport['_broadcaster']._transactionIdQueue = [];
				await transport.handleBroadcastTransaction(tx);
				await transport.handleBroadcastTransaction(tx);
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});
		});

		describe('when the transaction is not in the pool', () => {
			it('should not broadcast after 5 sec', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('1234567890', 'signature');
				await transport.handleBroadcastTransaction(tx);
				transactionPoolStub.contains.mockReturnValue(false);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.publishToNetwork).not.toHaveBeenCalledWith(
					'broadcastToNetwork',
					{
						event: 'postTransactionsAnnouncement',
						data: {
							transactionIds: [tx.id],
						},
					},
				);
			});
		});

		describe('when 25 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('1234567890', 'signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(25);
			});

			it('should broadcast all after 5 sec', async () => {
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('1234567890', 'signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.publishToNetwork).toHaveBeenCalledWith(
					'broadcastToNetwork',
					{
						event: 'postTransactionsAnnouncement',
						data: {
							transactionIds: txs.map(tx => tx.id),
						},
					},
				);
			});
		});

		describe('when 50 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
				transport['_broadcaster']._transactionIdQueue = [];
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('1234567890', 'signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(50);
			});

			it('should broadcast all after 10 sec', async () => {
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('1234567890', 'signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval * 2);
				expect(channelStub.publishToNetwork).toHaveBeenCalledWith(
					'broadcastToNetwork',
					{
						event: 'postTransactionsAnnouncement',
						data: {
							transactionIds: txs
								.map(tx => tx.id)
								.splice(0, defaultReleaseLimit),
						},
					},
				);
				expect(channelStub.publishToNetwork).toHaveBeenCalledWith(
					'broadcastToNetwork',
					{
						event: 'postTransactionsAnnouncement',
						data: {
							transactionIds: txs
								.map(tx => tx.id)
								.splice(0, defaultReleaseLimit),
						},
					},
				);
			});
		});
	});

	describe('handleRPCGetGetHighestCommonBlock', () => {
		const defaultPeerId = 'peer-id';

		describe('when schema validation fails', () => {
			it('should throw an error with wrong ID format', async () => {
				const invalidData = {
					noKey: ['random', 'string'],
				};
				await expect(
					transport.handleRPCGetGetHighestCommonBlock(
						invalidData,
						defaultPeerId,
					),
				).rejects.toMatchObject(
					expect.objectContaining({
						message: expect.stringContaining('should have required property'),
					}),
				);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});
		});

		describe('when commonBlock has not been found', () => {
			beforeEach(async () => {
				chainStub.getHighestCommonBlock.mockResolvedValue(null);
				chainStub.serializeBlockHeader.mockResolvedValue(null);
			});

			it('should return null', async () => {
				const validData = {
					ids: ['15196562876801949910'],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(
					validData,
					defaultPeerId,
				);
				expect(chainStub.getHighestCommonBlock).toHaveBeenCalledWith(
					validData.ids,
				);
				expect(result).toBeNull();
			});
		});

		describe('when commonBlock has been found', () => {
			const validBlock = {
				id: '15196562876801949910',
			};

			beforeEach(async () => {
				chainStub.getHighestCommonBlock.mockResolvedValue(validBlock);
				chainStub.serializeBlockHeader.mockResolvedValue(validBlock);
			});

			it('should return the result', async () => {
				const validData = {
					ids: ['15196562876801949910'],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(
					validData,
					defaultPeerId,
				);
				expect(chainStub.getHighestCommonBlock).toHaveBeenCalledWith(
					validData.ids,
				);
				expect(result).toBe(validBlock);
			});
		});
	});

	describe('handleRPCGetTransactions', () => {
		const defaultPeerId = 'peer-id';
		describe('when it is called more than 3 times within 10 sec', () => {
			const defaultRateLimit = 10000;

			it('should apply penalty', async () => {
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);
				await transport.handleRPCGetTransactions({}, defaultPeerId);

				await jest.advanceTimersByTime(defaultRateLimit);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 10,
					},
				);
			});
		});

		describe('when it is called with undefined', () => {
			let tx: any;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				const processableTransactions = {};
				(processableTransactions as any)[tx.id] = [tx];
				transactionPoolStub.getProcessableTransactions.mockReturnValue(
					processableTransactions,
				);
			});

			it('should throw an error when no transaction ids are provided', async () => {
				/* eslint-disable-next-line  @typescript-eslint/no-floating-promises */
				expect(
					transport.handleRPCGetTransactions(undefined, defaultPeerId),
				).toReject();
			});
		});

		describe('when it is called without ids', () => {
			let tx: any;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				const processableTransactions = {};
				(processableTransactions as any)[tx.id] = [tx];
				transactionPoolStub.getProcessableTransactions.mockReturnValue(
					processableTransactions,
				);
			});

			it('should return transaction from pool', async () => {
				const result = await transport.handleRPCGetTransactions(
					{},
					defaultPeerId,
				);
				expect(result.transactions).toStrictEqual([tx]);
			});
		});

		describe('when it is called without ids, but exceeds maximum', () => {
			const ids = new Array(defaultReleaseLimit + 10)
				.fill(0)
				.map((_, v) => `10000000000000000${v}`);

			it('should throw an error', async () => {
				await expect(
					transport.handleRPCGetTransactions(
						{ transactionIds: ids },
						defaultPeerId,
					),
				).rejects.toThrow('Received invalid request');
			});

			it('should apply penalty', async () => {
				await expect(
					transport.handleRPCGetTransactions(
						{ transactionIds: ids },
						defaultPeerId,
					),
				).toReject();
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});
		});

		describe('when it is called without ids, and all exists in the pool', () => {
			let tx: any;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('1234567890', 'signature');
				transactionPoolStub.get.mockReturnValue(tx);
			});

			it('should call find get with the id', async () => {
				await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id] },
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
			});

			it('should return transaction in the pool', async () => {
				const result = await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id] },
					defaultPeerId,
				);
				expect(result.transactions).toStrictEqual([tx.toJSON()]);
			});
		});

		describe('when it is called without ids, and some exists in the pool and some in database', () => {
			let tx: any;
			let txDatabase: any;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('1234567890', 'signature');
				const txDatabaseInstance = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '125L' },
				});
				txDatabaseInstance.sign('1234567890', 'signature');
				txDatabase = txDatabaseInstance;
				when(transactionPoolStub.get)
					.calledWith(tx.id)
					.mockReturnValue(tx);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([
					txDatabase,
				]);
			});

			it('should call find get with the id', async () => {
				await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id, txDatabase.id] },
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(txDatabase.id);
			});

			it('should return transaction in the pool', async () => {
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([
					txDatabase,
				]);
				const result = await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id, txDatabase.id] },
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(result.transactions).toHaveLength(2);
				expect(result.transactions).toStrictEqual([
					tx.toJSON(),
					txDatabase.toJSON(),
				]);
			});
		});
	});

	describe('handleEventPostTransactionsAnnouncement', () => {
		const defaultPeerId = 'peer-id';

		let tx: any;
		let tx2: any;
		let validTransactionsRequest: any;

		beforeEach(async () => {
			const txInstance = new TransferTransaction({
				networkIdentifier: '1234567890',
				asset: { amount: '100', recipientId: '123L' },
			});
			txInstance.sign('1234567890', 'signature');
			tx = txInstance.toJSON();
			const tx2Instance = new TransferTransaction({
				networkIdentifier: '1234567890',
				asset: { amount: '100', recipientId: '125L' },
			});
			tx2Instance.sign('1234567890', 'signature');
			tx2 = tx2Instance.toJSON();
			validTransactionsRequest = {
				transactionIds: [tx.id, tx2.id],
			};
		});

		describe('when it is called more than 3 times within 10 sec', () => {
			const defaultRateLimit = 10000;

			it('should apply penalty', async () => {
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
				await jest.advanceTimersByTime(defaultRateLimit);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 10,
					},
				);
			});
		});

		describe('when invalid schema is received', () => {
			it('should apply penalty', async () => {
				await expect(
					transport.handleEventPostTransactionsAnnouncement({}, defaultPeerId),
				).toReject();
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});

			it('should throw an error', async () => {
				await expect(
					transport.handleEventPostTransactionsAnnouncement({}, defaultPeerId),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining('should have required property'),
					}),
				]);
			});
		});

		describe('when none of the transactions ids are known', () => {
			beforeEach(async () => {
				transactionPoolStub.contains.mockReturnValue(false);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
				when(channelStub.invokeFromNetwork)
					.calledWith('requestFromPeer', expect.anything())
					.mockResolvedValue({
						data: { transactions: [tx, tx2] },
						peerId: defaultPeerId,
					});
			});

			it('should request all the transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invokeFromNetwork).toHaveBeenCalledWith(
					'requestFromPeer',
					{
						procedure: 'getTransactions',
						data: { transactionIds: validTransactionsRequest.transactionIds },
						peerId: defaultPeerId,
					},
				);
			});

			it('should handle the received transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(chainStub.deserializeTransaction).toHaveBeenCalledTimes(1);
				expect(chainStub.validateTransactions).toHaveBeenCalledTimes(1);
				expect(transactionPoolStub.contains).toHaveBeenCalledTimes(3);
				expect(transactionPoolStub.add).toHaveBeenCalledTimes(1);
			});

			it('should apply penalty when validateTransactions fails', async () => {
				transactionPoolStub.contains.mockReturnValue(false);
				const error = new Error('validate error');
				chainStub.validateTransactions.mockResolvedValue([
					{ status: 0, errors: [error] },
				]);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});

			it('should not apply penalty when add fails', async () => {
				const error = new Error('validate error');
				transactionPoolStub.add.mockRejectedValue(error);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invoke).not.toHaveBeenCalledWith(
					'app:applyPenaltyOnPeer',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});
		});
		describe('when some of the transactions ids are known', () => {
			beforeEach(async () => {
				when(transactionPoolStub.contains)
					.calledWith(tx.id)
					.mockReturnValue(true);
				when(channelStub.invokeFromNetwork)
					.calledWith('requestFromPeer', expect.anything())
					.mockResolvedValue({
						data: { transactions: [tx2] },
						peerId: defaultPeerId,
					});
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
			});

			it('should request all the transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invokeFromNetwork).toHaveBeenCalledWith(
					'requestFromPeer',
					{
						procedure: 'getTransactions',
						data: { transactionIds: [tx2.id] },
						peerId: defaultPeerId,
					},
				);
			});

			it('should handle the received transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(chainStub.deserializeTransaction).toHaveBeenCalledTimes(1);
				expect(chainStub.validateTransactions).toHaveBeenCalledTimes(1);
				expect(transactionPoolStub.contains).toHaveBeenCalledTimes(3);
				expect(transactionPoolStub.add).toHaveBeenCalledTimes(1);
			});
		});
	});
});
