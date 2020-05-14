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

import {
	TransactionJSON,
	TransactionError,
	transfer,
	TransferTransaction,
} from '@liskhq/lisk-transactions';
import { BlockInstance } from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import { Logger } from '../../../../../../src/types';
import { Transport } from '../../../../../../src/application/node/transport';

import { genesis } from '../../../../../fixtures/accounts';
import { devnetNetworkIdentifier as networkIdentifier } from '../../../../../utils/network_identifier';
import { Block, GenesisBlock } from '../../../../../fixtures/blocks';
import { InvalidTransactionError } from '../../../../../../src/application/node/transport/errors';
import { InMemoryChannel } from '../../../../../../src/controller/channels';

/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
describe('transport', () => {
	let loggerStub: Logger;
	let synchronizerStub: any;
	let channelStub: Partial<InMemoryChannel>;
	let transportModule: any;
	let transaction: any;
	let block: any;
	let blocksList;
	let transactionsList: Partial<TransactionJSON>[];
	let blockMock: BlockInstance;
	let error: Error;
	let result: any;
	let query: any = { ids: ['1', '2', '3'] };

	beforeEach(() => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: genesis.passphrase,
		});
		const transactionOne = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: genesis.passphrase,
		});
		const transactionTwo = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: genesis.passphrase,
		});

		blockMock = new Block();

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
			publishToNetwork: jest.fn(),
			invokeFromNetwork: jest.fn(),
		};

		jest.spyOn(validator, 'validate');

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
				lastBlock: jest
					.fn()
					.mockReturnValue({ height: 1, version: 1, timestamp: 1 }) as any,
				receiveBlockFromNetwork: jest.fn(),
				loadBlocksFromLastBlockId: jest.fn(),
				validateTransactions: jest
					.fn()
					.mockResolvedValue([{ status: 1, errors: [] }]),
				applyTransactions: jest
					.fn()
					.mockResolvedValue([{ status: 1, errors: [] }]),
				deserializeTransaction: jest.fn().mockImplementation(val => val),
				dataAccess: {
					getBlockHeaderByID: jest
						.fn()
						.mockReturnValue({ height: 2, version: 1, timestamp: 1 }),
					getBlocksByHeightBetween: jest.fn().mockReturnValue([
						{ height: 3, version: 1, timestamp: 1 },
						{ height: 37, version: 1, timestamp: 1 },
					]),
					getTransactionsByIDs: jest.fn(),
				} as any,
				serialize: jest.fn(),
			} as any,
			processorModule: {
				validate: jest.fn(),
				process: jest.fn(),
				deserialize: jest.fn(),
			} as any,
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
					ids: transactionsList.map(tx => tx.id) as string[],
				};
			});

			describe('when transaction is neither in the queues, nor in the database', () => {
				beforeEach(async () => {
					transportModule[
						'_transactionPoolModule'
					].contains = jest.fn().mockReturnValue(false);
					transportModule[
						'_chainModule'
					].dataAccess.getTransactionsByIDs = jest.fn().mockResolvedValue([]);
					resultTransactionsIDsCheck = await (transportModule as any)._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule['_transactionPoolModule'].contains,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should call transportModule._chainModule.dataAccess.getTransactionsByIDs with query.transaction.ids as arguments', () => {
					expect(
						transportModule['_chainModule'].dataAccess.getTransactionsByIDs,
					).toHaveBeenCalledWith(transactionsList.map(tx => tx.id));
				});

				it('should return array of transactions ids', () =>
					expect(resultTransactionsIDsCheck).toEqual(
						expect.arrayContaining([
							transactionsList[0].id,
							transactionsList[1].id,
						]),
					));
			});

			describe('when transaction is in the queues', () => {
				beforeEach(async () => {
					transportModule[
						'_transactionPoolModule'
					].contains = jest.fn().mockReturnValue(true);
					transportModule[
						'_chainModule'
					].dataAccess.getTransactionsByIDs = jest.fn();
					resultTransactionsIDsCheck = await (transportModule as any)._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule['_transactionPoolModule'].contains,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should not call transportModule._chainModule.dataAccess.getTransactionsByIDs', () => {
					expect(
						transportModule['_chainModule'].dataAccess.getTransactionsByIDs,
					).not.toHaveBeenCalled();
				});

				it('should return empty array', () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});

			describe('when transaction exists in the database', () => {
				beforeEach(async () => {
					transportModule[
						'_transactionPoolModule'
					].contains = jest.fn().mockReturnValue(false);
					transportModule[
						'_chainModule'
					].dataAccess.getTransactionsByIDs = jest
						.fn()
						.mockResolvedValue(transactionsList);
					resultTransactionsIDsCheck = await (transportModule as any)._obtainUnknownTransactionIDs(
						query.ids,
					);
				});

				it('should call transactionPoolModule.contains with query.transaction.ids as arguments', () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule['_transactionPoolModule'].contains,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should call transportModule._chainModule.dataAccess.getTransactionsByIDs with query.transaction.ids as arguments', () => {
					expect(
						transportModule['_chainModule'].dataAccess.getTransactionsByIDs,
					).toHaveBeenCalledWith(transactionsList.map(tx => tx.id));
				});

				it('should return empty array', () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});
		});

		describe('_receiveTransaction', () => {
			beforeEach(() => {
				(transportModule['_transactionPoolModule']
					.add as any).mockResolvedValue({
					status: 1,
					errors: [],
				});
				(transportModule['_chainModule']
					.deserializeTransaction as any).mockReturnValue({
					...transaction,
					toJSON: () => transaction,
				});
			});

			afterEach(() => {
				(transportModule['_chainModule']
					.deserializeTransaction as any).mockReturnValue({
					...transaction,
				});
			});

			it('should call validateTransactions', async () => {
				await transportModule['_receiveTransaction'](transaction);
				return expect(
					transportModule['_chainModule'].validateTransactions,
				).toHaveBeenCalledTimes(1);
			});

			it('should call validateTransactions with an array of transactions', async () => {
				await transportModule['_receiveTransaction'](transaction);
				return expect(
					transportModule['_chainModule'].validateTransactions,
				).toHaveBeenCalledTimes(1);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const invalidTrsError = new InvalidTransactionError(
					'Transaction type 0 is currently not allowed.',
					'',
					[new Error()],
				);

				(transportModule['_chainModule']
					.validateTransactions as any).mockResolvedValue([
					{
						errors: [invalidTrsError],
					},
				]);

				await expect(
					transportModule['_receiveTransaction'](transaction),
				).rejects.toThrow(invalidTrsError.message);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await transportModule['_receiveTransaction'](transaction);
				});

				it('should call modules.transactionPool.add with transaction argument', () => {
					expect(
						transportModule['_transactionPoolModule'].add,
					).toHaveBeenCalledTimes(1);
				});
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult: any;

				beforeEach(async () => {
					invalidTransaction = {
						...transaction,
						asset: {},
					};
					(transportModule['_chainModule']
						.validateTransactions as any).mockResolvedValue([
						{
							status: 1,
							errors: [new TransactionError('invalid transaction')],
						},
					]);

					try {
						await transportModule['_receiveTransaction'](invalidTransaction);
					} catch (err) {
						errorResult = err;
					}
				});

				it('should call the call back with error message', () => {
					expect(errorResult.errors).toBeInstanceOf(Array);
					errorResult.errors.forEach((anError: TransactionError) => {
						expect(anError).toBeInstanceOf(TransactionError);
					});
				});
			});

			describe('when transaction has no id', () => {
				let invalidTransaction: any;

				beforeEach(() => {
					invalidTransaction = {
						...transaction,
						id: undefined,
					};
				});

				it('should resolve with result = transaction.id', async () => {
					const res = await transportModule['_receiveTransaction'](
						invalidTransaction,
					);

					expect(res).toEqual(transaction.id);
				});
			});

			describe('when modules.transactions.add fails', () => {
				let addError: any;

				beforeEach(async () => {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					addError = `Transaction is already processed: ${transaction.id}`;

					(transportModule['_transactionPoolModule']
						.add as any).mockResolvedValue({
						status: 0,
						errors: [new Error(addError)],
					});

					try {
						await transportModule['_receiveTransaction'](transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should reject with error', () => {
					expect(error).toBeInstanceOf(Array);
					expect((error as any)[0].message).toEqual(addError);
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
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}
			});

			describe('onUnconfirmedTransaction', () => {
				beforeEach(() => {
					transaction = new TransferTransaction({
						id: '222675625422353767',
						type: 0,
						amount: '100',
						fee: '10',
						senderPublicKey:
							'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
						recipientId: '12668885769632475474L',
						timestamp: 28227090,
						asset: {},
						signature:
							'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
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
						expect(
							transportModule['_broadcaster'].enqueueTransactionId,
						).toHaveBeenCalledTimes(1);

						return expect(
							transportModule['_broadcaster'].enqueueTransactionId,
						).toHaveBeenCalledWith(transaction.id);
					});

					it('should call transportModule.channel.publish with "app:transaction:new" and transaction as arguments', () => {
						expect(transportModule['_channel'].publish).toHaveBeenCalledTimes(
							1,
						);
						expect(transportModule['_channel'].publish).toHaveBeenCalledWith(
							'app:transaction:new',
							(transaction as any).toJSON(),
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

					it('should call channel.invoke to send', () => {
						expect(channelStub.publishToNetwork).toHaveBeenCalledTimes(1);
						return expect(channelStub.publishToNetwork).toHaveBeenCalledWith(
							'sendToNetwork',
							{
								event: 'postBlock',
								data: {
									block,
								},
							},
						);
					});

					describe('when modules.synchronizer.isActive = true', () => {
						beforeEach(() => {
							transportModule['_synchronizerModule'].isActive = true;
							transportModule.handleBroadcastBlock(block);
						});

						it('should call transportModule.logger.debug with proper error message', () => {
							return expect(
								transportModule['_logger'].debug,
							).toHaveBeenCalledWith(
								'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
							);
						});
					});
				});
			});

			describe('Transport.prototype.shared', () => {
				describe('handleRPCGetBlocksFromId', () => {
					describe('when query is undefined', () => {
						it('should throw a validation error', async () => {
							query = {} as any;
							const defaultPeerId = 'peer-id';

							await expect(
								transportModule.handleRPCGetBlocksFromId(query, defaultPeerId),
							).rejects.toThrow("should have required property 'blockId'");

							expect(channelStub.invoke).toHaveBeenCalledTimes(1);
							expect(channelStub.invoke).toHaveBeenCalledWith(
								'app:applyPenaltyOnPeer',
								{
									peerId: defaultPeerId,
									penalty: 100,
								},
							);
						});
					});

					describe('when query is defined', () => {
						it('should call modules.chain.loadBlocksFromLastBlockId with lastBlockId and limit 34', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							await transportModule.handleRPCGetBlocksFromId(query);
							expect(
								transportModule['_chainModule'].dataAccess.getBlockHeaderByID,
							).toHaveBeenCalledWith(query.blockId);
							return expect(
								transportModule['_chainModule'].dataAccess
									.getBlocksByHeightBetween,
							).toHaveBeenCalledWith(3, 105);
						});
					});

					describe('when modules.chain.loadBlocksFromLastBlockId fails', () => {
						it('should throw an error', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							const errorMessage = 'Failed to load blocks...';
							const loadBlockFailed = new Error(errorMessage);

							transportModule[
								'_chainModule'
							].dataAccess.getBlockHeaderByID.mockResolvedValue(
								Promise.reject(loadBlockFailed),
							);

							await expect(
								transportModule.handleRPCGetBlocksFromId(query),
							).rejects.toThrow(loadBlockFailed);
						});
					});
				});

				describe('handleEventPostBlock', () => {
					let postBlockQuery: any;
					const defaultPeerId = 'peer-id';

					beforeEach(() => {
						postBlockQuery = {
							block: blockMock,
						};
					});

					describe('when query is specified', () => {
						describe('when it throws', () => {
							const blockValidationError = 'should match format "hex"';

							it('should throw an error', async () => {
								await expect(
									transportModule.handleEventPostBlock(
										{
											block: { ...postBlockQuery.block, id: 'test'.repeat(16) },
										},
										defaultPeerId,
									),
								).rejects.toEqual([
									expect.objectContaining({
										message: blockValidationError,
										dataPath: '.block.id',
									}),
								]);

								expect(channelStub.invoke).toHaveBeenCalledTimes(1);
								expect(channelStub.invoke).toHaveBeenCalledWith(
									'app:applyPenaltyOnPeer',
									{
										peerId: defaultPeerId,
										penalty: 100,
									},
								);
							});
						});

						describe('when it does not throw', () => {
							const genesisBlock = new GenesisBlock();
							genesisBlock.previousBlockId = genesisBlock.id; // So validations pass

							describe('when query.block is defined', () => {
								it('should call modules.chain.addBlockProperties with query.block', async () => {
									await transportModule.handleEventPostBlock({
										block: genesisBlock,
									});
									expect(
										transportModule['_processorModule'].deserialize,
									).toHaveBeenCalledWith(genesisBlock);
								});
							});

							it('should call transportModule.processorModule.process with block', async () => {
								const blockWithProperties = {};
								transportModule[
									'_processorModule'
								].deserialize.mockResolvedValue(blockWithProperties);
								await transportModule.handleEventPostBlock(
									{
										block: genesisBlock,
									},
									'127.0.0.1:5000',
								);
								expect(
									transportModule['_processorModule'].process,
								).toHaveBeenCalledWith(blockWithProperties, {
									peerId: '127.0.0.1:5000',
								});
							});
						});
					});
				});

				describe('handleEventPostTransaction', () => {
					beforeEach(async () => {
						query = {
							transaction,
						};

						transportModule[
							'_receiveTransaction'
						] = jest.fn().mockResolvedValue(transaction.id);

						result = await transportModule.handleEventPostTransaction(query);
					});

					it('should call transportModule _receiveTransaction with query.transaction as argument', () =>
						expect(transportModule['_receiveTransaction']).toHaveBeenCalledWith(
							query.transaction,
						));

					describe('when transportModule _receiveTransaction succeeds', () => {
						it('should resolve with object { transactionId: id }', () => {
							expect(result).toHaveProperty('transactionId');
							expect(typeof result.transactionId).toBe('string');
						});
					});

					describe('when transportModule._receiveTransaction fails', () => {
						const receiveTransactionError = new Error(
							'Invalid transaction body ...',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = jest
								.fn()
								.mockResolvedValue(Promise.reject(receiveTransactionError));

							result = await transportModule.handleEventPostTransaction(query);
						});

						it('should resolve with object { message: err }', () => {
							expect(result).toHaveProperty('errors');
							expect(result.errors).toEqual(receiveTransactionError);
						});
					});

					describe('when transportModule._receiveTransaction fails with "Transaction pool is full"', () => {
						const receiveTransactionError = new Error(
							'Transaction pool is full',
						);

						beforeEach(async () => {
							transportModule._receiveTransaction = jest
								.fn()
								.mockResolvedValue(Promise.reject(receiveTransactionError));

							result = await transportModule.handleEventPostTransaction(query);
						});

						it('should resolve with object { message: err }', () => {
							expect(result).toHaveProperty('errors');
							expect(result.errors).toEqual(receiveTransactionError);
						});
					});
				});
			});
		});
	});
});
