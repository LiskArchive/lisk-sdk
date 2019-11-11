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

const { transfer, castVotes } = require('@liskhq/lisk-transactions');
const { getNetworkIdentifier } = require('@liskhq/lisk-cryptography');
const { newBlock, getBytes } = require('./utils.js');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');
const {
	Blocks,
	StateStore,
} = require('../../../../../../../src/modules/chain/blocks');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
const { genesisAccount } = require('./default_account');
const {
	registeredTransactions,
} = require('../../../../../utils/registered_transactions');

jest.mock('events');

describe('blocks/header', () => {
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
	const defaultReward = 0;
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

	let exceptions = {};
	let blocksInstance;
	let storageStub;
	let loggerStub;
	let slots;
	let block;
	let blockBytes;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
					update: jest.fn(),
					upsert: jest.fn(),
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
					get: jest.fn(),
					create: jest.fn(),
				},
				TempBlock: {
					create: jest.fn(),
					delete: jest.fn(),
					get: jest.fn(),
				},
			},
		};
		loggerStub = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};
		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
			blocksPerRound: constants.activeDelegates,
		});
		exceptions = {
			transactions: [],
		};

		blocksInstance = new Blocks({
			storage: storageStub,
			logger: loggerStub,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			slots,
			exceptions,
			...constants,
		});
		blocksInstance._lastBlock = {
			...genesisBlock,
			receivedAt: new Date(),
		};
		block = newBlock();
		blockBytes = getBytes(block);
	});

	describe('#validateBlockHeader', () => {
		describe('when previous block property is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				block = newBlock({ previousBlockId: undefined, height: 3 });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain('Invalid previous block');
				}
			});
		});
		describe('when signature is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				block = newBlock({ blockSignature: 'aaaa' });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain('Invalid block signature');
				}
			});
		});

		describe('when reward is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				block = newBlock();
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(block, blockBytes, 5);
				} catch (error) {
					expect(error.message).toContain('Invalid block reward');
				}
			});
		});

		describe('when a transaction included is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				invalidTx._signature = '1234567890';
				block = newBlock({ transactions: [invalidTx] });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (errors) {
					expect(errors).toHaveLength(1);
				}
			});
		});

		describe('when payload length exceeds maximum allowed', () => {
			it('should throw error', async () => {
				// Arrange
				blocksInstance.constants.maxPayloadLength = 100;
				const txs = new Array(200).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}),
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain('Payload length is too long');
				}
			});
		});

		describe('when exceeds maximum transactions per block', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(30).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}),
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain(
						'Number of transactions exceeds maximum per block',
					);
				}
			});
		});

		describe('when numberOfTransactions is incorrect', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}),
					),
				);
				block = newBlock({ transactions: txs, numberOfTransactions: 10 });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain(
						'Included transactions do not match block transactions count',
					);
				}
			});
		});

		describe('when payload hash is incorrect', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}),
					),
				);
				block = newBlock({ transactions: txs, payloadHash: '1234567890' });
				blockBytes = getBytes(block);
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					expect(error.message).toContain('Invalid payload hash');
				}
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}),
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				let err;
				try {
					await blocksInstance.validateBlockHeader(
						block,
						blockBytes,
						defaultReward,
					);
				} catch (error) {
					err = error;
				}
				expect(err).toBeUndefined();
			});
		});
	});

	describe('#verifyInMemory', () => {
		describe('when previous block id is invalid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = newBlock({ previousBlockId: '123' });
				// Act & assert
				expect.assertions(1);
				try {
					await blocksInstance.verifyInMemory(block, blocksInstance.lastBlock);
				} catch (error) {
					expect(error.message).toContain('Invalid previous block');
				}
			});
		});

		describe('when block slot is invalid', () => {
			it('should throw when block timestamp is in the future', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				block = newBlock({ timestamp: futureTimestamp });
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory(block, genesisBlock),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				block = newBlock({ timestamp: 0 });
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory(block, genesisBlock),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is equal to the lastBlock timestamp', async () => {
				// Arrange
				const lastBlock = newBlock({});
				block = newBlock({
					previousBlockId: lastBlock.id,
					height: lastBlock.height + 1,
				});
				expect.assertions(1);
				// Act & Assert
				await expect(
					blocksInstance.verifyInMemory(block, lastBlock),
				).rejects.toThrow('Invalid block timestamp');
			});
		});

		describe('when all values are valid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = newBlock();
				// Act & assert
				let err;
				try {
					await blocksInstance.verifyInMemory(block, blocksInstance.lastBlock);
				} catch (error) {
					err = error;
				}
				expect(err).toBeUndefined();
			});
		});
	});

	describe('#verify', () => {
		describe('when skip existing check is true and a transaction is inert', () => {
			let validTx;
			let txApplySpy;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				txApplySpy = jest.spyOn(validTx, 'apply');
				blocksInstance.exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				const stateStore = new StateStore(storageStub);
				await blocksInstance.verify(block, stateStore, {
					skipExistingCheck: true,
				});
			});

			it('should not call blocks entity', async () => {
				expect(storageStub.entities.Block.isPersisted).not.toBeCalled();
			});

			it('should not call transactions entity', async () => {
				expect(storageStub.entities.Transaction.get).not.toBeCalled();
			});

			it('should not call apply for the transaction', async () => {
				expect(txApplySpy).not.toBeCalled();
			});
		});

		describe('when skip existing check is true and a transaction is not allowed', () => {
			let notAllowedTx;
			let txApplySpy;
			let originalClass;

			beforeEach(async () => {
				// Arrage
				notAllowedTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				const transactionClass = blocksInstance._transactionAdapter.transactionClassMap.get(
					notAllowedTx.type,
				);
				originalClass = transactionClass;
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				blocksInstance._transactionAdapter.transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				txApplySpy = jest.spyOn(notAllowedTx, 'apply');
				block = newBlock({ transactions: [notAllowedTx] });
			});

			afterEach(async () => {
				Object.defineProperty(originalClass.prototype, 'matcher', {
					get: () => () => true,
					configurable: true,
				});
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);
				try {
					await blocksInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					});
				} catch (errors) {
					expect(errors).not.toBeEmpty();
					expect(errors[0].message).toContain('is currently not allowed');
				}
				expect(txApplySpy).not.toBeCalled();
			});
		});

		describe('when skip existing check is true and a transaction is not verifiable', () => {
			let invalidTx;

			beforeEach(async () => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '0' },
				]);
				invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				block = newBlock({ transactions: [invalidTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);
				expect.assertions(2);
				try {
					await blocksInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					});
				} catch (errors) {
					expect(errors).not.toBeEmpty();
					expect(errors[0].message).toContain(
						'Account does not have enough LSK',
					);
				}
			});
		});

		describe('when skip existing check is true and transactions are valid', () => {
			let invalidTx;

			beforeEach(async () => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				invalidTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				block = newBlock({ transactions: [invalidTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);
				let err;
				try {
					await blocksInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					});
				} catch (errors) {
					err = errors;
				}
				expect(err).toBeUndefined();
			});
		});

		describe('when skip existing check is false and block exists in database', () => {
			beforeEach(async () => {
				// Arrage
				storageStub.entities.Block.isPersisted.mockResolvedValue(true);
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				block = newBlock({ transactions: [validTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);
				expect.assertions(1);
				try {
					await blocksInstance.verify(block, stateStore, {
						skipExistingCheck: false,
					});
				} catch (error) {
					expect(error.message).toContain('already exists');
				}
			});
		});

		describe('when skip existing check is false and block does not exist in database but transaction does', () => {
			beforeEach(async () => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				const validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTx]);
				block = newBlock({ transactions: [validTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);
				expect.assertions(1);
				try {
					await blocksInstance.verify(block, stateStore, {
						skipExistingCheck: false,
					});
				} catch (errors) {
					expect(errors[0].message).toContain(
						'Transaction is already confirmed',
					);
				}
			});
		});
	});

	describe('#apply', () => {
		describe('when block does not contain transactions', () => {
			let stateStore;

			beforeEach(async () => {
				stateStore = new StateStore(storageStub);
				// Arrage
				block = newBlock();
				await blocksInstance.apply(block, stateStore);
			});

			it('should not call account update', async () => {
				expect(storageStub.entities.Account.upsert).not.toBeCalled();
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(block);
			});
		});

		describe('when transaction is inert', () => {
			let validTx;
			let stateStore;
			let txApplySpy;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				txApplySpy = jest.spyOn(validTx, 'apply');
				blocksInstance.exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.apply(block, stateStore);
			});

			it('should not call apply for the transaction', async () => {
				expect(txApplySpy).not.toBeCalled();
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(block);
			});
		});

		describe('when transaction is not applicable', () => {
			let validTx;
			let stateStore;

			beforeEach(async () => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '0' },
				]);
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
			});

			it('should throw error', async () => {
				expect.assertions(2);
				try {
					await blocksInstance.apply(block, stateStore);
				} catch (errors) {
					expect(errors).not.toBeEmpty();
					expect(errors[0].message).toContain(
						'Account does not have enough LSK',
					);
				}
			});

			it('should not set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(genesisBlock);
			});
		});

		describe('when transactions are all valid', () => {
			let stateStore;
			let delegate1;
			let delegate2;
			let validTxApplySpy;
			let validTx2ApplySpy;

			beforeEach(async () => {
				// Arrage
				delegate1 = {
					address: '8411848252534809650L',
					passphrase:
						'weapon visual tag seed deal solar country toy boring concert decline require',
					publicKey:
						'8c4dddbfe40892940d3bd5446d9d2ee9cdd16ceffecebda684a0585837f60f23',
					username: 'genesis_200',
					balance: '10000000000',
					voteWeight: '0',
				};
				delegate2 = {
					address: '13608682259919656227L',
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						'6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799',
					username: 'genesis_201',
					balance: '10000000000',
					voteWeight: '0',
				};
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: genesisAccount.address,
						balance: '10000000000',
						votedPublicKeys: [delegate1.publicKey, delegate2.publicKey],
					},
					delegate1,
					delegate2,
				]);
				// Act
				const validTx = blocksInstance.deserializeTransaction(
					castVotes({
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [delegate1.publicKey, delegate2.publicKey],
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				block = newBlock({ transactions: [validTx, validTx2] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.apply(block, stateStore);
			});

			it('should call apply for the transaction', async () => {
				expect(validTxApplySpy).toBeCalledTimes(1);
				expect(validTx2ApplySpy).toBeCalledTimes(1);
			});

			it('should call account update', async () => {
				expect(storageStub.entities.Account.upsert).toBeCalledTimes(4);
			});

			it('should update vote weight on voted delegate', async () => {
				expect(stateStore.account.get(delegate1.address).voteWeight).toBe(
					'9889999900',
				);
				expect(stateStore.account.get(delegate2.address).voteWeight).toBe(
					'9889999900',
				);
			});

			it('should update vote weight on sender and recipient', async () => {
				const newTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: genesisAccount.address,
						amount: '100',
						networkIdentifier,
					}),
				);
				const nextBlock = newBlock({ transactions: [newTx] });
				await blocksInstance.apply(nextBlock, stateStore);
				// expect
				// it should decrease by fee
				expect(stateStore.account.get(delegate1.address).voteWeight).toBe(
					'9879999900',
				);
				expect(stateStore.account.get(delegate2.address).voteWeight).toBe(
					'9879999900',
				);
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(block);
			});
		});
	});

	describe('#applyGenesis', () => {
		let stateStore;
		let genesisInstance;

		beforeEach(async () => {
			// Arrage
			storageStub.entities.Account.get.mockResolvedValue([]);
			// Act
			genesisInstance = blocksInstance.deserialize(genesisBlock);
			// Act
			stateStore = new StateStore(storageStub);
			await blocksInstance.applyGenesis(genesisInstance, stateStore);
		});

		describe('when transactions are all valid', () => {
			it('should call apply for the transaction', async () => {
				expect(stateStore.account.get(genesisAccount.address).balance).toBe(
					'10000000000000000',
				);
			});

			it('should call account update', async () => {
				expect(storageStub.entities.Account.upsert).toBeCalledTimes(103);
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(genesisInstance);
			});
		});
	});

	describe('#undo', () => {
		describe('when block does not contain transactions', () => {
			let stateStore;

			beforeEach(async () => {
				stateStore = new StateStore(storageStub);
				// Arrage
				block = newBlock();
				await blocksInstance.undo(block, stateStore);
			});

			it('should not call account update', async () => {
				expect(storageStub.entities.Account.upsert).not.toBeCalled();
			});
		});

		describe('when transaction is inert', () => {
			let validTx;
			let stateStore;
			let txUndoSpy;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}),
				);
				txUndoSpy = jest.spyOn(validTx, 'undo');
				blocksInstance.exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.undo(block, stateStore);
			});

			it('should not call undo for the transaction', async () => {
				expect(txUndoSpy).not.toBeCalled();
			});
		});

		describe('when transactions are all valid', () => {
			let stateStore;
			let delegate1;
			let delegate2;
			let validTxUndoSpy;
			let validTx2UndoSpy;

			beforeEach(async () => {
				// Arrage
				delegate1 = {
					address: '8411848252534809650L',
					passphrase:
						'weapon visual tag seed deal solar country toy boring concert decline require',
					publicKey:
						'8c4dddbfe40892940d3bd5446d9d2ee9cdd16ceffecebda684a0585837f60f23',
					username: 'genesis_200',
					balance: '10000000000',
					voteWeight: '9889999900',
				};
				delegate2 = {
					address: '13608682259919656227L',
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						'6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799',
					username: 'genesis_201',
					balance: '10000000000',
					voteWeight: '9889999900',
				};
				const recipient = {
					address: '124L',
					balance: '100',
				};
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: genesisAccount.address,
						balance: '9889999900',
						votedDelegatesPublicKeys: [
							delegate1.publicKey,
							delegate2.publicKey,
						],
					},
					delegate1,
					delegate2,
					recipient,
				]);
				const validTx = blocksInstance.deserializeTransaction(
					castVotes({
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [delegate1.publicKey, delegate2.publicKey],
					}),
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}),
				);
				validTxUndoSpy = jest.spyOn(validTx, 'undo');
				validTx2UndoSpy = jest.spyOn(validTx2, 'undo');
				block = newBlock({ transactions: [validTx, validTx2] });

				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.undo(block, stateStore);
			});

			it('should call undo for the transaction', async () => {
				expect(validTxUndoSpy).toBeCalledTimes(1);
				expect(validTx2UndoSpy).toBeCalledTimes(1);
			});

			it('should call account update', async () => {
				expect(storageStub.entities.Account.upsert).toBeCalledTimes(4);
			});

			it('should update vote weight on voted delegate', async () => {
				expect(stateStore.account.get(delegate1.address).voteWeight).toBe('0');
				expect(stateStore.account.get(delegate2.address).voteWeight).toBe('0');
			});
		});
	});
});
