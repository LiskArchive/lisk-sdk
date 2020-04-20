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
import {
	transfer,
	castVotes,
	TransactionJSON,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import {
	getNetworkIdentifier,
	getAddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import { newBlock, getBytes, defaultNetworkIdentifier } from '../utils/block';
import { Chain, StateStore } from '../../src';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';
import { registeredTransactions } from '../utils/registered_transactions';
import { Slots } from '../../src/slots';
import { BlockInstance } from '../../src/types';
import { CHAIN_STATE_BURNT_FEE } from '../../src/constants';

jest.mock('events');

describe('blocks/header', () => {
	const constants = {
		maxPayloadLength: 15 * 1024,
		activeDelegates: 101,
		rewardDistance: 3000000,
		rewardOffset: 2160,
		rewardMilestones: [
			'500000000', // Initial Reward
			'400000000', // Milestone 1
			'300000000', // Milestone 2
			'200000000', // Milestone 3
			'100000000', // Milestone 4
		],
		totalAmount: '10000000000000000',
		blockTime: 10,
		epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
	};
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

	let chainInstance: Chain;
	let storageStub: any;
	let slots: Slots;
	let block: BlockInstance;
	let blockBytes: Buffer;

	beforeEach(() => {
		storageStub = {
			entities: {
				Account: {
					get: jest.fn(),
					upsert: jest.fn(),
					getOne: jest.fn(),
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
				ChainState: {
					get: jest.fn(),
					getKey: jest.fn(),
					setKey: jest.fn(),
				},
				TempBlock: {
					create: jest.fn(),
					delete: jest.fn(),
					get: jest.fn(),
				},
			},
		};

		slots = new Slots({
			epochTime: constants.epochTime,
			interval: constants.blockTime,
		});

		chainInstance = new Chain({
			storage: storageStub,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
			slots,
			...constants,
		});
		(chainInstance as any)._lastBlock = {
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
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow('Invalid previous block');
			});
		});

		describe('when signature is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = newBlock({ blockSignature: 'aaaa' });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow('Invalid block signature');
			});
		});

		describe('when reward is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = newBlock({ reward: BigInt(1000000000) });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow('Invalid block reward');
			});
		});

		describe('when a transaction included is invalid', () => {
			it('should throw error', () => {
				// Arrange
				const invalidTx = chainInstance.deserializeTransaction(
					transfer({
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						fee: '10000000',
						nonce: '0',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				(invalidTx as any).signatures = ['1234567890'];
				block = newBlock({ transactions: [invalidTx] });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow();
			});
		});

		describe('when payload length exceeds maximum allowed', () => {
			it('should throw error', () => {
				// Arrange
				(chainInstance as any).constants.maxPayloadLength = 100;
				const txs = new Array(200).fill(0).map((_, v) =>
					chainInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							fee: '10000000',
							nonce: '0',
							recipientId: `${(v + 1).toString()}L`,
							amount: '100',
							networkIdentifier,
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow('Payload length is too long');
			});
		});

		describe('when payload hash is incorrect', () => {
			it('should throw error', () => {
				// Arrange
				const txs = new Array(20).fill(0).map((_, v) =>
					chainInstance.deserializeTransaction(
						transfer({
							fee: '10000000',
							nonce: '0',
							passphrase: genesisAccount.passphrase,
							recipientId: `${(v + 1).toString()}L`,
							amount: '100',
							networkIdentifier,
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs, payloadHash: '1234567890' });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).toThrow('Invalid payload hash');
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', () => {
				// Arrange
				const txs = new Array(20).fill(0).map((_, v) =>
					chainInstance.deserializeTransaction(
						transfer({
							fee: '10000000',
							nonce: '0',
							passphrase: genesisAccount.passphrase,
							recipientId: `${(v + 1).toString()}L`,
							amount: '100',
							networkIdentifier,
						}) as TransactionJSON,
					),
				);
				block = newBlock({ transactions: txs });
				blockBytes = getBytes(block);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block, blockBytes),
				).not.toThrow();
			});
		});
	});

	describe('#verify', () => {
		let stateStore: StateStore;

		beforeEach(() => {
			// Arrange
			stateStore = new StateStore(storageStub, {
				lastBlockHeaders: [],
				networkIdentifier: defaultNetworkIdentifier,
				lastBlockReward: BigInt(500000000),
			});
		});

		describe('when previous block id is invalid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = newBlock({ previousBlockId: '123' });
				// Act & assert
				await expect(
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
				).rejects.toThrow('Invalid previous block');
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
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				block = newBlock({ timestamp: 0 });
				expect.assertions(1);
				// Act & Assert
				await expect(
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is equal to the lastBlock timestamp', async () => {
				(chainInstance as any)._lastBlock = {
					...genesisBlock,
					timestamp: 200,
					receivedAt: new Date(),
				};
				// Arrange
				block = newBlock({
					previousBlockId: chainInstance.lastBlock.id,
					height: chainInstance.lastBlock.height + 1,
					timestamp: chainInstance.lastBlock.timestamp - 10,
				});
				// Act & Assert
				await expect(
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
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
					await chainInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					});
				} catch (error) {
					err = error;
				}
				expect(err).toBeUndefined();
			});
		});

		describe('when skip existing check is true and a transaction is not allowed', () => {
			let notAllowedTx;
			let txApplySpy: jest.SpyInstance;
			let originalClass: typeof BaseTransaction;

			beforeEach(() => {
				// Arrage
				notAllowedTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				const transactionClass = (chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.get(
					notAllowedTx.type,
				);
				originalClass = transactionClass;
				Object.defineProperty(transactionClass.prototype, 'matcher', {
					get: () => (): boolean => false,
					configurable: true,
				});
				(chainInstance as any).dataAccess._transactionAdapter._transactionClassMap.set(
					notAllowedTx.type,
					transactionClass,
				);
				txApplySpy = jest.spyOn(notAllowedTx, 'apply');
				block = newBlock({ transactions: [notAllowedTx] });
			});

			afterEach(() => {
				Object.defineProperty(originalClass.prototype, 'matcher', {
					get: () => (): boolean => true,
					configurable: true,
				});
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});

				// Act && Assert
				await expect(
					chainInstance.verify(block, stateStore, {
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

		describe('when skip existing check is true and transactions are valid', () => {
			let invalidTx;

			beforeEach(() => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				invalidTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
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
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				expect.assertions(1);
				let err;
				try {
					await chainInstance.verify(block, stateStore, {
						skipExistingCheck: true,
					});
				} catch (errors) {
					err = errors;
				}
				expect(err).toBeUndefined();
			});
		});

		describe('when skip existing check is false and block exists in database', () => {
			beforeEach(() => {
				// Arrage
				storageStub.entities.Block.isPersisted.mockResolvedValue(true);
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
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
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});

				// Act && Assert
				await expect(
					chainInstance.verify(block, stateStore, {
						skipExistingCheck: false,
					}),
				).rejects.toThrow('already exists');
			});
		});

		describe('when skip existing check is false and block does not exist in database but transaction does', () => {
			beforeEach(() => {
				// Arrage
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '100000000000000' },
				]);
				const validTxJSON = transfer({
					fee: '10000000',
					nonce: '0',
					passphrase: genesisAccount.passphrase,
					recipientId: '123L',
					amount: '100',
					networkIdentifier,
				});
				const validTx = chainInstance.deserializeTransaction(
					validTxJSON as TransactionJSON,
				);
				storageStub.entities.Transaction.get.mockResolvedValue([validTxJSON]);
				block = newBlock({ transactions: [validTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});

				// Act && Assert
				await expect(
					chainInstance.verify(block, stateStore, {
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
			let stateStore: StateStore;

			beforeEach(async () => {
				block = newBlock({ reward: BigInt(500000000) });
				storageStub.entities.Account.get.mockResolvedValue([
					{ address: genesisAccount.address, balance: '0' },
					{
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: '0',
					},
				]);
				storageStub.entities.ChainState.getKey.mockResolvedValue('100');
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				await stateStore.account.cache({
					// eslint-disable-next-line camelcase
					address_in: [
						genesisAccount.address,
						getAddressFromPublicKey(block.generatorPublicKey),
					],
				});
				// Arrage
				await chainInstance.apply(block, stateStore);
			});

			it('should update generator balance to give rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				expect(generator.balance).toEqual(block.reward);
			});

			it('should not have updated burnt fee', () => {
				expect(storageStub.entities.ChainState.getKey).not.toHaveBeenCalled();
			});
		});

		describe('when transaction is not applicable', () => {
			let validTx;
			let stateStore: StateStore;

			beforeEach(async () => {
				// Arrage
				validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '123L',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: '0',
					},
					{ address: genesisAccount.address, balance: '0' },
				]);
				// Act
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				await stateStore.account.cache({
					// eslint-disable-next-line camelcase
					address_in: [genesisAccount.address],
				});
			});

			it('should throw error', async () => {
				await expect(
					chainInstance.apply(block, stateStore),
				).rejects.toMatchObject([
					expect.objectContaining({
						message: expect.stringContaining(
							'Account does not have enough minimum remaining LSK',
						),
					}),
				]);
			});

			it('should not set the block to the last block', () => {
				expect(chainInstance.lastBlock).toStrictEqual(genesisBlock);
			});
		});

		describe('when transactions are all valid', () => {
			const defaultBurntFee = '100';

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
				};
				delegate2 = {
					address: '13608682259919656227L',
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						'6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799',
					username: 'genesis_201',
					balance: '10000000000',
				};

				// Act
				const validTx = chainInstance.deserializeTransaction(
					castVotes({
						fee: '100000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: '10000000000',
							},
							{
								delegateAddress: delegate2.address,
								amount: '10000000000',
							},
						],
					}) as TransactionJSON,
				);
				// Calling validate to inject id and min-fee
				validTx.validate();
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '1',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				// Calling validate to inject id and min-fee
				validTx2.validate();
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				block = newBlock({
					reward: BigInt(500000000),
					transactions: [validTx, validTx2],
				});
				when(storageStub.entities.Account.get)
					.mockResolvedValue([
						{
							address: getAddressFromPublicKey(block.generatorPublicKey),
							balance: '0',
							producedBlocks: 0,
							nonce: '0',
						},
						{
							address: genesisAccount.address,
							balance: '1000000000000',
							nonce: '0',
						},
						delegate1,
						delegate2,
					] as never)
					.calledWith({ address: '124L' })
					.mockResolvedValue([] as never);
				storageStub.entities.ChainState.getKey.mockResolvedValue(
					defaultBurntFee,
				);
				// Act
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				await chainInstance.apply(block, stateStore);
			});

			it('should call apply for the transaction', () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});

			it('should not call account update', () => {
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});

			it('should add produced block for generator', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				expect(generator.producedBlocks).toEqual(1);
			});

			it('should update generator balance with rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				let expected = block.reward;
				for (const tx of block.transactions) {
					expected += tx.fee - tx.minFee;
				}
				expect(generator.balance.toString()).toEqual(expected.toString());
			});

			it('should update burntFee in the chain state', async () => {
				const burntFee = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
				let expected = BigInt(0);
				for (const tx of block.transactions) {
					expected += tx.minFee;
				}
				expect(burntFee).toEqual(
					(BigInt(defaultBurntFee) + expected).toString(),
				);
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
			genesisInstance = chainInstance.deserialize(genesisBlock);
			genesisInstance.transactions.forEach(tx => tx.validate());
			// Act
			stateStore = new StateStore(storageStub, {
				lastBlockHeaders: [],
				networkIdentifier: defaultNetworkIdentifier,
				lastBlockReward: BigInt(500000000),
			});
			await chainInstance.applyGenesis(genesisInstance, stateStore);
		});

		describe('when transactions are all valid', () => {
			it('should call apply for the transaction', async () => {
				const genesisAccountFromStore = await stateStore.account.get(
					genesisAccount.address,
				);
				expect(genesisAccountFromStore.balance).toBe(
					// Genesis account now sends funds to the genesis delegates
					BigInt('9897000000000000'),
				);
			});

			it('should not call account update', () => {
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});

			it('should not update burnt fee on chain state', async () => {
				const genesisAccountFromStore = await stateStore.chain.get(
					CHAIN_STATE_BURNT_FEE,
				);
				expect(genesisAccountFromStore).toBe('0');
			});
		});
	});

	describe('#undo', () => {
		const reward = BigInt('500000000');

		describe('when block does not contain transactions', () => {
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				// Arrage
				block = newBlock({ reward });
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: reward.toString(),
					},
					{ address: genesisAccount.address, balance: '0' },
				]);
				await chainInstance.undo(block, stateStore);
			});

			it('should not call account update', () => {
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});

			it('should update generator balance to debit rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				expect(generator.balance.toString()).toEqual('0');
			});

			it('should not deduct burntFee from chain state', () => {
				expect(storageStub.entities.ChainState.getKey).not.toHaveBeenCalled();
			});
		});

		describe('when transactions are all valid', () => {
			const defaultGeneratorBalance = BigInt(800000000);
			const defaultBurntFee = BigInt(400000);
			const defaultReward = BigInt(500000000);

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
				};
				delegate2 = {
					address: '13608682259919656227L',
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						'6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799',
					username: 'genesis_201',
					balance: '10000000000',
				};
				const recipient = {
					address: '124L',
					balance: '100',
				};

				const validTx = chainInstance.deserializeTransaction(
					castVotes({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						networkIdentifier,
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: '10000000000',
							},
							{
								delegateAddress: delegate2.address,
								amount: '10000000000',
							},
						],
					}) as TransactionJSON,
				);
				// Calling validate to inject id and min-fee
				validTx.validate();
				const validTx2 = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '124L',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				// Calling validate to inject id and min-fee
				validTx2.validate();
				validTxUndoSpy = jest.spyOn(validTx, 'undo');
				validTx2UndoSpy = jest.spyOn(validTx2, 'undo');
				block = newBlock({
					reward: BigInt(defaultReward),
					transactions: [validTx, validTx2],
				});
				storageStub.entities.Account.get.mockResolvedValue([
					{
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: defaultGeneratorBalance.toString(),
						producedBlocks: 1,
					},
					{
						address: genesisAccount.address,
						balance: '9889999900',
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: '10000000000',
							},
							{
								delegateAddress: delegate2.address,
								amount: '10000000000',
							},
						],
					},
					delegate1,
					delegate2,
					recipient,
				]);
				storageStub.entities.ChainState.getKey.mockResolvedValue(
					defaultBurntFee.toString(),
				);

				// Act
				stateStore = new StateStore(storageStub, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				await chainInstance.undo(block, stateStore);
			});

			it('should call undo for the transaction', () => {
				expect(validTxUndoSpy).toHaveBeenCalledTimes(1);
				expect(validTx2UndoSpy).toHaveBeenCalledTimes(1);
			});

			it('should not call account update', () => {
				expect(storageStub.entities.Account.upsert).not.toHaveBeenCalled();
			});

			it('should reduce produced block for generator', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				expect(generator.producedBlocks).toEqual(0);
			});

			it('should debit generator balance with rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				let expected = block.reward;
				for (const tx of block.transactions) {
					expected += tx.fee - tx.minFee;
				}
				expect(generator.balance.toString()).toEqual(
					(defaultGeneratorBalance - expected).toString(),
				);
			});

			it('should debit burntFee in the chain state', async () => {
				const burntFee = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
				let expected = BigInt(0);
				for (const tx of block.transactions) {
					expected += tx.minFee;
				}
				expect(burntFee).toEqual(
					(BigInt(defaultBurntFee) - expected).toString(),
				);
			});
		});
	});
});
