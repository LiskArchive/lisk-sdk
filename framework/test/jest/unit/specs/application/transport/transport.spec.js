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
const { transfer, TransactionError } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const accountFixtures = require('../../../../../fixtures//accounts');
const { Block, GenesisBlock } = require('../../../../../fixtures//blocks');
const {
	Transport: TransportModule,
} = require('../../../../../../src/application/node/transport');
const {
	InvalidTransactionError,
} = require('../../../../../../src/application/node/transport/errors');
const jobsQueue = require('../../../../../../src/application/node/utils/jobs_queue');
const {
	devnetNetworkIdentifier: networkIdentifier,
} = require('../../../../../utils/network_identifier');

const { nodeOptions } = require('../../../../../fixtures/node');

describe('transport', () => {
	let loggerStub;
	let synchronizerStub;
	let channelStub;
	let transportModule;
	let transaction;
	let block;
	let blocksList;
	let transactionsList;
	let blockMock;
	let error;
	let result;
	let query = { ids: ['1', '2', '3'] };

	beforeEach(async () => {
		// Recreate all the stubs and default structures before each test case to make
		// sure that they are fresh every time; that way each test case can modify
		// stubs without affecting other test cases.

		transaction = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionOne = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});
		const transactionTwo = transfer({
			nonce: '0',
			fee: '100000000',
			networkIdentifier,
			amount: '100',
			recipientId: '12668885769632475474L',
			passphrase: accountFixtures.genesis.passphrase,
		});

		blockMock = new Block();

		transactionsList = [transactionOne, transactionTwo];

		synchronizerStub = {
			isActive: false,
		};

		loggerStub = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			trace: jest.fn(),
			warn: jest.fn(),
		};

		channelStub = {
			publish: jest.fn(),
			invoke: jest.fn(),
			publishToNetwork: jest.fn(),
			invokeFromNetwork: jest.fn(),
		};

		jest.spyOn(jobsQueue, 'register');
		jest.spyOn(validator, 'validate');

		transportModule = new TransportModule({
			channel: channelStub,
			logger: loggerStub,
			applicationState: {},
			exceptions: nodeOptions.exceptions,
			synchronizer: synchronizerStub,
			transactionPoolModule: {
				getMergedTransactionList: jest.fn(),
				processUnconfirmedTransaction: jest.fn(),
				findInTransactionPool: jest.fn(),
			},
			chainModule: {
				lastBlock: jest
					.fn()
					.mockReturnValue({ height: 1, version: 1, timestamp: 1 }),
				receiveBlockFromNetwork: jest.fn(),
				loadBlocksFromLastBlockId: jest.fn(),
				verifyTransactions: jest.fn().mockResolvedValue({
					transactionsResponses: [{ status: 1, errors: [] }],
				}),
				validateTransactions: jest.fn().mockResolvedValue({
					transactionsResponses: [{ status: 1, errors: [] }],
				}),
				processTransactions: jest.fn().mockResolvedValue({
					transactionsResponses: [{ status: 1, errors: [] }],
				}),
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
				},
				serialize: jest.fn(),
			},
			processorModule: {
				validate: jest.fn(),
				process: jest.fn(),
				deserialize: jest.fn(),
			},
			broadcasts: nodeOptions.broadcasts,
		});
	});

	describe('constructor', () => {
		describe('transportModule', () => {
			it('should assign scope variables when instantiating', async () => {
				expect(transportModule).toHaveProperty('logger');
				expect(transportModule.logger).toBe(loggerStub);
				expect(transportModule).toHaveProperty('channel');
				expect(transportModule.channel).toBe(channelStub);
				expect(transportModule).toHaveProperty('broadcaster');
			});
		});
	});

	describe('private', () => {
		describe('_obtainUnknownTransactionIDs', () => {
			let resultTransactionsIDsCheck;

			beforeEach(async () => {
				query = {
					transactionIds: transactionsList.map(tx => tx.id),
				};
			});

			describe('when transaction is neither in the queues, nor in the database', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = jest
						.fn()
						.mockReturnValue(false);
					transportModule.chainModule.dataAccess.getTransactionsByIDs = jest
						.fn()
						.mockResolvedValue([]);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should call transportModule.chainModule.dataAccess.getTransactionsByIDs with query.transaction.ids as arguments', async () => {
					expect(
						transportModule.chainModule.dataAccess.getTransactionsByIDs,
					).toHaveBeenCalledWith(transactionsList.map(tx => tx.id));
				});

				it('should return array of transactions ids', async () =>
					expect(resultTransactionsIDsCheck).toEqual(
						expect.arrayContaining([
							transactionsList[0].id,
							transactionsList[1].id,
						]),
					));
			});

			describe('when transaction is in the queues', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = jest
						.fn()
						.mockReturnValue(true);
					transportModule.chainModule.dataAccess.getTransactionsByIDs = jest.fn();
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should not call transportModule.chainModule.dataAccess.getTransactionsByIDs', async () => {
					expect(
						transportModule.chainModule.dataAccess.getTransactionsByIDs,
					).not.toHaveBeenCalled();
				});

				it('should return empty array', async () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});

			describe('when transaction exists in the database', () => {
				beforeEach(async () => {
					transportModule.transactionPoolModule.transactionInPool = jest
						.fn()
						.mockReturnValue(false);
					transportModule.chainModule.dataAccess.getTransactionsByIDs = jest
						.fn()
						.mockResolvedValue(transactionsList);
					resultTransactionsIDsCheck = await transportModule._obtainUnknownTransactionIDs(
						query.transactionIds,
					);
				});

				it('should call transactionPoolModule.transactionInPool with query.transaction.ids as arguments', async () => {
					for (const transactionToCheck of transactionsList) {
						expect(
							transportModule.transactionPoolModule.transactionInPool,
						).toHaveBeenCalledWith(transactionToCheck.id);
					}
				});

				it('should call transportModule.chainModule.dataAccess.getTransactionsByIDs with query.transaction.ids as arguments', async () => {
					expect(
						transportModule.chainModule.dataAccess.getTransactionsByIDs,
					).toHaveBeenCalledWith(transactionsList.map(tx => tx.id));
				});

				it('should return empty array', async () => {
					expect(resultTransactionsIDsCheck).toBeInstanceOf(Array);
					expect(resultTransactionsIDsCheck).toHaveLength(0);
				});
			});
		});

		describe('_receiveTransaction', () => {
			beforeEach(async () => {
				transportModule.transactionPoolModule.processUnconfirmedTransaction.mockResolvedValue();
			});

			it('should call validateTransactions', async () => {
				await transportModule._receiveTransaction(transaction);
				return expect(
					transportModule.chainModule.validateTransactions,
				).toHaveBeenCalledTimes(1);
			});

			it('should call validateTransactions with an array of transactions', async () => {
				await transportModule._receiveTransaction(transaction);
				return expect(
					transportModule.chainModule.validateTransactions,
				).toHaveBeenCalledWith([transaction]);
			});

			it('should reject with error if transaction is not allowed', async () => {
				const invalidTrsError = new InvalidTransactionError(
					'Transaction type 0 is currently not allowed.',
				);

				transportModule.chainModule.validateTransactions.mockResolvedValue({
					transactionsResponses: [
						{
							errors: [invalidTrsError],
						},
					],
				});

				await expect(
					transportModule._receiveTransaction(transaction),
				).rejects.toThrowError(invalidTrsError.message);
			});

			describe('when transaction and peer are defined', () => {
				beforeEach(async () => {
					await transportModule._receiveTransaction(transaction);
				});

				it('should call modules.transactionPool.processUnconfirmedTransaction with transaction and true as arguments', async () => {
					expect(
						transportModule.transactionPoolModule.processUnconfirmedTransaction,
					).toHaveBeenCalledWith(transaction, true);
				});
			});

			describe('when transaction is invalid', () => {
				let invalidTransaction;
				let errorResult;

				beforeEach(async () => {
					invalidTransaction = {
						...transaction,
						asset: {},
					};
					transportModule.chainModule.validateTransactions.mockResolvedValue({
						transactionsResponses: [
							{
								status: 1,
								errors: [new TransactionError('invalid transaction')],
							},
						],
					});

					try {
						await transportModule._receiveTransaction(invalidTransaction);
					} catch (err) {
						errorResult = err;
					}
				});

				it('should call the call back with error message', async () => {
					expect(errorResult.errors).toBeInstanceOf(Array);
					errorResult.errors.forEach(anError => {
						expect(anError).toBeInstanceOf(TransactionError);
					});
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction fails', () => {
				let processUnconfirmedTransactionError;

				beforeEach(async () => {
					processUnconfirmedTransactionError = `Transaction is already processed: ${transaction.id}`;

					transportModule.transactionPoolModule.processUnconfirmedTransaction.mockResolvedValue(
						// eslint-disable-next-line prefer-promise-reject-errors
						Promise.reject([new Error(processUnconfirmedTransactionError)]),
					);

					try {
						await transportModule._receiveTransaction(transaction);
					} catch (err) {
						error = err;
					}
				});

				it('should call transportModule.logger.debug with "Transaction transaction.id" and error string', async () => {
					expect(transportModule.logger.debug).toHaveBeenCalledWith(
						`Transaction ${transaction.id}`,
						`Error: ${processUnconfirmedTransactionError}`,
					);
				});

				describe('when transaction is defined', () => {
					it('should call transportModule.logger.debug with "Transaction" and transaction as arguments', async () => {
						expect(transportModule.logger.debug).toHaveBeenCalledWith(
							{
								transaction,
							},
							'Transaction',
						);
					});
				});

				it('should reject with error', async () => {
					expect(error).toBeInstanceOf(Array);
					expect(error[0].message).toEqual(processUnconfirmedTransactionError);
				});
			});

			describe('when modules.transactions.processUnconfirmedTransaction succeeds', () => {
				beforeEach(async () => {
					result = await transportModule._receiveTransaction(transaction);
				});

				it('should resolve with result = transaction.id', async () =>
					expect(result).toEqual(transaction.id));

				it('should call transportModule.logger.debug with "Received transaction " + transaction.id', async () => {
					expect(transportModule.logger.debug).toHaveBeenCalledWith(
						{ id: transaction.id },
						'Received transaction',
					);
				});
			});
		});

		describe('Transport', () => {
			beforeEach(async () => {
				blocksList = [];
				for (let j = 0; j < 10; j += 1) {
					const auxBlock = new Block();
					blocksList.push(auxBlock);
				}
			});

			describe('onUnconfirmedTransaction', () => {
				beforeEach(async () => {
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
					transportModule.broadcaster = {
						enqueueTransactionId: jest.fn(),
					};
					transportModule.channel = {
						invoke: jest.fn(),
						publish: jest.fn(),
					};
					transportModule.handleBroadcastTransaction(transaction, true);
				});

				describe('when broadcast is defined', () => {
					beforeEach(async () => {
						transportModule.broadcaster = {
							enqueueTransactionId: jest.fn(),
						};
						transportModule.channel = {
							invoke: jest.fn(),
							publish: jest.fn(),
						};
						transportModule.handleBroadcastTransaction(transaction, true);
					});

					it('should call transportModule.broadcaster.enqueueTransactionId transactionId', async () => {
						expect(
							transportModule.broadcaster.enqueueTransactionId,
						).toHaveBeenCalledTimes(1);
						return expect(
							transportModule.broadcaster.enqueueTransactionId,
						).toHaveBeenCalledWith(transaction.id);
					});

					it('should call transportModule.channel.publish with "app:transactions:change" and transaction as arguments', async () => {
						expect(transportModule.channel.publish).toHaveBeenCalledTimes(1);
						expect(transportModule.channel.publish).toHaveBeenCalledWith(
							'app:transactions:change',
							transaction.toJSON(),
						);
					});
				});
			});

			describe('handleBroadcastBlock', () => {
				describe('when broadcast is defined', () => {
					beforeEach(async () => {
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
						transportModule.broadcaster = {
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
						beforeEach(async () => {
							transportModule.synchronizer.isActive = true;
							transportModule.handleBroadcastBlock(block);
						});

						it('should call transportModule.logger.debug with proper error message', () => {
							return expect(transportModule.logger.debug).toHaveBeenCalledWith(
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
							query = {};
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
								transportModule.chainModule.dataAccess.getBlockHeaderByID,
							).toHaveBeenCalledWith(query.blockId);
							return expect(
								transportModule.chainModule.dataAccess.getBlocksByHeightBetween,
							).toHaveBeenCalledWith(3, 36);
						});
					});

					describe('when modules.chain.loadBlocksFromLastBlockId fails', () => {
						it('should throw an error', async () => {
							query = {
								blockId: '6258354802676165798',
							};

							const errorMessage = 'Failed to load blocks...';
							const loadBlockFailed = new Error(errorMessage);

							transportModule.chainModule.dataAccess.getBlockHeaderByID.mockResolvedValue(
								Promise.reject(loadBlockFailed),
							);

							await expect(
								transportModule.handleRPCGetBlocksFromId(query),
							).rejects.toThrow(loadBlockFailed);
						});
					});
				});

				describe('handleEventPostBlock', () => {
					let postBlockQuery;
					const defaultPeerId = 'peer-id';

					beforeEach(async () => {
						postBlockQuery = {
							block: blockMock,
						};
					});

					describe('when transportModule.config.broadcasts.active option is false', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = false;
							await transportModule.handleEventPostBlock(
								postBlockQuery,
								defaultPeerId,
							);
						});

						it('should call transportModule.logger.debug', async () =>
							expect(transportModule.logger.debug).toHaveBeenCalledWith(
								'Receiving blocks disabled by user through config.json',
							));

						it('should not call validator.validate; function should return before', async () =>
							expect(validator.validate).not.toHaveBeenCalled());
					});

					describe('when query is specified', () => {
						beforeEach(async () => {
							transportModule.constants.broadcasts.active = true;
						});

						describe('when it throws', () => {
							const blockValidationError = 'should match format "id"';

							it('should throw an error', async () => {
								await expect(
									transportModule.handleEventPostBlock(
										{ block: { ...postBlockQuery.block, id: 'dummy' } },
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
										transportModule.processorModule.deserialize,
									).toHaveBeenCalledWith(genesisBlock);
								});
							});

							it('should call transportModule.processorModule.process with block', async () => {
								const blockWithProperties = {};
								transportModule.processorModule.deserialize.mockResolvedValue(
									blockWithProperties,
								);
								await transportModule.handleEventPostBlock(
									{
										block: genesisBlock,
									},
									'127.0.0.1:5000',
								);
								expect(
									transportModule.processorModule.process,
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

						transportModule._receiveTransaction = jest
							.fn()
							.mockResolvedValue(transaction.id);

						result = await transportModule.handleEventPostTransaction(query);
					});

					it('should call transportModule._receiveTransaction with query.transaction as argument', async () =>
						expect(transportModule._receiveTransaction).toHaveBeenCalledWith(
							query.transaction,
						));

					describe('when transportModule._receiveTransaction succeeds', () => {
						it('should resolve with object { transactionId: id }', async () => {
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

						it('should resolve with object { message: err }', async () => {
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

						it('should resolve with object { message: err }', async () => {
							expect(result).toHaveProperty('errors');
							expect(result.errors).toEqual(receiveTransactionError);
						});
					});
				});
			});
		});
	});
});
