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
	transfer,
	castVotes,
	TransactionJSON,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { newBlock, getBytes } from '../utils/block';
import { Blocks, StateStore } from '../../src';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';
import { registeredTransactions } from '../utils/registered_transactions';
import { Slots } from '../../src/slots';
import { BlockInstance, ExceptionOptions, Logger } from '../../src/types';

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
	const defaultReward = '0';
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

	let exceptions: ExceptionOptions = {};
	let blocksInstance: Blocks;
	let storageStub: any;
	let loggerStub: Logger;
	let slots: Slots;
	let block: BlockInstance;
	let blockBytes: Buffer;

	beforeEach(async () => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
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
			info: jest.fn(),
			error: jest.fn(),
		};
		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
		});
		exceptions = {};

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
		(blocksInstance as any)._lastBlock = {
			...genesisBlock,
			receivedAt: new Date(),
		};
		block = newBlock();
		blockBytes = getBytes(block);
	});

	describe('#validateBlockHeader', () => {
		describe('when previous block property is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = newBlock({ previousBlockId: undefined, height: 3 });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow('Invalid previous block');
			});
		});
		describe('when signature is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				block = newBlock({ blockSignature: 'aaaa' });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow('Invalid block signature');
			});
		});

		describe('when reward is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				block = newBlock();
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, '5'),
				).toThrow('Invalid block reward');
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
					}) as TransactionJSON,
				);
				(invalidTx as any)._signature = '1234567890';
				block = newBlock({ transactions: [invalidTx] });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow();
			});
		});

		describe('when payload length exceeds maximum allowed', () => {
			it('should throw error', async () => {
				// Arrange
				(blocksInstance as any).constants.maxPayloadLength = 100;
				const txs = new Array(200).fill(0).map((_, v) =>
					blocksInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							recipientId: `${v + 1}L`,
							amount: '100',
							networkIdentifier,
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow('Payload length is too long');
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
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow('Number of transactions exceeds maximum per block');
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
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs, numberOfTransactions: 10 });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow(
					'Included transactions do not match block transactions count',
				);
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
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs, payloadHash: '1234567890' });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toThrow('Invalid payload hash');
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
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					blocksInstance.validateBlockHeader(block, blockBytes, defaultReward),
				).toResolve();
			});
		});
	});

	describe('#verifyInMemory', () => {
		describe('when previous block id is invalid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = newBlock({ previousBlockId: '123' });
				// Act & assert
				await expect(() =>
					blocksInstance.verifyInMemory(block, blocksInstance.lastBlock),
				).toThrow('Invalid previous block');
			});
		});

		describe('when block slot is invalid', () => {
			it('should throw when block timestamp is in the future', async () => {
				// Arrange
				const futureTimestamp = slots.getSlotTime(slots.getNextSlot());
				block = newBlock({ timestamp: futureTimestamp });
				expect.assertions(1);
				// Act & Assert
				await expect(() =>
					blocksInstance.verifyInMemory(block, genesisBlock as any),
				).toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				block = newBlock({ timestamp: 0 });
				expect.assertions(1);
				// Act & Assert
				await expect(() =>
					blocksInstance.verifyInMemory(block, genesisBlock as any),
				).toThrow('Invalid block timestamp');
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
				await expect(() =>
					blocksInstance.verifyInMemory(block, lastBlock),
				).toThrow('Invalid block timestamp');
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
			let txApplySpy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				txApplySpy = jest.spyOn(validTx, 'apply');
				(blocksInstance as any).exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				const stateStore = new StateStore(storageStub);
				await blocksInstance.verify(block, stateStore, {
					skipExistingCheck: true,
				});
			});

			it('should not call blocks entity', async () => {
				expect(storageStub.entities.Block.isPersisted).not.toHaveBeenCalled();
			});

			it('should not call transactions entity', async () => {
				expect(storageStub.entities.Transaction.get).not.toHaveBeenCalled();
			});

			it('should not call apply for the transaction', async () => {
				expect(txApplySpy).not.toHaveBeenCalled();
			});
		});

		describe('when skip existing check is true and a transaction is not allowed', () => {
			let notAllowedTx;
			let txApplySpy: jest.SpyInstance;
			let originalClass: typeof BaseTransaction;

			beforeEach(async () => {
				// Arrage
				notAllowedTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const transactionClass = (blocksInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				originalClass = transactionClass;
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => () => false,
					configurable: true,
				});
				(blocksInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
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
				// Arrange
				const stateStore = new StateStore(storageStub);

				// Act && Assert
				await expect(
					blocksInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					}),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining('is currently not allowed'),
					}),
				]);
				expect(txApplySpy).not.toHaveBeenCalled();
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
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [invalidTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const stateStore = new StateStore(storageStub);

				await expect(
					blocksInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					}),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining(
							'Account does not have enough LSK',
						),
					}),
				]);
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
					}) as TransactionJSON,
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
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const stateStore = new StateStore(storageStub);

				// Act && Assert
				await expect(
					blocksInstance.verify(block, stateStore, {
						skipExistingCheck: false,
					}),
				).rejects.toThrow('already exists');
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
					}) as TransactionJSON,
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTx]);
				block = newBlock({ transactions: [validTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const stateStore = new StateStore(storageStub);

				// Act && Assert
				await expect(
					blocksInstance.verify(block, stateStore, {
						skipExistingCheck: false,
					}),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining(
							'Transaction is already confirmed',
						),
					}),
				]);
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
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(block);
			});
		});

		describe('when transaction is inert', () => {
			let validTx;
			let stateStore;
			let txApplySpy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				txApplySpy = jest.spyOn(validTx, 'apply');
				(blocksInstance as any).exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.apply(block, stateStore);
			});

			it('should not call apply for the transaction', async () => {
				expect(txApplySpy).not.toHaveBeenCalled();
			});

			it('should set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(block);
			});
		});

		describe('when transaction is not applicable', () => {
			let validTx;
			let stateStore: StateStore;

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
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
			});

			it('should throw error', async () => {
				await expect(
					blocksInstance.apply(block, stateStore),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining(
							'Account does not have enough LSK',
						),
					}),
				]);
			});

			it('should not set the block to the last block', async () => {
				expect(blocksInstance.lastBlock).toStrictEqual(genesisBlock);
			});
		});

		describe('when transactions are all valid', () => {
			let stateStore: StateStore;
			let delegate1: any;
			let delegate2: any;
			let validTxApplySpy: jest.SpyInstance;
			let validTx2ApplySpy: jest.SpyInstance;

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
					}) as TransactionJSON,
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				block = newBlock({ transactions: [validTx, validTx2] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.apply(block, stateStore);
			});

			it('should call apply for the transaction', async () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});

			it('should call account update', async () => {
				expect(storageStub.entities.Account.upsert).toHaveBeenCalledTimes(4);
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
					}) as TransactionJSON,
				);
				const nextBlock = newBlock({
					height: blocksInstance.lastBlock.height + 1,
					transactions: [newTx],
				});
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
		let stateStore: StateStore;
		let genesisInstance: BlockInstance;

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
				expect(storageStub.entities.Account.upsert).toHaveBeenCalledTimes(103);
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
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});
		});

		describe('when transaction is inert', () => {
			let validTx;
			let stateStore;
			let txUndoSpy: jest.SpyInstance;

			beforeEach(async () => {
				// Arrage
				validTx = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				txUndoSpy = jest.spyOn(validTx, 'undo');
				(blocksInstance as any).exceptions.inertTransactions = [validTx.id];
				block = newBlock({ transactions: [validTx] });
				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.undo(block, stateStore);
			});

			it('should not call undo for the transaction', async () => {
				expect(txUndoSpy).not.toHaveBeenCalled();
			});
		});

		describe('when transactions are all valid', () => {
			let stateStore: StateStore;
			let delegate1: any;
			let delegate2: any;
			let validTxUndoSpy: jest.SpyInstance;
			let validTx2UndoSpy: jest.SpyInstance;

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
					}) as TransactionJSON,
				);
				const validTx2 = blocksInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				validTxUndoSpy = jest.spyOn(validTx, 'undo');
				validTx2UndoSpy = jest.spyOn(validTx2, 'undo');
				block = newBlock({ transactions: [validTx, validTx2] });

				// Act
				stateStore = new StateStore(storageStub);
				await blocksInstance.undo(block, stateStore);
			});

			it('should call undo for the transaction', async () => {
				expect(validTxUndoSpy).toHaveBeenCalledTimes(1);
				expect(validTx2UndoSpy).toHaveBeenCalledTimes(1);
			});

			it('should call account update', async () => {
				expect(storageStub.entities.Account.upsert).toHaveBeenCalledTimes(4);
			});

			it('should update vote weight on voted delegate', async () => {
				expect(stateStore.account.get(delegate1.address).voteWeight).toBe('0');
				expect(stateStore.account.get(delegate2.address).voteWeight).toBe('0');
			});
		});
	});
});
