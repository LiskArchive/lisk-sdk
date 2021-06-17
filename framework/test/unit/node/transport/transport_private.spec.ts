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
import { codec } from '@liskhq/lisk-codec';
import { Transaction, TAG_TRANSACTION } from '@liskhq/lisk-chain';
import {
	getAddressAndPublicKeyFromPassphrase,
	getRandomBytes,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';

import { Logger } from '../../../../src/logger';
import { Transport } from '../../../../src/node/transport';

import { genesis } from '../../../fixtures/accounts';
import {
	createValidDefaultBlock,
	genesisBlock as getGenesisBlock,
	encodeValidBlock,
	genesisBlock,
} from '../../../fixtures/blocks';
import { InvalidTransactionError } from '../../../../src/node/transport/errors';
import { InMemoryChannel } from '../../../../src/controller/channels';
import {
	postBlockEventSchema,
	getBlocksFromIdRequestSchema,
} from '../../../../src/node/transport/schemas';

describe('transport', () => {
	const encodedBlock = Buffer.from('encoded block');
	const networkIdentifier = '93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';

	let loggerStub: Logger;
	let synchronizerStub: any;
	let networkStub: any;
	let channelStub: Partial<InMemoryChannel>;
	let transportModule: any;
	let transaction: Transaction;
	let block: any;
	let blocksList;
	let transactionsList: Transaction[];
	let error: Error;
	let result: any;
	let query: any = { ids: ['1', '2', '3'] };

	beforeEach(() => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = new Transaction({
			moduleID: 2,
			assetID: 0,
			nonce: BigInt('0'),
			fee: BigInt('100000000'),
			senderPublicKey: getAddressAndPublicKeyFromPassphrase(genesis.passphrase).publicKey,
			asset: getRandomBytes(100),
			signatures: [],
		});
		(transaction.signatures as Buffer[]).push(
			signDataWithPassphrase(
				TAG_TRANSACTION,
				Buffer.from(networkIdentifier, 'hex'),
				transaction.getBytes(),
				genesis.passphrase,
			),
		);

		const transactionOne = new Transaction({
			moduleID: 2,
			assetID: 0,
			nonce: BigInt('0'),
			fee: BigInt('100000000'),
			senderPublicKey: getAddressAndPublicKeyFromPassphrase(genesis.passphrase).publicKey,
			asset: getRandomBytes(100),
			signatures: [],
		});
		(transactionOne.signatures as Buffer[]).push(
			signDataWithPassphrase(
				TAG_TRANSACTION,
				Buffer.from(networkIdentifier, 'hex'),
				transaction.getBytes(),
				genesis.passphrase,
			),
		);
		const transactionTwo = new Transaction({
			moduleID: 2,
			assetID: 0,
			nonce: BigInt('0'),
			fee: BigInt('100000000'),
			senderPublicKey: getAddressAndPublicKeyFromPassphrase(genesis.passphrase).publicKey,
			asset: getRandomBytes(100),
			signatures: [],
		});
		(transactionOne.signatures as Buffer[]).push(
			signDataWithPassphrase(
				TAG_TRANSACTION,
				Buffer.from(networkIdentifier, 'hex'),
				transaction.getBytes(),
				genesis.passphrase,
			),
		);

		transactionsList = [transactionOne, transactionTwo];

		synchronizerStub = {
			isActive: false,
			init: jest.fn(),
			run: jest.fn(),
			loadUnconfirmedTransactions: jest.fn(),
		};

		loggerStub = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			trace: jest.fn(),
			warn: jest.fn(),
			fatal: jest.fn(),
			level: jest.fn(),
		};

		channelStub = {
			publish: jest.fn(),
			invoke: jest.fn(),
		};

		jest.spyOn(validator, 'validate');

		networkStub = {
			applyPenaltyOnPeer: jest.fn(),
			broadcast: jest.fn(),
			send: jest.fn(),
		};
		transportModule = new Transport({
			channel: channelStub as InMemoryChannel,
			logger: loggerStub,
			synchronizer: synchronizerStub,
			transactionPoolModule: {
				getProcessableTransactions: jest.fn(),
				add: jest.fn(),
				get: jest.fn(),
				contains: jest.fn().mockReturnValue(false),
			} as any,
			chainModule: {
				lastBlock: jest.fn().mockReturnValue({ height: 1, version: 1, timestamp: 1 }) as any,
				dataAccess: {
					getBlockHeaderByID: jest.fn().mockReturnValue({ height: 2, version: 1, timestamp: 1 }),
					getBlocksByHeightBetween: jest.fn().mockReturnValue([
						{ height: 3, version: 1, timestamp: 1 },
						{ height: 37, version: 1, timestamp: 1 },
					]),
					getTransactionByID: jest.fn(),
					getTransactionsByIDs: jest.fn(),
					decodeTransaction: jest.fn().mockReturnValue(transaction),
					encode: jest.fn().mockReturnValue(encodedBlock),
					decode: jest.fn().mockReturnValue(getGenesisBlock()),
				} as any,
			} as any,
			processorModule: {
				validate: jest.fn(),
				validateTransaction: jest.fn(),
				process: jest.fn(),
			} as any,
			networkModule: networkStub,
		});
	});

	describe('constructor', () => {
		describe('transportModule', () => {
			it('should assign scope variables when instantiating', () => {
				expect(transportModule).toHaveProperty('_logger');
				expect(transportModule['_logger']).toBe(loggerStub);
				expect(transportModule).toHaveProperty('_channel');
				expect(transportModule['_channel']).toBe(channelStub);
				expect(transportModule).toHaveProperty('_broadcaster');
			});
		});
	});

	describe('private', () => {
		describe('_obtainUnknownTransactionIDs', () => {
			let resultTransactionsIDsCheck: any;

			beforeEach(() => {
				query = {
					ids: transactionsList.map(tx => tx.id),
				};
			});

			describe('when transaction is neither in the queues, nor in the database', () => {
				beforeEach(async () => {
					transportModule['_transactionPoolModule'].contains = jest.fn().mockReturnValue(false);
					transportModule[
						'_chainModule'
					].dataAccess.getTransactionsByIDs = jest.fn().mockReturnValue([]);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(transportModule['_transactionPoolModule'].contains).toHaveBeenCalledWith(
							transactionToCheck.id,
						);
					}
				});

				it('should call transportModule._chainModule.dataAccess.getTransactionByID with query.transaction.ids as arguments', () => {
					expect(
						transportModule['_chainModule'].dataAccess.getTransactionsByIDs,
					).toHaveBeenCalledWith(transactionsList.map(tx => tx.id));
				});

				it('should return array of transactions ids', () =>
					expect(resultTransactionsIDsCheck).toEqual(
						expect.arrayContaining([transactionsList[0].id, transactionsList[1].id]),
					));
			});

			describe('when transaction is in the queues', () => {
				beforeEach(async () => {
					transportModule['_transactionPoolModule'].contains = jest.fn().mockReturnValue(true);
					transportModule['_chainModule'].dataAccess.getTransactionByID = jest.fn();
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(transportModule['_transactionPoolModule'].contains).toHaveBeenCalledWith(
							transactionToCheck.id,
						);
					}
				});

				it('should not call transportModule._chainModule.dataAccess.getTransactionByID', () => {
					expect(
						transportModule['_chainModule'].dataAccess.getTransactionByID,
					).not.toHaveBeenCalled();
				});

				it('should return empty array', () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});

			describe('when transaction exists in the database', () => {
				beforeEach(async () => {
					transportModule['_transactionPoolModule'].contains = jest.fn().mockReturnValue(false);
					transportModule[
						'_chainModule'
					].dataAccess.getTransactionsByIDs = jest.fn().mockResolvedValue(transactionsList);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(transportModule['_transactionPoolModule'].contains).toHaveBeenCalledWith(
							transactionToCheck.id,
						);
					}
				});

				it('should call transportModule._chainModule.dataAccess.getTransactionByID with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(transportModule['_transactionPoolModule'].contains).toHaveBeenCalledWith(
							transactionToCheck.id,
						);
					}
				});

				it('should return empty array', () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});
		});

		describe('_receiveTransaction', () => {
			beforeEach(() => {
				transportModule['_transactionPoolModule'].add.mockResolvedValue({
					status: 1,
					errors: [],
				});
			});

			it('should call validateTransactions', async () => {
				await transportModule['_receiveTransaction'](transaction);
				return expect(
					transportModule['_processorModule'].validateTransaction,
				).toHaveBeenCalledTimes(1);
			});

			it('should call validateTransactions with an array of transactions', async () => {
				await transportModule['_receiveTransaction'](transaction);
				return expect(
					transportModule['_processorModule'].validateTransaction,
				).toHaveBeenCalledTimes(1);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const invalidTrsError = new InvalidTransactionError(
					'Transaction type 0 is currently not allowed.',
					Buffer.alloc(0),
				);

				transportModule['_processorModule'].validateTransaction.mockImplementation(() => {
					throw invalidTrsError;
				});

				await expect(transportModule['_receiveTransaction'](transaction)).rejects.toThrow(
					invalidTrsError.message,
				);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await transportModule['_receiveTransaction'](transaction);
				});

				it('should call modules.transactionPool.add with transaction argument', () => {
					expect(transportModule['_transactionPoolModule'].add).toHaveBeenCalledTimes(1);
				});
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction: Transaction;

				beforeEach(() => {
					invalidTransaction = {
						...transaction,
						senderPublicKey: 'random str' as any,
					} as any;
					transportModule['_processorModule'].validateTransaction.mockImplementation(() => {
						throw new Error('Invalid tx');
					});
				});

				it('should throw with the error from invalid transaction', async () => {
					await expect(transportModule['_receiveTransaction'](invalidTransaction)).rejects.toThrow(
						'Invalid tx',
					);
				});
			});

			describe('when modules.transactions.add fails', () => {
				let addError: any;

				beforeEach(async () => {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					addError = `Transaction is already processed: ${transaction.id}`;

					transportModule['_transactionPoolModule'].add.mockResolvedValue({
						status: 0,
						error: new Error(addError),
					});

					try {
						await transportModule['_receiveTransaction'](transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should reject with error', () => {
					expect((error as any).message).toEqual(addError);
				});
			});

			describe('when modules.transactions.add succeeds', () => {
				beforeEach(async () => {
					result = await transportModule['_receiveTransaction'](transaction);
				});

				it('should resolve with result = transaction.id', () =>
					expect(result).toEqual(transaction.id));
			});
		});

		describe('Transport', () => {
			beforeEach(() => {
				blocksList = [];
				for (let j = 0; j < 10; j += 1) {
					const auxBlock = createValidDefaultBlock();
					blocksList.push(auxBlock);
				}
			});

			describe('onUnconfirmedTransaction', () => {
				beforeEach(() => {
					transaction = new Transaction({
						moduleID: 2,
						assetID: 0,
						fee: BigInt('10'),
						nonce: BigInt(0),
						senderPublicKey: Buffer.from(
							'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
							'hex',
						),
						asset: getRandomBytes(100),
						signatures: [
							Buffer.from(
								'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
								'hex',
							),
						],
					});
					transportModule['_broadcaster'] = {
						enqueueTransactionId: jest.fn(),
					};
					transportModule['_channel'] = {
						invoke: jest.fn(),
						publish: jest.fn(),
					};
					transportModule.handleBroadcastTransaction(transaction, true);
				});

				describe('when broadcast is defined', () => {
					beforeEach(() => {
						transportModule['_broadcaster'] = {
							enqueueTransactionId: jest.fn(),
						};
						transportModule['_channel'] = {
							invoke: jest.fn(),
							publish: jest.fn(),
						};
						transportModule.handleBroadcastTransaction(transaction, true);
					});

					it('should call transportModule.broadcaster.enqueueTransactionId transactionId', () => {
						expect(transportModule['_broadcaster'].enqueueTransactionId).toHaveBeenCalledTimes(1);

						return expect(
							transportModule['_broadcaster'].enqueueTransactionId,
						).toHaveBeenCalledWith(transaction.id);
					});

					it('should call transportModule.channel.publish with "app:transaction:new" and transaction as arguments', () => {
						expect(transportModule['_channel'].publish).toHaveBeenCalledTimes(1);
						expect(transportModule['_channel'].publish).toHaveBeenCalledWith(
							'app:transaction:new',
							{
								transaction: transaction.getBytes().toString('hex'),
							},
						);
					});
				});
			});

			describe('handleBroadcastBlock', () => {
				describe('when broadcast is defined', () => {
					beforeEach(() => {
						block = {
							id: '6258354802676165798',
							height: 123,
							timestamp: 28227090,
							generatorPublicKey:
								'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
							numberOfTransactions: 15,
							totalAmount: BigInt('150000000'),
							totalFee: BigInt('15000000'),
							reward: BigInt('50000000'),
							totalForged: '65000000',
						};
						transportModule['_broadcaster'] = {
							enqueue: jest.fn(),
							broadcast: jest.fn(),
						};
						return transportModule.handleBroadcastBlock(block);
					});

					it('should call network module to send', () => {
						const data = codec.encode(postBlockEventSchema, { block: encodedBlock });

						expect(networkStub.send).toHaveBeenCalledTimes(1);
						return expect(networkStub.send).toHaveBeenCalledWith({
							event: 'postBlock',
							data,
						});
					});

					describe('when modules.synchronizer.isActive = true', () => {
						beforeEach(() => {
							transportModule['_synchronizerModule'].isActive = true;
							transportModule.handleBroadcastBlock(block);
						});

						it('should call transportModule.logger.debug with proper error message', () => {
							return expect(transportModule['_logger'].debug).toHaveBeenCalledWith(
								'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
							);
						});
					});
				});
			});

			describe('Transport.prototype.shared', () => {
				describe('handleRPCGetBlocksFromId', () => {
					describe('when query is defined', () => {
						it('should call modules.chain.loadBlocksFromLastBlockId with lastBlockID and limit 34', async () => {
							const blockIds = codec.encode(getBlocksFromIdRequestSchema, {
								blockId: Buffer.from('6258354802676165798'),
							});

							await transportModule.handleRPCGetBlocksFromId(blockIds);
							expect(
								transportModule['_chainModule'].dataAccess.getBlockHeaderByID,
							).toHaveBeenCalledWith(Buffer.from('6258354802676165798'));
							return expect(
								transportModule['_chainModule'].dataAccess.getBlocksByHeightBetween,
							).toHaveBeenCalledWith(3, 105);
						});
					});

					describe('when modules.chain.loadBlocksFromLastBlockId fails', () => {
						it('should throw an error', async () => {
							query = {
								blockId: Buffer.from('6258354802676165798').toString('hex'),
							};

							const errorMessage = 'Failed to load blocks...';
							const loadBlockFailed = new Error(errorMessage);

							transportModule['_chainModule'].dataAccess.getBlockHeaderByID.mockResolvedValue(
								Promise.reject(loadBlockFailed),
							);

							await expect(transportModule.handleRPCGetBlocksFromId(query)).rejects.toThrow(
								loadBlockFailed,
							);
						});
					});
				});

				describe('handleEventPostBlock', () => {
					describe('when query is specified', () => {
						describe('when it does not throw', () => {
							const encodedGenesisBlock = encodeValidBlock(getGenesisBlock());

							describe('when query.block is defined', () => {
								it('should call modules.chain.addBlockProperties with query.block', async () => {
									const data = codec.encode(postBlockEventSchema, { block: encodedGenesisBlock });

									await transportModule.handleEventPostBlock(data);
									expect(transportModule['_chainModule'].dataAccess.decode).toHaveBeenCalledWith(
										encodedGenesisBlock,
									);
								});
							});

							it('should call transportModule.processorModule.process with block', async () => {
								const data = codec.encode(postBlockEventSchema, { block: encodedGenesisBlock });

								await transportModule.handleEventPostBlock(data, '127.0.0.1:5000');
								expect(transportModule['_processorModule'].process).toHaveBeenCalledWith(
									genesisBlock(),
									{
										peerId: '127.0.0.1:5000',
									},
								);
							});
						});
					});
				});

				describe('handleEventPostTransaction', () => {
					beforeEach(async () => {
						query = {
							transaction: transaction.getBytes().toString('hex'),
						};

						transportModule['_receiveTransaction'] = jest.fn().mockResolvedValue(transaction.id);

						result = await transportModule.handleEventPostTransaction(query);
					});

					it('should call transportModule _receiveTransaction with query.transaction as argument', () =>
						expect(transportModule['_receiveTransaction']).toHaveBeenCalledWith(transaction));

					describe('when transportModule _receiveTransaction succeeds', () => {
						it('should resolve with object { transactionId: id }', () => {
							expect(result).toHaveProperty('transactionId');
							expect(typeof result.transactionId).toBe('string');
						});
					});

					describe('when transportModule._receiveTransaction fails', () => {
						const receiveTransactionError = new Error('Invalid transaction body ...');

						beforeEach(() => {
							transportModule._receiveTransaction = jest
								.fn()
								.mockResolvedValue(Promise.reject(receiveTransactionError));
						});

						it('should throw when transaction is invalid', async () => {
							return expect(transportModule.handleEventPostTransaction(query)).rejects.toThrow(
								receiveTransactionError,
							);
						});
					});

					describe('when transportModule._receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = new Error('Transaction pool is full');

						beforeEach(() => {
							transportModule._receiveTransaction = jest
								.fn()
								.mockResolvedValue(Promise.reject(receiveTransactionError));
						});

						it('should throw when transaction pool is full', async () => {
							return expect(transportModule.handleEventPostTransaction(query)).rejects.toThrow(
								receiveTransactionError,
							);
						});
					});
				});
			});
		});
	});
});
