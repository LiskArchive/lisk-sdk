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
import { getRandomBytes, getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { TransferTransaction, BaseTransaction, VoteTransaction } from '@liskhq/lisk-transactions';
import { createValidDefaultBlock, defaultNetworkIdentifier, genesisBlock, defaultBlockHeaderAssetSchema } from '../utils/block';
import { Chain } from '../../src/chain';
import { StateStore } from '../../src/state_store';
import { DataAccess } from '../../src/data_access';
import { defaultAccountAssetSchema, createFakeDefaultAccount, defaultAccountSchema, genesisAccount, encodeDefaultAccount } from '../utils/account';
import { registeredTransactions } from '../utils/registered_transactions';
import { Block } from '../../src/types';
import { transaction } from '../utils/transaction';
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

	let chainInstance: Chain;
	let db: any;
	let block: Block;

	beforeEach(() => {
		db = new KVStore('temp');
		chainInstance = new Chain({
			db,
			genesisBlock: genesisBlock(),
			networkIdentifier: defaultNetworkIdentifier,
			registeredTransactions,
			accountAsset: {
				schema: defaultAccountAssetSchema,
				default: createFakeDefaultAccount().asset,
			},
			registeredBlocks: {
				0: defaultBlockHeaderAssetSchema,
				2: defaultBlockHeaderAssetSchema,
			},
			...constants,
		});
		(chainInstance as any)._lastBlock = genesisBlock();

		block = createValidDefaultBlock();
	});

	describe('#validateBlockHeader', () => {
		describe('when previous block property is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = createValidDefaultBlock({ header: { previousBlockID: Buffer.alloc(0), height: 3 } } as any);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow('Invalid previous block');
			});
		});

		describe('when signature is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = createValidDefaultBlock();
				(block.header as any).signature = getRandomBytes(64);
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow('Invalid block signature');
			});
		});

		describe('when reward is invalid', () => {
			it('should throw error', () => {
				// Arrange
				block = createValidDefaultBlock({ header: { reward: BigInt(1000000000) } });
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow('Invalid block reward');
			});
		});

		describe('when a transaction included is invalid', () => {
			it('should throw error', () => {
				// Arrange
				const invalidTx = transaction();
				(invalidTx.senderPublicKey as any) = '100';
				block = createValidDefaultBlock({ payload: [invalidTx] });
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow();
			});
		});

		describe('when payload length exceeds maximum allowed', () => {
			it('should throw error', () => {
				// Arrange
				(chainInstance as any).constants.maxPayloadLength = 100;
				const txs = new Array(200).fill(0).map(() => transaction());
				block = createValidDefaultBlock({ payload: txs });
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow('Payload length is too long');
			});
		});

		describe('when transaction root is incorrect', () => {
			it('should throw error', () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => transaction());
				block = createValidDefaultBlock({ payload: txs, header: { transactionRoot: Buffer.from('1234567890') } });
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
				).toThrow('Invalid transaction root');
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => transaction());
				block = createValidDefaultBlock({ payload: txs });
				// Act & assert
				expect(() =>
					chainInstance.validateBlockHeader(block),
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
				accountSchema: defaultAccountSchema as any,
				registeredBlockHeaders: {
					0: defaultBlockHeaderAssetSchema,
					2: defaultBlockHeaderAssetSchema,
				},
				registeredTransactions: { 8: TransferTransaction },
				minBlockHeaderCache: 505,
				maxBlockHeaderCache: 309,
			});
			stateStore = new StateStore(dataAccess, {
				lastBlockHeaders: [],
				networkIdentifier: defaultNetworkIdentifier,
				lastBlockReward: BigInt(500000000),
				defaultAsset: createFakeDefaultAccount().asset,
			});
		});

		describe('when previous block id is invalid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = createValidDefaultBlock({ header: { previousBlockID: getRandomBytes(32) } });
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
				block = createValidDefaultBlock({ header: { timestamp: futureTimestamp } });
				expect.assertions(1);
				// Act & Assert
				await expect(
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is earlier than lastBlock timestamp', async () => {
				// Arrange
				block = createValidDefaultBlock({ header: { timestamp: 0 } });
				expect.assertions(1);
				// Act & Assert
				await expect(
					chainInstance.verify(block, stateStore, { skipExistingCheck: true }),
				).rejects.toThrow('Invalid block timestamp');
			});

			it('should throw when block timestamp is equal to the lastBlock timestamp', async () => {
				(chainInstance as any)._lastBlock = {
					...genesisBlock(),
					timestamp: 200,
					receivedAt: new Date(),
				};
				// Arrange
				block = createValidDefaultBlock({
					header: {
						previousBlockID: chainInstance.lastBlock.header.id,
						height: chainInstance.lastBlock.header.height + 1,
						timestamp: chainInstance.lastBlock.header.timestamp - 10,
					},
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
				block = createValidDefaultBlock();
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
				notAllowedTx = transaction();
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
				block = createValidDefaultBlock({ payload: [notAllowedTx] });
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
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
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
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(encodeDefaultAccount(
						createFakeDefaultAccount({
							address: genesisAccount.address,
							balance: BigInt('1000000000000'),
						}),
					) as never);

				invalidTx = transaction();
				block = createValidDefaultBlock({ payload: [invalidTx] });
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Act
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
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
				const validTx = transaction();
				block = createValidDefaultBlock({ payload: [validTx] });
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: genesisAccount.address,
								balance: BigInt('1000000000000'),
							}),
						) as never,
					);
				(db.exists as jest.Mock).mockResolvedValue(true as never);
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
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
				const validTx = transaction();
				block = createValidDefaultBlock({ payload: [validTx] });
				when(db.exists)
					.mockResolvedValue(false as never)
					.calledWith(`transactions:id:${validTx.id.toString('binary')}`)
					.mockResolvedValue(true as never);
			});

			it('should not call apply for the transaction and throw error', async () => {
				// Arrange
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
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
				block = createValidDefaultBlock({ header: { reward: BigInt(500000000) } });
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
				});
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: genesisAccount.address,
								balance: BigInt('1000000000000'),
							}),
						) as never,
					)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.header.generatorPublicKey,
						).toString('binary')}`,
					)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: getAddressFromPublicKey(block.header.generatorPublicKey),
								balance: BigInt('0'),
							}),
						) as never,
					)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue(Buffer.from(JSON.stringify('100')) as never);
				jest.spyOn(stateStore.chain, 'set');

				// Arrage
				await chainInstance.apply(block, stateStore);
			});

			it('should update generator balance to give rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.header.generatorPublicKey),
				);
				expect(generator.balance).toEqual(block.header.reward);
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
				validTx = transaction({ amount: BigInt(10000000) });
				block = createValidDefaultBlock({ payload: [validTx] });

				// Act
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions: { 8: TransferTransaction },
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
				});

				const generatorAddress = getAddressFromPublicKey(
					block.header.generatorPublicKey,
				);

				when(db.get)
					.calledWith(
						`accounts:address:${validTx.asset.recipientAddress.toString('binary')}`,
					)
					.mockRejectedValue(new NotFoundError('data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: genesisAccount.address,
								balance: BigInt('0'),
							}),
						) as never,
					)
					.calledWith(`accounts:address:${generatorAddress.toString('hex')}`)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: generatorAddress,
								balance: BigInt('0'),
							}),
						) as never,
					);
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
				expect(chainInstance.lastBlock).toStrictEqual(genesisBlock());
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
					address: Buffer.from('32e4d3f46ae3bc74e7771780eee290ae5826006d', 'hex'),
					passphrase:
						'weapon visual tag seed deal solar country toy boring concert decline require',
					publicKey:
						Buffer.from('8c4dddbfe40892940d3bd5446d9d2ee9cdd16ceffecebda684a0585837f60f23', 'hex'),
					username: 'genesis_200',
					balance: BigInt('10000000000'),
				};
				delegate2 = {
					address: Buffer.from('23d5abdb69c0dbbc21c7c732965589792cc5922a', 'hex'),
					passphrase:
						'shoot long boost electric upon mule enough swing ritual example custom party',
					publicKey:
						Buffer.from('6263120d0ee380d60070e648684a7f98ece4767d140ccb277f267c3a6f36a799', 'hex'),
					username: 'genesis_201',
					balance: BigInt('10000000000'),
				};

				// Act
				const validTx = new VoteTransaction({
					id: getRandomBytes(32),
					type: 8,
					fee: BigInt('10000000'),
					nonce: BigInt('0'),
					senderPublicKey: genesisAccount.publicKey,
					asset: {
						votes: [
							{
								delegateAddress: delegate1.address,
								amount: BigInt('10000000000'),
							},
							{
								delegateAddress: delegate2.address,
								amount: BigInt('10000000000'),
							},
						],
					},
					signatures: [],
				});
				validTx.sign(defaultNetworkIdentifier, genesisAccount.passphrase);
				// Calling validate to inject id and min-fee
				validTx.validate();
				const validTx2 = transaction({ nonce: BigInt(1), amount: BigInt('10000000') });
				// Calling validate to inject id and min-fee
				validTx2.validate();
				validTxApplySpy = jest.spyOn(validTx, 'apply');
				validTx2ApplySpy = jest.spyOn(validTx2, 'apply');
				block = createValidDefaultBlock({
					header: { reward: BigInt(500000000) },
					payload: [validTx, validTx2],
				});
				// Act
				const dataAccess = new DataAccess({
					db,
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions,
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
				});

				const burntFeeBuffer = Buffer.alloc(8);
				burntFeeBuffer.writeBigInt64BE(BigInt(defaultBurntFee));

				when(db.get)
					.mockRejectedValue(new NotFoundError('Data not found') as never)
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: genesisAccount.address,
								balance: BigInt('1000000000000'),
							}),
						) as never,
					)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.header.generatorPublicKey,
						).toString('binary')}`,
					)
					.mockResolvedValue(
						encodeDefaultAccount(
							createFakeDefaultAccount({
								address: genesisAccount.address,
								balance: BigInt('0'),
								nonce: BigInt('0'),
							}),
						) as never,
					)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate1.address.toString('binary')}`)
					.mockResolvedValue(encodeDefaultAccount(
						createFakeDefaultAccount({ ...delegate1, asset: { delegate: { username: delegate1.username } } }),
					) as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate2.address.toString('binary')}`)
					.mockResolvedValue(encodeDefaultAccount(
						createFakeDefaultAccount({ ...delegate2, asset: { delegate: { username: delegate2.username } } }),
					) as never)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue(burntFeeBuffer as never);
				await chainInstance.apply(block, stateStore);
			});

			it('should call apply for the transaction', () => {
				expect(validTxApplySpy).toHaveBeenCalledTimes(1);
				expect(validTx2ApplySpy).toHaveBeenCalledTimes(1);
			});

			it('should update generator balance with rewards and fees - minFee', async () => {
				const generator = await stateStore.account.get(
					getAddressFromPublicKey(block.header.generatorPublicKey),
				);
				let expected = block.header.reward;
				for (const tx of block.payload) {
					expected += tx.fee - tx.minFee;
				}
				expect(generator.balance.toString()).toEqual(expected.toString());
			});

			it('should update burntFee in the chain state', async () => {
				const burntFee = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
				let expected = BigInt(0);
				for (const tx of block.payload) {
					expected += tx.minFee;
				}
				const expectedBuffer = Buffer.alloc(8);
				expectedBuffer.writeBigInt64BE(BigInt(defaultBurntFee) + expected);
				expect(burntFee).toEqual(
					expectedBuffer,
				);
			});
		});
	});

	describe('#applyGenesis', () => {
		let stateStore: StateStore;

		beforeEach(async () => {
			// Arrage
			(db.get as jest.Mock).mockRejectedValue(
				new NotFoundError('no data found'),
			);
			// Act
			const genesisBlockInstance = genesisBlock();
			genesisBlockInstance.payload.forEach(tx => tx.validate());
			// Act
			const dataAccess = new DataAccess({
				db,
				accountSchema: defaultAccountSchema as any,
				registeredBlockHeaders: {
					0: defaultBlockHeaderAssetSchema,
					2: defaultBlockHeaderAssetSchema,
				},
				registeredTransactions,
				minBlockHeaderCache: 505,
				maxBlockHeaderCache: 309,
			});
			stateStore = new StateStore(dataAccess, {
				lastBlockHeaders: [],
				networkIdentifier: defaultNetworkIdentifier,
				lastBlockReward: BigInt(500000000),
				defaultAsset: createFakeDefaultAccount().asset,
			});
			await chainInstance.applyGenesis(genesisBlockInstance, stateStore);
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
				expect(
					genesisAccountFromStore?.readBigInt64BE(),
				).toEqual(BigInt('0'));
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
					accountSchema: defaultAccountSchema as any,
					registeredBlockHeaders: {
						0: defaultBlockHeaderAssetSchema,
						2: defaultBlockHeaderAssetSchema,
					},
					registeredTransactions,
					minBlockHeaderCache: 505,
					maxBlockHeaderCache: 309,
				});
				stateStore = new StateStore(dataAccess, {
					lastBlockHeaders: [],
					networkIdentifier: defaultNetworkIdentifier,
					lastBlockReward: BigInt(500000000),
					defaultAsset: createFakeDefaultAccount().asset,
				});
				// Arrage
				block = createValidDefaultBlock({ header: { reward } });
				when(db.get)
					.calledWith(`accounts:address:${genesisAccount.address.toString('binary')}`)
					.mockResolvedValue(
						Buffer.from(
							JSON.stringify({
								address: genesisAccount.address,
								balance: '0',
							}),
						) as never,
					)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.header.generatorPublicKey,
						).toString('binary')}`,
					)
					.mockResolvedValue(
						Buffer.from(
							JSON.stringify({
								address: getAddressFromPublicKey(block.generatorPublicKey),
								balance: reward.toString(),
							}),
						) as never,
					);
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
					.mockResolvedValue(
						Buffer.from(
							JSON.stringify({
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
							}),
						) as never,
					)
					.calledWith(
						`accounts:address:${getAddressFromPublicKey(
							block.generatorPublicKey,
						)}`,
					)
					.mockResolvedValue(
						Buffer.from(
							JSON.stringify({
								address: getAddressFromPublicKey(block.generatorPublicKey),
								balance: defaultGeneratorBalance.toString(),
								producedBlocks: 1,
							}),
						) as never,
					)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate1.address}`)
					.mockResolvedValue(Buffer.from(JSON.stringify(delegate1)) as never)
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					.calledWith(`accounts:address:${delegate2.address}`)
					.mockResolvedValue(Buffer.from(JSON.stringify(delegate2)) as never)
					.calledWith(`accounts:address:${recipient.address}`)
					.mockResolvedValue(Buffer.from(JSON.stringify(recipient)) as never)
					.calledWith(`chain:burntFee`)
					.mockResolvedValue(
						Buffer.from(JSON.stringify(defaultBurntFee.toString())) as never,
					);
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
				expect(JSON.parse((burntFee as Buffer).toString('utf8'))).toEqual(
					(BigInt(defaultBurntFee) - expected).toString(),
				);
			});
		});
	});
});
