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
		};
		storageStub = {};
		transactionPoolStub = {
			transactionInPool: jest.fn().mockReturnValue(true),
		};
		synchronizerStub = {};
		blocksStub = {};
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
});
