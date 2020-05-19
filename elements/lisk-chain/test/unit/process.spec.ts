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
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import {
	transfer,
	castVotes,
	TransactionJSON,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import {
	getNetworkIdentifier,
	getAddressFromPublicKey,
	getRandomBytes,
	bufferToHex,
} from '@liskhq/lisk-cryptography';
import { newBlock, getBytes, defaultNetworkIdentifier } from '../utils/block';
import { Chain } from '../../src/chain';
import { StateStore } from '../../src/state_store';
import { DataAccess } from '../../src/data_access';
import * as genesisBlock from '../fixtures/genesis_block.json';
import { genesisAccount } from '../fixtures/default_account';
import { registeredTransactions } from '../utils/registered_transactions';
import { BlockInstance } from '../../src/types';
import { CHAIN_STATE_BURNT_FEE } from '../../src/constants';

jest.mock('events');
jest.mock('@liskhq/lisk-db');

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
	let db: any;
	let block: BlockInstance;
	let blockBytes: Buffer;

	beforeEach(() => {
		db = new KVStore('temp');
		chainInstance = new Chain({
			db,
			genesisBlock,
			networkIdentifier,
			registeredTransactions,
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
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
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
				const txs = new Array(200).fill(0).map(() =>
					chainInstance.deserializeTransaction(
						transfer({
							passphrase: genesisAccount.passphrase,
							fee: '10000000',
							nonce: '0',
							recipientId: getAddressFromPublicKey(
								bufferToHex(getRandomBytes(20)),
							),
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
				const txs = new Array(20).fill(0).map(() =>
					chainInstance.deserializeTransaction(
						transfer({
							fee: '10000000',
							nonce: '0',
							passphrase: genesisAccount.passphrase,
							recipientId: getAddressFromPublicKey(
								bufferToHex(getRandomBytes(20)),
							),
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
				const txs = new Array(20).fill(0).map(() =>
					chainInstance.deserializeTransaction(
						transfer({
							fee: '10000000',
							nonce: '0',
							passphrase: genesisAccount.passphrase,
							recipientId: getAddressFromPublicKey(
								bufferToHex(getRandomBytes(20)),
							),
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
			const dataAccess = new DataAccess({
				db,
				maxBlockHeaderCache: 505,
				minBlockHeaderCache: 309,
				registeredTransactions: {},
			});
			stateStore = new StateStore(dataAccess, {
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
				const futureTimestamp = chainInstance.slots.getSlotTime(
					chainInstance.slots.getNextSlot(),
				);
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
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
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
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
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
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '100000000000000',
					} as never);

				invalidTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [invalidTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
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
				const validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
						amount: '100',
						networkIdentifier,
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '100000000000000',
					} as never);
				(db.exists as jest.Mock).mockResolvedValue(true as never);
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
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
				const validTxJSON = transfer({
					fee: '10000000',
					nonce: '0',
					passphrase: genesisAccount.passphrase,
					recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
					amount: '100',
					networkIdentifier,
				});
				const validTx = chainInstance.deserializeTransaction(
					validTxJSON as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });
				when(db.exists)
					.mockResolvedValue(false as never)
					.calledWith(`transactions:id:${validTx.id}`)
					.mockResolvedValue(true as never);
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
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
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '0',
					} as never)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.generatorPublicKey,
						)}`,
					)
					.mockResolvedValue({
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: '0',
					} as never)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue('100' as never);
				jest.spyOn(stateStore.chain, 'set');

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
				expect(stateStore.chain.set).not.toHaveBeenCalled();
			});
		});

		describe('when transaction is not applicable', () => {
			let validTx;
			let stateStore: StateStore;

			beforeEach(() => {
				// Arrage
				validTx = chainInstance.deserializeTransaction(
					transfer({
						fee: '10000000',
						nonce: '0',
						passphrase: genesisAccount.passphrase,
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b96e0f',
						amount: '10000000',
						networkIdentifier,
					}) as TransactionJSON,
				);
				block = newBlock({ transactions: [validTx] });

				// Act
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});

				const generatorAddress = getAddressFromPublicKey(
					block.generatorPublicKey,
				);

				when(db.get)
					.calledWith(
						`accounts:address:3a971fd02b4a07fc20aad1936d3cb1d263b96e0f`,
					)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '0',
					} as never)
					.calledWith(`accounts:address:${generatorAddress}`)
					.mockResolvedValue({
						address: generatorAddress,
						balance: '0',
					} as never);
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
					address: '32e4d3f46ae3bc74e7771780eee290ae5826006d',
					passphrase:
						'weapon visual tag seed deal solar country toy boring concert decline require',
					publicKey:
						'8c4dddbfe40892940d3bd5446d9d2ee9cdd16ceffecebda684a0585837f60f23',
					username: 'genesis_200',
					balance: '10000000000',
				};
				delegate2 = {
					address: '23d5abdb69c0dbbc21c7c732965589792cc5922a',
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
						recipientId: '3a971fd02b4a07fc20aad1936d3cb1d263b87e0f',
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
				// Act
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '1000000000000',
					} as never)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.generatorPublicKey,
						)}`,
					)
					.mockResolvedValue({
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: '0',
						producedBlocks: 0,
						nonce: '0',
					} as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate1.address}`)
					.mockResolvedValue(delegate1 as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate2.address}`)
					.mockResolvedValue(delegate2 as never)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue(defaultBurntFee as never);
				await chainInstance.apply(block, stateStore);
			});

			it('should call apply for the transaction', () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
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
			(db.get as jest.Mock).mockRejectedValue(
				new NotFoundError('no data found'),
			);
			// Act
			genesisInstance = chainInstance.deserialize(genesisBlock as any);
			genesisInstance.transactions.forEach(tx => tx.validate());
			// Act
			const dataAccess = new DataAccess({
				db,
				maxBlockHeaderCache: 505,
				minBlockHeaderCache: 309,
				registeredTransactions: {},
			});
			stateStore = new StateStore(dataAccess, {
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
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				// Arrage
				block = newBlock({ reward });
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
						address: genesisAccount.address,
						balance: '0',
					} as never)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.generatorPublicKey,
						)}`,
					)
					.mockResolvedValue({
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: reward.toString(),
					} as never);
				await chainInstance.undo(block, stateStore);
			});

			it('should update generator balance to debit rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.generatorPublicKey),
				);
				expect(generator.balance.toString()).toEqual('0');
			});

			it('should not deduct burntFee from chain state', () => {
				expect(db.get).not.toHaveBeenCalledWith('chain:burntFee');
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
					address: '32e4d3f46ae3bc74e7771780eee290ae5826006d',
					passphrase:
						'weapon visual tag seed deal solar country toy boring concert decline require',
					publicKey:
						'8c4dddbfe40892940d3bd5446d9d2ee9cdd16ceffecebda684a0585837f60f23',
					username: 'genesis_200',
					balance: '10000000000',
				};
				delegate2 = {
					address: '23d5abdb69c0dbbc21c7c732965589792cc5922a',
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						'6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799',
					username: 'genesis_201',
					balance: '10000000000',
				};
				const recipient = {
					address: 'acfbdbaeb93d587170c7cd9c0b5ffdeb7ff9daec',
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
						recipientId: 'acfbdbaeb93d587170c7cd9c0b5ffdeb7ff9daec',
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

				// Act
				const dataAccess = new DataAccess({
					db,
					maxBlockHeaderCache: 505,
					minBlockHeaderCache: 309,
					registeredTransactions: {},
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
				});
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address}`)
					.mockResolvedValue({
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
					} as never)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.generatorPublicKey,
						)}`,
					)
					.mockResolvedValue({
						address: getAddressFromPublicKey(block.generatorPublicKey),
						balance: defaultGeneratorBalance.toString(),
						producedBlocks: 1,
					} as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate1.address}`)
					.mockResolvedValue(delegate1 as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate2.address}`)
					.mockResolvedValue(delegate2 as never)
					.calledWith(`accounts:address:${recipient.address}`)
					.mockResolvedValue(recipient as never)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue(defaultBurntFee.toString() as never);
				await chainInstance.undo(block, stateStore);
			});

			it('should call undo for the transaction', () => {
				expect(validTxUndoSpy).toHaveBeenCalledTimes(1);
				expect(validTx2UndoSpy).toHaveBeenCalledTimes(1);
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
