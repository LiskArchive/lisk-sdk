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
const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');
const {
	TransferTransaction,
	Status: TransactionStatus,
} = require('@liskhq/lisk-transactions');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const { Blocks } = require('../../../../../../../src/modules/chain/blocks');
const forkChoiceRule = require('../../../../../../../src/modules/chain/blocks/fork_choice_rule');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
const { newBlock, getBytes } = require('./utils.js');
const transactionsModule = require('../../../../../../../src/modules/chain/transactions');

jest.mock('../../../../../../../src/modules/chain/transactions');
jest.mock('events');

// TODO: Share fixture generation b/w mocha and jest
const randomUtils = require('../../../../../../mocha/common/utils/random.js');

describe('blocks', () => {
	const stubs = {};
	const constants = {
		blockReceiptTimeout: 20,
		loadPerIteration: 1000,
		maxPayloadLength: 1024 * 1024,
		maxTransactionsPerBlock: 25,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMileStones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockSlotWindow: 5,
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	let exceptions = {};
	let blocksInstance;
	let slots;

	beforeEach(() => {
		// Arrange
		stubs.dependencies = {
			interfaceAdapters: {
				transactions: {
					fromBlock: jest.fn(),
				},
			},
			storage: {
				entities: {
					Account: {
						get: jest.fn(),
						update: jest.fn(),
					},
					Block: {
						begin: jest.fn(),
						create: jest.fn(),
						count: jest.fn(),
						getOne: jest.fn(),
						delete: jest.fn(),
						get: jest.fn(),
						isPersisted: jest.fn(),
					},
					Transaction: {
						create: jest.fn(),
					},
					TempBlock: {
						create: jest.fn(),
					},
				},
			},
			logger: {
				debug: jest.fn(),
				log: jest.fn(),
				error: jest.fn(),
			},
			dposModule: {
				apply: jest.fn(),
				undo: jest.fn(),
				verifyBlockForger: jest.fn(),
			},
		};

		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
			blocksPerRound: constants.activeDelegates,
		});

		exceptions = {
			transactions: [],
		};

		stubs.tx = {
			batch: jest.fn(),
		};

		blocksInstance = new Blocks({
			...stubs.dependencies,
			genesisBlock,
			slots,
			exceptions,
			...constants,
		});
	});

	describe('constructor', () => {
		it('should initialize private variables correctly', async () => {
			// Assert stubbed values are assigned
			Object.entries(stubs.dependencies).forEach(([stubName, stubValue]) => {
				expect(blocksInstance[stubName]).toEqual(stubValue);
			});
			// Assert constants
			Object.entries(blocksInstance.constants).forEach(
				([constantName, constantValue]) =>
					expect(constants[constantName]).toEqual(constantValue),
			);
			// Assert miscellanious
			expect(slots).toEqual(blocksInstance.slots);
			expect(blocksInstance.blockReward).toBeDefined();
			expect(blocksInstance.blocksVerify).toBeDefined();
			return expect(blocksInstance.blocksUtils).toBeDefined();
		});
	});

	describe('lastBlock', () => {
		beforeEach(() => {
			blocksInstance._lastBlock = {
				...genesisBlock,
				receivedAt: new Date(),
			};
		});
		it('return the _lastBlock without the receivedAt property', async () => {
			// Arrange
			const { receivedAt, ...block } = genesisBlock;
			// Assert
			expect(blocksInstance.lastBlock).toEqual(block);
		});
	});

	describe('init', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.begin.mockImplementation(
				(_, callback) => callback.call(blocksInstance, stubs.tx),
			);
			stubs.dependencies.storage.entities.Block.count.mockResolvedValue(5);
			stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
				genesisBlock,
			);
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.tx.batch.mockImplementation(promises => Promise.all(promises));
			const random101DelegateAccounts = new Array(101)
				.fill('')
				.map(() => randomUtils.account());
			stubs.dependencies.storage.entities.Account.get.mockResolvedValue(
				random101DelegateAccounts,
			);
		});

		describe('loadMemTables', () => {
			it('should throw when entities.Block.count fails', async () => {
				expect.assertions(1);
				// Arrange
				const error = new Error('Count Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getOne fails', async () => {
				// Arrange
				const error = new Error('getOne Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw when entities.Block.getUniqueRounds fails', async () => {
				// Arrange
				const error = new Error('getUniqueRounds Error');
				stubs.dependencies.storage.entities.Block.count.mockRejectedValue(
					error,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it.todo('should throw when tx.batch fails');
			it.todo('should not throw when tx.batch succeeds');
		});

		describe('matchGenesisBlock', () => {
			it('should throw an error if the genesis block id is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					id: genesisBlock.id.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block payloadHash is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					payloadHash: genesisBlock.payloadHash.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error if the genesis block signature is different', async () => {
				// Arrange
				const error = new Error('Genesis block does not match');
				const mutatedGenesisBlock = {
					...genesisBlock,
					blockSignature: genesisBlock.blockSignature.replace('0', '1'),
				};
				stubs.dependencies.storage.entities.Block.getOne.mockResolvedValue(
					mutatedGenesisBlock,
				);
				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should not throw when genesis block matches', async () => {
				// Act & Assert
				await expect(blocksInstance.init()).resolves.toEqual();
			});
		});

		describe('reloadRequired', () => {
			// TODO: Add tests or remove the code after the discussion on https://github.com/LiskHQ/lisk-sdk/issues/4130
			it.todo('confirm if it needs tests here');
		});

		describe('loadLastBlock', () => {
			it('should throw an error when Block.get throws error', async () => {
				// Arrange
				const error = 'get error';
				stubs.dependencies.storage.entities.Block.get.mockRejectedValue(error);

				// Act & Assert
				await expect(blocksInstance.init()).rejects.toEqual(error);
			});

			it('should throw an error when Block.get returns empty array', async () => {
				// Arrange
				const errorMessage = 'Failed to load last block';
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.init();
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});
			// TODO: The tests are minimal due to the changes we expect as part of https://github.com/LiskHQ/lisk-sdk/issues/4131
			describe('when Block.get returns rows', () => {
				it('should return the storage read of the first row', async () => {
					// Act
					stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
						genesisBlock,
						newBlock(),
					]);
					await blocksInstance.init();
				});
			});
		});

		it('should initialize the processor', async () => {
			// Act
			await blocksInstance.init();
			// Assert
			expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
		});
	});

	describe('verifyInMemory', () => {
		describe('verifyPreviousBlockId', () => {
			it("should throw when the block is not a genesis block and previous block id doesn't match the last block id", async () => {
				// Arrange
				const block = newBlock({ previousBlock: null });
				const blockBytes = getBytes(block);
				const errorMessage = 'Invalid previous block';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.verifyInMemory({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it("should not throw when previous block property doesn't exist and block height = 1", async () => {
				// Arrange
				const block = cloneDeep(blocksInstance.genesisBlock);
				const blockBytes = getBytes(block);
				block.timestamp = blocksInstance._lastBlock.timestamp + 1000;

				blocksInstance.slots.getEpochTime = jest.fn(
					() => blocksInstance._lastBlock.timestamp + 1010,
				); // It will get assigned to newBlock.receivedAt

				expect.assertions(1);
				// Act
				await expect(
					blocksInstance.verifyInMemory({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toBeUndefined();
			});
		});

		describe('validateBlockSlot', () => {
			it('should throw when block timestamp is in the future', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				const block = newBlock({ timestamp: futureTimestamp });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				const block = newBlock({ timestamp: futureTimestamp });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is equal to the lastBlock timestamp', async () => {
				// Arrange
				const lastBlock = newBlock({});
				const block = newBlock({
					previousBlock: lastBlock.id,
					height: lastBlock.height + 1,
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory({
						block,
						lastBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid block timestamp');
			});
		});

		it('should call verifyBlockForger', async () => {
			// Arrange
			const block = cloneDeep(blocksInstance.genesisBlock);
			const blockBytes = getBytes(block);
			block.timestamp = blocksInstance._lastBlock.timestamp + 1000;

			blocksInstance.slots.getEpochTime = jest.fn(
				() => blocksInstance._lastBlock.timestamp + 1010,
			); // It will get assigned to newBlock.receivedAt

			expect.assertions(1);
			// Act
			await blocksInstance.verifyInMemory({
				block,
				lastBlock: genesisBlock,
				blockBytes,
			});

			// Assert
			expect(blocksInstance.dposModule.verifyBlockForger).toHaveBeenCalled();
		});
	});

	describe('validateDetached', () => {
		let validateTransactionsFn;

		beforeEach(async () => {
			validateTransactionsFn = jest.fn().mockReturnValue({
				transactionsResponses: [],
			});
			transactionsModule.validateTransactions.mockReturnValue(
				validateTransactionsFn,
			);
		});

		describe('validateReward', () => {
			// should not throw if block height === 1? (Where should the test go)
			it('should throw if the expected reward does not match the reward property in block object', async () => {
				// Arrange
				const block = newBlock({ reward: '1' });
				const blockBytes = getBytes(block);
				const errorMessage = 'Invalid block reward: 1 expected: 0';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should not throw if the expected reward does not match the reward property in block object but the block id included in exception', async () => {
				// Arrange
				const block = newBlock({ reward: '1' });
				exceptions.blockRewards = [block.id];
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toBeUndefined();
			});
		});

		describe('validateSignature', () => {
			it('should throw when the block bytes are mutated', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const mutatedBlockBytes = Buffer.from(
					blockBytes.toString('hex').replace('0', '1'),
					'hex',
				);
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes: mutatedBlockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should throw when the block signature is mutated', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithMutatedSignature = {
					...block,
					blockSignature: block.blockSignature.replace('0', '1'),
				};
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validateDetached({
						block: blockWithMutatedSignature,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});

			it('should throw when generator public key is different', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentGeneratorPublicKey = {
					...block,
					generatorPublicKey: randomUtils.account().publicKey,
				};
				const errorMessage = 'Invalid block signature';
				expect.assertions(1);
				// Act
				try {
					await blocksInstance.validateDetached({
						block: blockWithDifferentGeneratorPublicKey,
						lastBlock: genesisBlock,
						blockBytes,
					});
				} catch (error) {
					// Assert
					expect(error.message).toEqual(errorMessage);
				}
			});
		});

		describe('validatePayload', () => {
			it('should throw if the payload size is bigger than maxPayloadLength', async () => {
				// Arrange
				const block = newBlock({
					payloadLength: constants.maxPayloadLength + 1,
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Payload length is too long');
			});

			it('should throw if the transactions array is not equal to numberOfTransactions', async () => {
				// Arrange
				const transactions = new Array(10)
					.fill('')
					.map(() => new TransferTransaction(randomUtils.transaction()));
				const block = newBlock({ numberOfTransactions: 1, transactions });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow(
					'Included transactions do not match block transactions count',
				);
			});

			it('should throw if the transactions array is more than maxTransactionsPerBlock', async () => {
				// Arrange
				const transactions = new Array(constants.maxTransactionsPerBlock + 1)
					.fill('')
					.map(() => new TransferTransaction(randomUtils.transaction()));
				const block = newBlock({ transactions });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Number of transactions exceeds maximum per block');
			});

			it('should throw if there are duplicate transaction ids', async () => {
				// Arrange
				const duplicateTransaction = new TransferTransaction(
					randomUtils.transaction(),
				);
				const block = newBlock({
					numberOfTransactions: 1,
					transactions: [duplicateTransaction, duplicateTransaction],
				});
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow(
					'Included transactions do not match block transactions count',
				);
			});

			it('should throw if the calculated payload hash is not equal to payloadHash property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentPayloadhash = {
					...block,
					payloadHash: block.payloadHash.replace('0', '1'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block: blockWithDifferentPayloadhash,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid payload hash');
			});

			it('should throw if the calculated totalAmount is not equal to totalAmount property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentTotalAmount = {
					...block,
					totalAmount: new BigNum('12'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block: blockWithDifferentTotalAmount,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid total amount');
			});

			it('should throw if the calculated totalFee is not equal to totalFee property in block object', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				const blockWithDifferentTotalAmount = {
					...block,
					totalFee: new BigNum('1'),
				};
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block: blockWithDifferentTotalAmount,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toThrow('Invalid total fee');
			});
		});

		it('should reassign the id property for block object', async () => {
			// Arrange
			const block = newBlock();
			const blockBytes = getBytes(block);
			const originalId = block.id;
			const mutatedId = '123';
			block.id = mutatedId;

			expect.assertions(1);
			// Act & Assert
			await blocksInstance.validateDetached({
				block,
				lastBlock: genesisBlock,
				blockBytes,
			});
			expect(block.id).toEqual(originalId);
		});

		describe('validateTransactions', () => {
			it('should call validateTransactions with expected parameters', async () => {
				// Arrange
				const block = newBlock();
				const blockBytes = getBytes(block);
				expect.assertions(2);
				// Act
				await blocksInstance.validateDetached({
					block,
					lastBlock: genesisBlock,
					blockBytes,
				});
				expect(transactionsModule.validateTransactions).toHaveBeenCalledWith(
					exceptions,
				);
				expect(validateTransactionsFn).toHaveBeenCalledWith(block.transactions);
			});

			it('should throw errors of the first invalid Transaction', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());

				const transactionErrors = [new Error('Invalid signature')];
				const transactionResponseForInvalidTransaction = {
					errors: transactionErrors,
					status: TransactionStatus.FAIL,
				};
				validateTransactionsFn.mockReturnValue({
					transactionsResponses: [transactionResponseForInvalidTransaction],
				});

				const block = newBlock({ transactions: [transaction] });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).rejects.toEqual(transactionErrors);
			});

			it('should not throw when there are no errors', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());

				const transactionResponseForValidTransaction = {
					errors: [],
					status: TransactionStatus.OK,
				};
				validateTransactionsFn.mockReturnValue({
					transactionsResponses: [transactionResponseForValidTransaction],
				});

				const block = newBlock({ transactions: [transaction] });
				const blockBytes = getBytes(block);
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.validateDetached({
						block,
						lastBlock: genesisBlock,
						blockBytes,
					}),
				).resolves.toEqual();
			});
		});
	});

	describe('forkChoice', () => {
		const defaults = {};

		beforeEach(async () => {
			defaults.lastBlock = {
				id: '1',
				height: 1,
				version: 2,
				generatorPublicKey: 'abcdef',
				prevotedConfirmedUptoHeight: 1,
				timestamp: blocksInstance.slots.getEpochTime(Date.now()),
			};

			defaults.newBlock = {
				id: '2',
				height: 2,
				version: 2,
				generatorPublicKey: 'ghijkl',
				prevotedConfirmedUptoHeight: 1,
				timestamp: blocksInstance.slots.getEpochTime(Date.now()),
			};

			// forkChoiceRule.isValidBlock.mockReturnValue(false);
			// forkChoiceRule.isIdenticalBlock.mockReturnValue(false);
			// forkChoiceRule.isDoubleForging.mockReturnValue(false);
			// forkChoiceRule.isTieBreak.mockReturnValue(false);
			// forkChoiceRule.isDifferentChain.mockReturnValue(false);

			blocksInstance._lastBlock = defaults.lastBlock;
		});

		it('should return FORK_STATUS_IDENTICAL_BLOCK if isIdenticalBlock evaluates to true', async () => {
			const aNewBlock = {
				...defaults.newBlock,
				id: defaults.lastBlock.id,
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock: defaults.lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_IDENTICAL_BLOCK);
		});

		it('should return FORK_STATUS_VALID_BLOCK if isValidBlock evaluates to true', async () => {
			const aNewBlock = {
				...defaults.newBlock,
				height: defaults.lastBlock.height + 1,
				previousBlock: defaults.lastBlock.id,
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock: defaults.lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_VALID_BLOCK);
		});

		it('should return FORK_STATUS_DOUBLE_FORGING if isDoubleForging evaluates to true', () => {
			const aNewBlock = {
				...defaults.newBlock,
				height: defaults.lastBlock.height,
				prevotedConfirmedUptoHeight:
					defaults.lastBlock.prevotedConfirmedUptoHeight,
				previousBlock: defaults.lastBlock.previousBlock,
				generatorPublicKey: defaults.lastBlock.generatorPublicKey,
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock: defaults.lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_DOUBLE_FORGING);
		});

		it('should return FORK_STATUS_TIE_BREAK if isTieBreak evaluates to true', () => {
			const aNewBlock = {
				...defaults.newBlock,
				height: defaults.lastBlock.height,
				prevotedConfirmedUptoHeight:
					defaults.lastBlock.prevotedConfirmedUptoHeight,
				previousBlock: defaults.lastBlock.previousBlock,
				timestamp: defaults.lastBlock.timestamp + 1000,
			};

			blocksInstance.slots.getEpochTime = jest.fn(
				() => defaults.lastBlock.timestamp + 1000,
			); // It will get assigned to newBlock.receivedAt

			const lastBlock = {
				...defaults.lastBlock,
				receivedAt: defaults.lastBlock.timestamp + 1000, // Received late
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_TIE_BREAK);
		});

		it('should return FORK_STATUS_DIFFERENT_CHAIN if isDifferentChain evaluates to true', () => {
			const aNewBlock = {
				...defaults.newBlock,
				prevotedConfirmedUptoHeight:
					defaults.lastBlock.prevotedConfirmedUptoHeight,
				height: defaults.lastBlock.height + 1,
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock: defaults.lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_DIFFERENT_CHAIN);
		});

		it('should return FORK_STATUS_DISCARD if no conditions are met', async () => {
			const aNewBlock = {
				...defaults.newBlock,
				height: defaults.lastBlock.height, // This way, none of the conditions are met
			};

			expect(
				blocksInstance.forkChoice({
					block: aNewBlock,
					lastBlock: defaults.lastBlock,
				}),
			).toEqual(forkChoiceRule.FORK_STATUS_DISCARD);
		});
	});

	describe('verify', () => {
		let checkPersistedTransactionsFn;

		beforeEach(async () => {
			checkPersistedTransactionsFn = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 0, errors: [new Error('error')] }],
			});

			transactionsModule.checkPersistedTransactions.mockReturnValue(
				checkPersistedTransactionsFn,
			);

			stubs.dependencies.storage.entities.Block.isPersisted.mockResolvedValue(
				false,
			);
		});

		it('should throw in case the block id exists in the last n blocks', async () => {
			// Arrange
			const block = newBlock();

			const previousLastNBlockIds = blocksInstance._lastNBlockIds;
			blocksInstance._lastNBlockIds = [];
			try {
				// Act
				await blocksInstance.verify({
					block,
					skipExistingCheck: true,
				});
			} catch (e) {
				blocksInstance._lastNBlockIds = previousLastNBlockIds;

				// Assert
				expect(e.message).toEqual('Block already exists in chain');
			}
		});

		it('should throw in case checkPersistedTransactionsFail', async () => {
			// Arrange
			const block = newBlock();

			try {
				// Act
				await blocksInstance.verify({
					block,
					skipExistingCheck: false,
				});
			} catch (e) {
				// Assert
				expect(e[0].message).toBe('error');
			}
		});

		it('should call checkPersistedTransactions with proper arguments', async () => {
			// Arrange
			const block = newBlock();
			const checkPersistedTransactionsFunction = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 1, errors: [] }],
			});

			transactionsModule.checkPersistedTransactions.mockReturnValue(
				checkPersistedTransactionsFunction,
			);

			// Act
			await blocksInstance.verify({
				block,
				skipExistingCheck: false,
			});
			// Assert
			expect(
				transactionsModule.checkPersistedTransactions,
			).toHaveBeenCalledWith(blocksInstance.storage);
			expect(checkPersistedTransactionsFunction).toHaveBeenCalledWith(
				block.transactions,
			);
		});
	});

	describe('apply', () => {
		const stateStore = {
			account: {
				finalize: jest.fn(),
			},
			round: {
				finalize: jest.fn(),
				setRoundForData: jest.fn(),
			},
		};
		let applyTransactionsFn;

		beforeEach(() => {
			applyTransactionsFn = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 1, errors: [] }],
				stateStore,
			});
			transactionsModule.applyTransactions.mockReturnValue(applyTransactionsFn);
		});

		it('should not perform any action if transactions is an empty array', async () => {
			const block = newBlock();
			block.transactions = []; // Block with empty transactions
			await blocksInstance.apply({ block });

			expect(
				transactionsModule.checkIfTransactionIsInert,
			).not.toHaveBeenCalled();
		});
		it('should not call apply transactions for inert transactions', async () => {
			// Arrange
			const block = newBlock();
			transactionsModule.checkIfTransactionIsInert.mockReturnValue(true);

			block.transactions = [
				{
					id: '1234',
				},
			];

			try {
				// Act
				await blocksInstance.apply({
					block,
				});
			} catch (e) {
				// Do nothing
			}

			// Assert
			expect(applyTransactionsFn).toHaveBeenCalledWith([], undefined);
		});
		it('should throw the errors for first unappliable transactions', async () => {
			// Arrange
			const block = newBlock();

			block.transactions = [
				{
					id: '1234',
				},
			];

			applyTransactionsFn = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 0, errors: [new Error('anError')] }],
				stateStore,
			});
			transactionsModule.applyTransactions.mockReturnValue(applyTransactionsFn);

			try {
				// Act
				await blocksInstance.apply({
					block,
				});
			} catch (e) {
				// Assert
				expect(e[0].message).toEqual('anError');
			}
		});
		it('should update account state when transactions are appliable', async () => {
			const block = newBlock();

			try {
				await blocksInstance.apply({
					block,
				});
			} catch (e) {
				// Do nothing
			}

			expect(stateStore.account.finalize).toHaveBeenCalled();
		});
		it('should update round state when transactions are appliable', async () => {
			const block = newBlock();

			try {
				await blocksInstance.apply({
					block,
				});
			} catch (e) {
				// Do nothing
			}
		});
	});

	describe('applyGenesis', () => {
		const stateStore = {
			account: {
				finalize: jest.fn(),
			},
			round: {
				finalize: jest.fn(),
				setRoundForData: jest.fn(),
			},
		};
		let applyGenesisTransactionsFn;

		beforeEach(() => {
			applyGenesisTransactionsFn = jest.fn().mockResolvedValue({
				stateStore,
			});
			transactionsModule.applyGenesisTransactions.mockReturnValue(
				applyGenesisTransactionsFn,
			);
		});

		it('should call transactionsModule.applyGenesisTransactions by sorting transactions', async () => {
			await blocksInstance.applyGenesis({
				block: newBlock(),
			});

			expect(transactionsModule.applyGenesisTransactions).toHaveBeenCalled();
		});

		it('should account state when transactions are appliable', async () => {
			await blocksInstance.applyGenesis({
				block: newBlock(),
			});

			expect(stateStore.account.finalize).toHaveBeenCalled();
		});

		it('should round state when transactions are appliable', async () => {
			await blocksInstance.applyGenesis({
				block: newBlock(),
			});
		});
	});

	describe('undo', () => {
		const stateStore = {
			account: {
				finalize: jest.fn(),
			},
			round: {
				finalize: jest.fn(),
				setRoundForData: jest.fn(),
			},
		};
		let undoTransactionsFn;

		beforeEach(() => {
			undoTransactionsFn = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 1, errors: [] }],
				stateStore,
			});
			transactionsModule.undoTransactions.mockReturnValue(undoTransactionsFn);

			stubs.dependencies.storage.entities.Block.get.mockReturnValue([]);
		});

		it('should not perform any action if transactions is an empty array', async () => {
			// Arrange
			const block = newBlock();
			block.transactions = []; // Empty transactions

			try {
				// Act
				await blocksInstance.undo({
					block: newBlock(),
				});
			} catch (e) {
				// Do nothing here
			}

			// Assert
			expect(transactionsModule.undoTransactions).not.toHaveBeenCalled();
		});

		it('should not call undoTransactions for inert transactions', async () => {
			// Arrange
			const block = newBlock();
			block.transactions = [
				{
					id: '1234',
				},
			];

			blocksInstance.exceptions = {
				...blocksInstance.exceptions,
				inertTransactions: ['1234'],
			};

			try {
				// Act
				await blocksInstance.undo({
					block,
				});
			} catch (e) {
				// Do nothing
			}

			// Assert
			expect(undoTransactionsFn).toHaveBeenCalledWith([], undefined);
		});
		it('should throw the errors for the first transaction which fails on undo function', async () => {
			// Arrange
			const block = newBlock();

			block.transactions = [
				{
					id: '1234',
				},
			];

			undoTransactionsFn = jest.fn().mockResolvedValue({
				transactionsResponses: [{ status: 0, errors: [new Error('anError')] }],
				stateStore,
			});
			transactionsModule.undoTransactions.mockReturnValue(undoTransactionsFn);

			try {
				// Act
				await blocksInstance.undo({
					block,
				});
			} catch (e) {
				// Assert
				expect(e[0].message).toEqual('anError');
			}
		});

		it('should throw an error if previous block is null', async () => {
			try {
				await blocksInstance.undo({
					block: newBlock(),
				});
			} catch (e) {
				expect(e.message).toEqual('PreviousBlock is null');
			}
		});

		it('should update account state when transactions are reverted', async () => {
			const block = newBlock();

			try {
				await blocksInstance.undo({
					block,
				});
			} catch (e) {
				// Do nothing
			}

			expect(stateStore.account.finalize).toHaveBeenCalled();
		});

		it('should update round state when transactions are reverted', async () => {
			const block = newBlock();

			try {
				await blocksInstance.undo({
					block,
				});
			} catch (e) {
				// Do nothing
			}
		});
	});

	describe('save', () => {
		beforeEach(async () => {
			stubs.tx.batch.mockImplementation(promises => Promise.all(promises));
			stubs.dependencies.dposModule.apply = jest.fn().mockResolvedValue();
		});

		describe('when skipSave is set to true', () => {
			it('should not save the block in the database when skipSave is set to true', async () => {
				// Arrange
				const block = newBlock();
				// Act
				await blocksInstance.save({
					block,
					skipSave: true,
					tx: stubs.tx,
				});
				// Assert
				expect(
					stubs.dependencies.storage.entities.Block.create,
				).not.toHaveBeenCalled();
				expect(
					stubs.dependencies.storage.entities.Transaction.create,
				).not.toHaveBeenCalled();
			});

			it('should resolve when dpos module successfully performs apply', async () => {
				// Arrange
				const block = newBlock();

				// Act & Assert
				expect.assertions(2);

				await expect(
					blocksInstance.save({
						block,
						skipSave: true,
						tx: stubs.tx,
					}),
				).resolves.toEqual();

				expect(stubs.dependencies.dposModule.apply).toHaveBeenCalledWith(
					block,
					stubs.tx,
				);
			});

			it('should throw error with error from Dpos module failed to apply', async () => {
				// Arrange
				const block = newBlock();
				const roundsError = new Error('dpos.apply error');
				stubs.dependencies.dposModule.apply.mockRejectedValue(roundsError);

				// Act & Assert
				expect.assertions(2);

				await expect(
					blocksInstance.save({
						block,
						skipSave: true,
						tx: stubs.tx,
					}),
				).rejects.toEqual(roundsError);

				expect(stubs.dependencies.dposModule.apply).toHaveBeenCalledWith(
					block,
					stubs.tx,
				);
			});
		});

		describe('when skipSave is set to false', () => {
			it('should throw error when block create fails', async () => {
				// Arrange
				const block = newBlock();
				const blockCreateError = 'block create error';
				stubs.dependencies.storage.entities.Block.create.mockRejectedValue(
					blockCreateError,
				);
				expect.assertions(1);

				// Act & Assert
				await expect(
					blocksInstance.save({
						block,
						skipSave: false,
						tx: stubs.tx,
					}),
				).rejects.toEqual(blockCreateError);
			});

			it('should throw error when transaction create fails', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				const transactionCreateError = 'transaction create error';
				stubs.dependencies.storage.entities.Transaction.create.mockRejectedValue(
					transactionCreateError,
				);
				expect.assertions(1);

				// Act & Assert
				await expect(
					blocksInstance.save({
						block,
						skipSave: false,
						tx: stubs.tx,
					}),
				).rejects.toEqual(transactionCreateError);
			});

			it('should not perform Dpos apply when save block fails', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				const transactionCreateError = 'transaction create error';
				stubs.dependencies.storage.entities.Transaction.create.mockRejectedValue(
					transactionCreateError,
				);
				expect.assertions(2);

				try {
					// Act
					await blocksInstance.save({
						block,
						skipSave: false,
						tx: stubs.tx,
					});
				} catch (error) {
					// Assert
					expect(error).toEqual(transactionCreateError);
					expect(stubs.dependencies.dposModule.apply).not.toHaveBeenCalled();
				}
			});

			it('should call Block.create with correct parameters', async () => {
				// Arrange
				const block = newBlock({
					reward: new BigNum('0'),
					totolAmount: new BigNum('0'),
					totalFee: new BigNum('0'),
				});
				const blockJson = {
					...block,
					reward: '0',
					totalAmount: '0',
					totalFee: '0',
					previousBlockId: block.previousBlock,
				};
				delete blockJson.previousBlock;
				expect.assertions(1);

				// Act
				await blocksInstance.save({
					block,
					skipSave: false,
					tx: stubs.tx,
				});

				// Assert
				expect(
					stubs.dependencies.storage.entities.Block.create,
				).toHaveBeenCalledWith(blockJson, {}, stubs.tx);
			});

			it('should not call Transaction.create with if block has no transactions', async () => {
				// Arrange
				const block = newBlock();

				// Act
				await blocksInstance.save({
					block,
					skipSave: false,
					tx: stubs.tx,
				});

				// Assert
				expect(
					stubs.dependencies.storage.entities.Transaction.create,
				).not.toHaveBeenCalled();
			});

			it('should call Transaction.create with correct parameters', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				transaction.blockId = block.id;
				const transactionJSON = transaction.toJSON();

				// Act
				await blocksInstance.save({
					block,
					skipSave: false,
					tx: stubs.tx,
				});

				// Assert
				expect(
					stubs.dependencies.storage.entities.Transaction.create,
				).toHaveBeenCalledWith([transactionJSON], {}, stubs.tx);
			});

			it('should resolve when dpos module successfully performs apply', async () => {
				// Arrange
				const block = newBlock();

				// Act & Assert
				expect.assertions(2);

				await expect(
					blocksInstance.save({
						block,
						skipSave: true,
						tx: stubs.tx,
					}),
				).resolves.toEqual();

				return expect(stubs.dependencies.dposModule.apply).toHaveBeenCalledWith(
					block,
					stubs.tx,
				);
			});

			it('should throw error with error from dpos module failed to apply', async () => {
				// Arrange
				const block = newBlock();
				const roundsError = new Error('dpos.apply error');
				stubs.dependencies.dposModule.apply.mockRejectedValue(roundsError);

				expect.assertions(2);

				// Act & Assert
				await expect(
					blocksInstance.save({
						block,
						skipSave: true,
						tx: stubs.tx,
					}),
				).rejects.toEqual(roundsError);

				expect(stubs.dependencies.dposModule.apply).toHaveBeenCalledWith(
					block,
					stubs.tx,
				);
			});
		});
	});

	describe('remove', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.dependencies.storage.entities.Block.delete.mockResolvedValue();
		});

		it('should throw an error when removing genesis block', async () => {
			// Act & Assert
			await expect(
				blocksInstance.remove({
					block: genesisBlock,
					tx: stubs.tx,
				}),
			).rejects.toThrow('Cannot delete genesis block');
		});

		it('should throw an error when previous block does not exist in the database', async () => {
			// Arrange
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([]);
			const block = newBlock();
			// Act & Assert
			await expect(
				blocksInstance.remove({
					block,
					tx: stubs.tx,
				}),
			).rejects.toThrow('PreviousBlock is null');
		});

		it('should throw an error when deleting block fails', async () => {
			// Arrange
			const deleteBlockError = new Error('Delete block failed');
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
				genesisBlock,
			]);
			stubs.dependencies.storage.entities.Block.delete.mockRejectedValue(
				deleteBlockError,
			);
			const block = newBlock();
			// Act & Assert
			await expect(
				blocksInstance.remove({
					block,
					tx: stubs.tx,
				}),
			).rejects.toEqual(deleteBlockError);
		});

		it('should not create entry in temp block table when saveToTemp flag is false', async () => {
			// Arrange
			const block = newBlock();
			// Act
			await blocksInstance.remove({
				block,
				tx: stubs.tx,
			});
			// Assert
			expect(blocksInstance.lastBlock.id).toEqual(genesisBlock.id);
			expect(
				stubs.dependencies.storage.entities.TempBlock.create,
			).not.toHaveBeenCalled();
		});

		describe('when saveToTemp parameter is set to true', () => {
			beforeEach(async () => {
				stubs.dependencies.storage.entities.TempBlock.create.mockResolvedValue();
			});

			it('should throw an error when temp block create function fails', async () => {
				// Arrange
				const tempBlockCreateError = new Error(
					'temp block entry creation failed',
				);
				const block = newBlock();
				stubs.dependencies.storage.entities.TempBlock.create.mockRejectedValue(
					tempBlockCreateError,
				);
				// Act & Assert
				await expect(
					blocksInstance.remove(
						{
							block,
							tx: stubs.tx,
						},
						true,
					),
				).rejects.toEqual(tempBlockCreateError);
			});

			it('should create entry in temp block with correct id, height and block property and tx', async () => {
				// Arrange
				const transaction = new TransferTransaction(randomUtils.transaction());
				const block = newBlock({ transactions: [transaction] });
				transaction.blockId = block.id;
				const transactionJson = transaction.toJSON();
				const blockJson = {
					...block,
					reward: '0',
					totalAmount: '1',
					totalFee: '10000000',
					previousBlockId: block.previousBlock,
					transactions: [transactionJson],
				};
				delete blockJson.previousBlock;
				// Act
				await blocksInstance.remove(
					{
						block,
						tx: stubs.tx,
					},
					true,
				);
				// Assert
				expect(
					stubs.dependencies.storage.entities.TempBlock.create,
				).toHaveBeenCalledWith(
					{
						id: blockJson.id,
						height: blockJson.height,
						fullBlock: blockJson,
					},
					{},
					stubs.tx,
				);
			});
		});
	});

	describe('exists', () => {
		beforeEach(async () => {
			stubs.dependencies.storage.entities.Block.isPersisted.mockResolvedValue(
				true,
			);
		});

		it("should return true if the block doesn't exist", async () => {
			// Arrange
			const block = newBlock();
			expect.assertions(2);
			// Act & Assert
			expect(await blocksInstance.exists(block)).toEqual(true);
			expect(
				stubs.dependencies.storage.entities.Block.isPersisted,
			).toHaveBeenCalledWith({
				id: block.id,
			});
		});

		it('should return false if the block does exist', async () => {
			// Arrange
			stubs.dependencies.storage.entities.Block.isPersisted.mockResolvedValue(
				false,
			);
			const block = newBlock();
			expect.assertions(2);
			// Act & Assert
			expect(await blocksInstance.exists(block)).toEqual(false);
			expect(
				stubs.dependencies.storage.entities.Block.isPersisted,
			).toHaveBeenCalledWith({
				id: block.id,
			});
		});
	});

	describe('filterReadyTransactions', () => {});

	describe('broadcast', () => {
		it('should emit EVENT_BROADCAST_BLOCK event', () => {
			const block = newBlock();
			blocksInstance.broadcast(block);

			expect(blocksInstance.emit).toHaveBeenCalledWith(
				'EVENT_BROADCAST_BLOCK',
				{
					block,
				},
			);
		});
	});

	describe('loadBlocksFromLastBlockId', () => {
		describe('when called without lastBlockId', () => {
			it('should reject with error', async () => {
				expect.assertions(1);
				try {
					await blocksInstance.loadBlocksFromLastBlockId();
				} catch (err) {
					expect(err.message).toBe('lastBlockId needs to be specified');
				}
			});
		});

		describe('when called without limit', () => {
			const validLastBlock = {
				height: 100,
				id: 'block-id',
			};

			beforeEach(async () => {
				stubs.dependencies.storage.entities.Block.get.mockResolvedValue([
					validLastBlock,
				]);
			});

			it('should use limit 1 as default', async () => {
				await blocksInstance.loadBlocksFromLastBlockId('block-id');
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{
						height_gt: 100,
						height_lte: 101,
					},
					{
						extended: true,
						limit: 1,
						sort: ['height'],
					},
				);
			});
		});

		describe('when called with invalid lastBlockId', () => {
			beforeEach(async () => {
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id: 'block-id' })
					.mockResolvedValue([]);
			});

			it('should reject with error', async () => {
				expect.assertions(1);
				try {
					await blocksInstance.loadBlocksFromLastBlockId('block-id');
				} catch (err) {
					expect(err.message).toBe('Invalid lastBlockId requested: block-id');
				}
			});
		});

		describe('when called with valid lastBlockId and limit', () => {
			const validLastBlock = {
				height: 100,
				id: 'block-id',
			};

			const validBlocksFromStorage = [
				{ height: 101, id: 'block-id-1', previousBlockId: 'block-id' },
			];
			const validBlocks = [
				{ height: 101, id: 'block-id-1', previousBlock: 'block-id' },
			];

			beforeEach(async () => {
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith({ id: 'block-id' })
					.mockResolvedValue([validLastBlock]);
				when(stubs.dependencies.storage.entities.Block.get)
					.calledWith(
						{
							height_gt: 100,
							height_lte: 134,
						},
						{
							extended: true,
							limit: 34,
							sort: ['height'],
						},
					)
					.mockResolvedValue(validBlocksFromStorage);
			});

			it('should call storage for the lastBlockId', async () => {
				await blocksInstance.loadBlocksFromLastBlockId('block-id', 34);

				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith({
					id: 'block-id',
				});
			});

			it('should use the storage with correct filter', async () => {
				const blocks = await blocksInstance.loadBlocksFromLastBlockId(
					'block-id',
					34,
				);
				expect(
					stubs.dependencies.storage.entities.Block.get,
				).toHaveBeenCalledWith(
					{
						height_gt: 100,
						height_lte: 134,
					},
					{
						extended: true,
						limit: 34,
						sort: ['height'],
					},
				);
				expect(blocks).toEqual(validBlocks);
			});
		});
	});

	describe('getHighestCommonBlock', () => {
		it('should get the block with highest height from provided ids parameter', async () => {
			// Arrange
			const ids = ['1', '2'];
			const block = newBlock();
			stubs.dependencies.storage.entities.Block.get.mockResolvedValue([block]);

			// Act
			const result = await blocksInstance.getHighestCommonBlock(ids);

			// Assert
			expect(result).toEqual(block);
			expect(
				stubs.dependencies.storage.entities.Block.get,
			).toHaveBeenCalledWith(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);
		});
		it('should throw error if unable to get blocks from the storage', async () => {
			// Arrange
			const ids = ['1', '2'];
			stubs.dependencies.storage.entities.Block.get.mockRejectedValue(
				new Error('anError'),
			);

			try {
				// Act
				await blocksInstance.getHighestCommonBlock(ids);
			} catch (e) {
				// Assert
				expect(e.message).toEqual('Failed to access storage layer');
			}
		});
	});
});
