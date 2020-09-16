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
import { BufferMap } from '@liskhq/lisk-transaction-pool';
import { Transaction } from '@liskhq/lisk-chain';
import { Transport } from '../../../../src/node/transport';
import { genesis } from '../../../fixtures';
import { createTransferTransaction } from '../../../utils/node/transaction';

describe('Transport', () => {
	const defaultBroadcastInterval = 5000;
	const defaultReleaseLimit = 100;
	const encodedBlock = Buffer.from('encodedBlock');
	const networkIdentifier = '93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';

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
			getProcessableTransactions: jest.fn().mockReturnValue(new BufferMap()),
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
				decodeTransaction: jest.fn(),
				encodeBlockHeader: jest.fn().mockReturnValue(encodedBlock),
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
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				transport['_broadcaster']._transactionIdQueue = [];

				await transport.handleBroadcastTransaction(tx);
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});

			it('should broadcast after 5 sec', async () => {
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				await transport.handleBroadcastTransaction(tx);
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: [tx.id.toString('hex')],
					},
				});
			});
		});

		describe('when a duplicate transaction is given', () => {
			it('should not enqueue to the broadcaster', async () => {
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				transport['_broadcaster']._transactionIdQueue = [];
				await transport.handleBroadcastTransaction(tx);
				await transport.handleBroadcastTransaction(tx);
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(1);
			});
		});

		describe('when the transaction is not in the pool', () => {
			it('should not broadcast after 5 sec', async () => {
				const tx = createTransferTransaction({
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					amount: BigInt('100'),
					recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
					networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
					passphrase: genesis.passphrase,
				});
				await transport.handleBroadcastTransaction(tx);
				transactionPoolStub.contains.mockReturnValue(false);
				jest.advanceTimersByTime(defaultBroadcastInterval);
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
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(25);
			});

			it('should broadcast all after 5 sec', async () => {
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
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval);
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id.toString('hex')),
					},
				});
			});
		});

		describe('when 50 transactions are given', () => {
			it('should enqueue to the broadcaster', async () => {
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
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				expect(transport._broadcaster._transactionIdQueue).toHaveLength(50);
			});

			it('should broadcast all after 10 sec', async () => {
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
				for (const tx of txs) {
					await transport.handleBroadcastTransaction(tx);
				}
				jest.advanceTimersByTime(defaultBroadcastInterval * 2);
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id.toString('hex')).splice(0, defaultReleaseLimit),
					},
				});
				expect(networkStub.broadcast).toHaveBeenCalledWith({
					event: 'postTransactionsAnnouncement',
					data: {
						transactionIds: txs.map(tx => tx.id.toString('hex')).splice(0, defaultReleaseLimit),
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
					noKey: ['random', 'string'],
				};
				await expect(
					transport.handleRPCGetGetHighestCommonBlock(invalidData, defaultPeerId),
				).rejects.toMatchObject(
					expect.objectContaining({
						message: expect.stringContaining('should have required property'),
					}),
				);
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});
		});

		describe('when commonBlock has not been found', () => {
			beforeEach(() => {
				chainStub.dataAccess.getHighestCommonBlockHeader.mockResolvedValue(undefined);
			});

			it('should return null', async () => {
				const validData = {
					ids: [Buffer.from('15196562876801949910').toString('hex')],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(validData, defaultPeerId);
				expect(chainStub.dataAccess.getHighestCommonBlockHeader).toHaveBeenCalledWith(
					validData.ids.map(id => Buffer.from(id, 'hex')),
				);
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
				const validData = {
					ids: ['15196562876801949910'],
				};

				const result = await transport.handleRPCGetGetHighestCommonBlock(validData, defaultPeerId);
				expect(chainStub.dataAccess.getHighestCommonBlockHeader).toHaveBeenCalledWith(
					validData.ids.map(id => Buffer.from(id, 'hex')),
				);
				expect(result).toBe(encodedBlock.toString('hex'));
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

				jest.advanceTimersByTime(defaultRateLimit);
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
				const processableTransactions = new BufferMap();
				processableTransactions.set(tx.id, tx);
				transactionPoolStub.getProcessableTransactions.mockReturnValue(processableTransactions);
			});

			it('should resolve to the transactions which are in the transaction pool', async () => {
				const result = await transport.handleRPCGetTransactions(undefined, defaultPeerId);
				expect(result).toEqual({
					transactions: [tx.getBytes().toString('hex')],
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
				const processableTransactions = new BufferMap();
				processableTransactions.set(tx.id, [tx]);
				transactionPoolStub.getProcessableTransactions.mockReturnValue(processableTransactions);
			});

			it('should return transaction from pool', async () => {
				const result = await transport.handleRPCGetTransactions({}, defaultPeerId);
				expect(result.transactions).toEqual([tx.getBytes().toString('hex')]);
			});
		});

		describe('when it is called without ids, but exceeds maximum', () => {
			const ids = new Array(defaultReleaseLimit + 10)
				.fill(0)
				.map((_, v) => Buffer.from(`10000000000000000${v}`).toString('hex'));

			it('should throw an error', async () => {
				await expect(
					transport.handleRPCGetTransactions({ transactionIds: ids }, defaultPeerId),
				).rejects.toThrow('Requested number of transsactions 110 exceeds maximum allowed');
			});

			it('should apply penalty', async () => {
				await expect(
					transport.handleRPCGetTransactions({ transactionIds: ids }, defaultPeerId),
				).toReject();
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
				await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id.toString('hex')] },
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
			});

			it('should return transaction in the pool', async () => {
				const result = await transport.handleRPCGetTransactions(
					{ transactionIds: [tx.id.toString('hex')] },
					defaultPeerId,
				);
				expect(result.transactions).toStrictEqual([tx.getBytes().toString('hex')]);
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
				await transport.handleRPCGetTransactions(
					{
						transactionIds: [tx.id.toString('hex'), txDatabase.id.toString('hex')],
					},
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(txDatabase.id);
			});

			it('should return transaction in the pool', async () => {
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([txDatabase]);
				const result = await transport.handleRPCGetTransactions(
					{
						transactionIds: [tx.id.toString('hex'), txDatabase.id.toString('hex')],
					},
					defaultPeerId,
				);
				expect(transactionPoolStub.get).toHaveBeenCalledWith(tx.id);
				expect(result.transactions).toHaveLength(2);
				expect(result.transactions).toStrictEqual([
					tx.getBytes().toString('hex'),
					txDatabase.getBytes().toString('hex'),
				]);
			});
		});
	});

	describe('handleEventPostTransactionsAnnouncement', () => {
		const defaultPeerId = 'peer-id';

		let tx: string;
		let tx2: string;
		let txInstance: Transaction;
		let tx2Instance: Transaction;
		let validTransactionsRequest: { transactionIds: string[] };

		beforeEach(() => {
			txInstance = createTransferTransaction({
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				amount: BigInt('100'),
				recipientAddress: Buffer.from('e3e6563a45aa82c58a83f2f353e0f6d9de07cf82', 'hex'),
				networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
				passphrase: genesis.passphrase,
			});
			tx = txInstance.getBytes().toString('hex');
			tx2Instance = createTransferTransaction({
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				amount: BigInt('100'),
				recipientAddress: Buffer.from('bbc303f04202d23e1fea25859b140257e53bef5a', 'hex'),
				networkIdentifier: Buffer.from(networkIdentifier, 'hex'),
				passphrase: genesis.passphrase,
			});
			tx2 = tx2Instance.getBytes().toString('hex');
			validTransactionsRequest = {
				transactionIds: [txInstance.id.toString('hex'), tx2Instance.id.toString('hex')],
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
				jest.advanceTimersByTime(defaultRateLimit);
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 10,
				});
			});
		});

		describe('when invalid schema is received', () => {
			it('should apply penalty', async () => {
				await expect(
					transport.handleEventPostTransactionsAnnouncement({}, defaultPeerId),
				).toReject();
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});

			it('should throw an error', async () => {
				await expect(
					transport.handleEventPostTransactionsAnnouncement({}, defaultPeerId),
				).rejects.toThrow("should have required property 'transactionIds'");
			});
		});

		describe('when none of the transactions ids are known', () => {
			beforeEach(() => {
				transactionPoolStub.contains.mockReturnValue(false);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
				chainStub.dataAccess.decodeTransaction
					.mockReturnValueOnce(txInstance)
					.mockReturnValueOnce(tx2Instance);
				when(networkStub.requestFromPeer)
					.calledWith(expect.anything())
					.mockResolvedValue({
						data: { transactions: [tx, tx2] },
						peerId: defaultPeerId,
					} as never);
			});

			it('should request all the transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(networkStub.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getTransactions',
					data: { transactionIds: validTransactionsRequest.transactionIds },
					peerId: defaultPeerId,
				});
			});

			it('should handle the received transactions', async () => {
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
				transactionPoolStub.contains.mockReturnValue(false);
				const error = new Error('validate error');
				processorStub.validateTransaction.mockImplementation(() => {
					throw error;
				});
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(networkStub.applyPenaltyOnPeer).toHaveBeenCalledWith({
					peerId: defaultPeerId,
					penalty: 100,
				});
			});

			it('should not apply penalty when add fails', async () => {
				const error = new Error('validate error');
				transactionPoolStub.add.mockResolvedValue({ errors: [error] });
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
				when(transactionPoolStub.contains).calledWith(txInstance.id).mockReturnValue(true);
				when(networkStub.requestFromPeer)
					.calledWith(expect.anything())
					.mockResolvedValue({
						data: { transactions: [tx2] },
						peerId: defaultPeerId,
					} as never);
				chainStub.dataAccess.getTransactionsByIDs.mockResolvedValue([]);
				chainStub.dataAccess.decodeTransaction.mockReturnValue(tx2Instance);
			});

			it('should request all the transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(networkStub.requestFromPeer).toHaveBeenCalledWith({
					procedure: 'getTransactions',
					data: { transactionIds: [tx2Instance.id.toString('hex')] },
					peerId: defaultPeerId,
				});
			});

			it('should handle the received transactions', async () => {
				await transport.handleEventPostTransactionsAnnouncement(
					validTransactionsRequest,
					defaultPeerId,
				);
				expect(chainStub.dataAccess.decodeTransaction).toHaveBeenCalledTimes(1);
				expect(processorStub.validateTransaction).toHaveBeenCalledTimes(1);
				expect(transactionPoolStub.contains).toHaveBeenCalledTimes(3);
				expect(transactionPoolStub.add).toHaveBeenCalledTimes(1);
			});
		});
	});
});
