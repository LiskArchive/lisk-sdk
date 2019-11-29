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
} = require('../../../../../../../src/modules/chain/transport');
const jobsQueue = require('../../../../../../../src/modules/chain/utils/jobs_queue');

describe('Transport', () => {
	const defaultBroadcastInterval = 5000;
	const defaultReleaseLimit = 25;

	let transport;
	let transactionPoolStub;
	let synchronizerStub;
	let blocksStub;
	let loggerStub;
	let processorStub;
	let channelStub;
	let storageStub;

	beforeEach(async () => {
		// Needs to reset the job registered
		jobsQueue.jobs = {};
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
		storageStub = {
			entities: {
				Transaction: {
					get: jest.fn(),
				},
			},
		};
		transactionPoolStub = {
			transactionInPool: jest.fn().mockReturnValue(true),
			getTransactionAndProcessSignature: jest.fn(),
			findInTransactionPool: jest.fn(),
			getMergedTransactionList: jest.fn().mockReturnValue([]),
			processUnconfirmedTransaction: jest.fn(),
		};
		synchronizerStub = {};
		blocksStub = {
			getHighestCommonBlock: jest.fn(),
			deserializeTransaction: jest.fn().mockImplementation(val => val),
			validateTransactions: jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 1, errors: [] }],
			}),
		};
		processorStub = {};
		transport = new Transport({
			channel: channelStub,
			logger: loggerStub,
			storage: storageStub,
			// Unique requirements
			applicationState: {},
			exceptions: {},
			// Modules
			synchronizer: synchronizerStub,
			transactionPoolModule: transactionPoolStub,
			blocksModule: blocksStub,
			processorModule: processorStub,
			// Constants
			broadcasts: {
				broadcastInterval: defaultBroadcastInterval,
				releaseLimit: defaultReleaseLimit,
				active: true,
			},
		});
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
				await transport.handleBroadcastTransaction(tx);
				expect(transport.broadcaster.transactionIdQueue).toHaveLength(1);
			});

			it('should broadcast after 5 sec', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				await transport.handleBroadcastTransaction(tx);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:broadcast', {
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: [tx.id],
					},
				});
			});
		});

		describe('when a duplicate transaction is given', () => {
			it('should not enqueue to the broadcaster', async () => {
				const tx = new TransferTransaction({
					asset: { amount: '100', recipientId: '123L' },
				});
				await transport.handleBroadcastTransaction(tx);
				await transport.handleBroadcastTransaction(tx);
				expect(transport.broadcaster.transactionIdQueue).toHaveLength(1);
			});
		});

		describe('when the transaction is not in the pool', () => {
			it('should not broadcast after 5 sec', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				await transport.handleBroadcastTransaction(tx);
				transactionPoolStub.transactionInPool.mockReturnValue(false);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.invoke).not.toHaveBeenCalledWith(
					'network:broadcast',
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
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport.broadcaster.transactionIdQueue).toHaveLength(25);
			});

			it('should broadcast all after 5 sec', async () => {
				const txs = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:broadcast', {
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id),
					},
				});
			});
		});

		describe('when 50 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport.broadcaster.transactionIdQueue).toHaveLength(50);
			});

			it('should broadcast all after 10 sec', async () => {
				const txs = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return tx;
				});
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval * 2);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:broadcast', {
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id).splice(0, defaultReleaseLimit),
					},
				});
				expect(channelStub.invoke).toHaveBeenCalledWith('network:broadcast', {
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id).splice(0, defaultReleaseLimit),
					},
				});
			});
		});
	});

	describe('handleBroadcastSignature', () => {
		describe('when a signature object is given', () => {
			it('should enqueue to the broadcaster', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				const signatureObject = {
					transactionId: tx.id,
					signature: tx.signature,
					publicKey: tx.senderPublicKey,
				};
				await transport.handleBroadcastSignature(signatureObject);
				expect(transport.broadcaster.signatureObjectQueue).toHaveLength(1);
			});

			it('should broadcast after 5 sec', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				const signatureObject = {
					transactionId: tx.id,
					signature: tx.signature,
					publicKey: tx.senderPublicKey,
				};
				await transport.handleBroadcastSignature(signatureObject);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:send', {
					event: 'postSignatures',
					data: {
						signatures: [signatureObject],
					},
				});
			});
		});

		describe('when a duplicate signature object is given', () => {
			it('should not enqueue to the broadcaster', async () => {
				const tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				const signatureObject = {
					transactionId: tx.id,
					signature: tx.signature,
					publicKey: tx.senderPublicKey,
				};
				await transport.handleBroadcastSignature(signatureObject);
				await transport.handleBroadcastSignature(signatureObject);
				expect(transport.broadcaster.signatureObjectQueue).toHaveLength(1);
			});
		});

		describe('when 25 signature objects are given', () => {
			it('should enqueue to the broadcaster', async () => {
				const signatureObjects = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return {
						transactionId: tx.id,
						signature: tx.signature,
						publicKey: tx.senderPublicKey,
					};
				});
				for (const signatureObject of signatureObjects) {
					await transport.handleBroadcastSignature(signatureObject);
				}
				expect(transport.broadcaster.signatureObjectQueue).toHaveLength(25);
			});

			it('should broadcast all after 5 sec', async () => {
				const signatureObjects = new Array(25).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return {
						transactionId: tx.id,
						signature: tx.signature,
						publicKey: tx.senderPublicKey,
					};
				});
				for (const signatureObject of signatureObjects) {
					await transport.handleBroadcastSignature(signatureObject);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:send', {
					event: 'postSignatures',
					data: {
						signatures: signatureObjects,
					},
				});
			});
		});

		describe('when 50 signature objects are given', () => {
			it('should enqueue to the broadcaster', async () => {
				const signatureObjects = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign('signature');
					return {
						transactionId: tx.id,
						signature: tx.signature,
						publicKey: tx.senderPublicKey,
					};
				});
				for (const signatureObject of signatureObjects) {
					await transport.handleBroadcastSignature(signatureObject);
				}
				expect(transport.broadcaster.signatureObjectQueue).toHaveLength(50);
			});

			it('should broadcast all after 10 sec', async () => {
				const signatureObjects = new Array(50).fill(0).map((_, v) => {
					const tx = new TransferTransaction({
						networkIdentifier: '1234567890',
						asset: { amount: (v + 1).toString(), recipientId: '123L' },
					});
					tx.sign(`signature${v}`);
					return {
						transactionId: tx.id,
						signature: tx.signature,
						publicKey: tx.senderPublicKey,
					};
				});
				for (const signatureObject of signatureObjects) {
					await transport.handleBroadcastSignature(signatureObject);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);
				await expect(channelStub.invoke).toHaveBeenCalledTimes(1);
				await expect(channelStub.invoke).toHaveBeenCalledWith('network:send', {
					event: 'postSignatures',
					data: {
						signatures: signatureObjects.splice(0, defaultReleaseLimit),
					},
				});
				jest.advanceTimersByTime(defaultBroadcastInterval);
				await expect(channelStub.invoke).toHaveBeenCalledTimes(2);
				expect(transport.broadcaster.signatureObjectQueue).toHaveLength(0);
				expect(channelStub.invoke).toHaveBeenCalledWith('network:send', {
					event: 'postSignatures',
					data: {
						signatures: signatureObjects.splice(0, defaultReleaseLimit),
					},
				});
			});
		});
	});

	describe('handleRPCGetGetHighestCommonBlock', () => {
		const defaultPeerId = 'peer-id';

		describe('when schema validation fails', () => {
			it('should throw an error with wrong ID format', async () => {
				const invalidData = {
					ids: ['randome', 'string'],
				};
				expect.assertions(2);
				try {
					await transport.handleRPCGetGetHighestCommonBlock(
						invalidData,
						defaultPeerId,
					);
				} catch (error) {
					expect(error.message).toContain('should match format');
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});

			it('should throw an error with wrong ID format', async () => {
				const invalidData = {
					noKey: ['randome', 'string'],
				};
				expect.assertions(2);
				try {
					await transport.handleRPCGetGetHighestCommonBlock(
						invalidData,
						defaultPeerId,
					);
				} catch (error) {
					expect(error.message).toContain('should have required property ');
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});
		});

		describe('when commonBlock has not been found', () => {
			beforeEach(async () => {
				blocksStub.getHighestCommonBlock.mockResolvedValue(null);
			});

			it('should return null', async () => {
				const validData = {
					ids: ['15196562876801949910'],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(
					validData,
					defaultPeerId,
				);
				expect(blocksStub.getHighestCommonBlock).toHaveBeenCalledWith(
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
				blocksStub.getHighestCommonBlock.mockResolvedValue(validBlock);
			});

			it('should return the result', async () => {
				const validData = {
					ids: ['15196562876801949910'],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(
					validData,
					defaultPeerId,
				);
				expect(blocksStub.getHighestCommonBlock).toHaveBeenCalledWith(
					validData.ids,
				);
				expect(result).toBe(validBlock);
			});
		});
	});

	describe('handleEventPostSignatures', () => {
		const defaultPeerId = 'peer-id';
		const validSignaturesData = {
			signatures: [
				{
					transactionId: '11297269518379744811',
					publicKey:
						'77123552d4b1942526f7c8f4880b8305d88fd3aa5ca62ba7ccb5e7bf6fd9c121',
					signature:
						'abba676f86afd2f822ffb6a31838af77b17a6ebdeb3adbc49bc25e75f35a64a4049138770685c7c1521e1e6e41a5dea777bebf56a177fe0ebb893ea52eb68700',
				},
			],
		};

		describe('when it is called more than 3 times within 10 sec', () => {
			const defaultRateLimit = 10000;

			it('should apply penalty', async () => {
				await transport.handleEventPostSignatures(
					validSignaturesData,
					defaultPeerId,
				);
				await transport.handleEventPostSignatures(
					validSignaturesData,
					defaultPeerId,
				);
				await transport.handleEventPostSignatures(
					validSignaturesData,
					defaultPeerId,
				);
				await transport.handleEventPostSignatures(
					validSignaturesData,
					defaultPeerId,
				);
				await jest.advanceTimersByTime(defaultRateLimit);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'network:applyPenalty',
					{
						peerId: defaultPeerId,
						penalty: 10,
					},
				);
			});
		});

		describe('when invalid schema is received', () => {
			it('should apply penalty', async () => {
				expect.assertions(1);
				try {
					await transport.handleEventPostSignatures({}, defaultPeerId);
				} catch (errors) {
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});

			it('should throw an error', async () => {
				expect.assertions(2);
				try {
					await transport.handleEventPostSignatures({}, defaultPeerId);
				} catch (errors) {
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toContain('should have required property');
				}
			});
		});

		describe('when invalid signature format is received', () => {
			const invalidSignature = {
				signatures: [
					{
						...validSignaturesData.signatures[0],
						signature: 'invalid-signature',
					},
				],
			};

			it('should apply penalty', async () => {
				expect.assertions(1);
				try {
					await transport.handleEventPostSignatures(
						invalidSignature,
						defaultPeerId,
					);
				} catch (errors) {
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});

			it('should throw an error', async () => {
				expect.assertions(2);
				try {
					await transport.handleEventPostSignatures(
						invalidSignature,
						defaultPeerId,
					);
				} catch (errors) {
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toContain('should match format');
				}
			});
		});

		describe('when valid data is received', () => {
			it('should call getTransactionAndProcessSignature', async () => {
				await transport.handleEventPostSignatures(
					validSignaturesData,
					defaultPeerId,
				);
				expect(
					transactionPoolStub.getTransactionAndProcessSignature,
				).toHaveBeenCalledTimes(1);
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
					'network:applyPenalty',
					{
						peerId: defaultPeerId,
						penalty: 10,
					},
				);
			});
		});

		describe('when it is called with undefined', () => {
			let tx;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				transactionPoolStub.getMergedTransactionList.mockReturnValue([tx]);
			});

			it('should return transaction from pool', async () => {
				const result = await transport.handleRPCGetTransactions(
					undefined,
					defaultPeerId,
				);
				expect(result.transactions).toStrictEqual([tx]);
			});
		});

		describe('when it is called without ids', () => {
			let tx;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				transactionPoolStub.getMergedTransactionList.mockReturnValue([tx]);
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
			const ids = new Array(30).fill(0).map((_, v) => `100000000000000000${v}`);

			it('should throw an error', async () => {
				expect.assertions(1);
				try {
					await transport.handleRPCGetTransactions(
						{ transactionIds: ids },
						defaultPeerId,
					);
				} catch (error) {
					expect(error.message).toContain('Received invalid request');
				}
			});

			it('should apply penalty', async () => {
				expect.assertions(1);
				try {
					await transport.handleRPCGetTransactions(
						{ transactionIds: ids },
						defaultPeerId,
					);
				} catch (error) {
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});
		});

		describe('when it is called without ids, and all exists in the pool', () => {
			let tx;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				transactionPoolStub.findInTransactionPool.mockReturnValue(tx);
			});

			it('should call find transactionInPool with the id', async () => {
				await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id] },
					defaultPeerId,
				);
				expect(transactionPoolStub.findInTransactionPool).toHaveBeenCalledWith(
					tx.id,
				);
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
			let tx;
			let txDatabase;
			beforeEach(async () => {
				tx = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '123L' },
				});
				tx.sign('signature');
				const txDatabaseInstance = new TransferTransaction({
					networkIdentifier: '1234567890',
					asset: { amount: '100', recipientId: '125L' },
				});
				txDatabaseInstance.sign('signature');
				txDatabase = txDatabaseInstance.toJSON();
				when(transactionPoolStub.findInTransactionPool)
					.calledWith(tx.id)
					.mockReturnValue(tx);
				storageStub.entities.Transaction.get.mockResolvedValue([txDatabase]);
			});

			it('should call find transactionInPool with the id', async () => {
				await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id, txDatabase.id] },
					defaultPeerId,
				);
				expect(transactionPoolStub.findInTransactionPool).toHaveBeenCalledWith(
					tx.id,
				);
				expect(transactionPoolStub.findInTransactionPool).toHaveBeenCalledWith(
					txDatabase.id,
				);
			});

			it('should return transaction in the pool', async () => {
				const result = await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id, txDatabase.id] },
					defaultPeerId,
				);
				expect(storageStub.entities.Transaction.get).toHaveBeenCalledWith(
					{ id_in: [txDatabase.id] },
					{ limit: defaultReleaseLimit },
				);
				expect(result.transactions).toHaveLength(2);
				expect(result.transactions).toStrictEqual([tx.toJSON(), txDatabase]);
			});
		});
	});

	describe('handleEventPostTransactionsAnnouncement', () => {
		const defaultPeerId = 'peer-id';

		let tx;
		let tx2;
		let validTransactionsRequest;

		beforeEach(async () => {
			const txInstance = new TransferTransaction({
				networkIdentifier: '1234567890',
				asset: { amount: '100', recipientId: '123L' },
			});
			txInstance.sign('signature');
			tx = txInstance.toJSON();
			const tx2Instance = new TransferTransaction({
				networkIdentifier: '1234567890',
				asset: { amount: '100', recipientId: '125L' },
			});
			tx2Instance.sign('signature');
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
					'network:applyPenalty',
					{
						peerId: defaultPeerId,
						penalty: 10,
					},
				);
			});
		});

		describe('when invalid schema is received', () => {
			it('should apply penalty', async () => {
				expect.assertions(1);
				try {
					await transport.handleEventPostTransactionsAnnouncement(
						{},
						defaultPeerId,
					);
				} catch (errors) {
					expect(channelStub.invoke).toHaveBeenCalledWith(
						'network:applyPenalty',
						{
							peerId: defaultPeerId,
							penalty: 100,
						},
					);
				}
			});

			it('should throw an error', async () => {
				expect.assertions(2);
				try {
					await transport.handleEventPostTransactionsAnnouncement(
						{},
						defaultPeerId,
					);
				} catch (errors) {
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toContain('should have required property');
				}
			});
		});

		describe('when none of the transactions ids are known', () => {
			beforeEach(async () => {
				transactionPoolStub.transactionInPool.mockReturnValue(false);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				when(channelStub.invoke)
					.calledWith('network:requestFromPeer', expect.anything())
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
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'network:requestFromPeer',
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
				expect(blocksStub.deserializeTransaction).toHaveBeenCalledTimes(2);
				expect(blocksStub.validateTransactions).toHaveBeenCalledTimes(2);
				expect(
					transactionPoolStub.processUnconfirmedTransaction,
				).toHaveBeenCalledTimes(2);
			});

			it('should apply penalty when validateTransactions fails', async () => {
				const error = new Error('validate error');
				blocksStub.validateTransactions.mockResolvedValue({
					transactionsResponses: [{ status: 0, errors: [error] }],
				});
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'network:applyPenalty',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});

			it('should not apply penalty when processUnconfirmedTransaction fails', async () => {
				const error = new Error('validate error');
				transactionPoolStub.processUnconfirmedTransaction.mockRejectedValue(
					error,
				);
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invoke).not.toHaveBeenCalledWith(
					'network:applyPenalty',
					{
						peerId: defaultPeerId,
						penalty: 100,
					},
				);
			});
		});

		describe('when some of the transactions ids are known', () => {
			beforeEach(async () => {
				when(transactionPoolStub.transactionInPool)
					.calledWith(tx.id)
					.mockReturnValue(true);
				storageStub.entities.Transaction.get.mockResolvedValue([]);
				when(channelStub.invoke)
					.calledWith('network:requestFromPeer', expect.anything())
					.mockResolvedValue({
						data: { transactions: [tx2] },
						peerId: defaultPeerId,
					});
			});

			it('should request all the transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(channelStub.invoke).toHaveBeenCalledWith(
					'network:requestFromPeer',
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
				expect(blocksStub.deserializeTransaction).toHaveBeenCalledTimes(1);
				expect(blocksStub.validateTransactions).toHaveBeenCalledTimes(1);
				expect(
					transactionPoolStub.processUnconfirmedTransaction,
				).toHaveBeenCalledTimes(1);
			});
		});
	});
});
