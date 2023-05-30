/*
 * Copyright © 2021 Lisk Foundation
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
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { BlockAssets, Chain, Transaction } from '@liskhq/lisk-chain';
import { bls, utils, address as cryptoAddress, legacy } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { Generator } from '../../../../src/engine/generator';
import { Consensus } from '../../../../src/engine/generator/types';
import { Network } from '../../../../src/engine/network';
import { fakeLogger } from '../../../utils/mocks';

import {
	GENERATOR_STORE_KEY_PREFIX,
	NETWORK_RPC_GET_TRANSACTIONS,
} from '../../../../src/engine/generator/constants';
import {
	generatorKeysSchema,
	getTransactionsResponseSchema,
	plainGeneratorKeysSchema,
} from '../../../../src/engine/generator/schemas';
import { BFTModule } from '../../../../src/engine/bft';
import { createFakeBlockHeader } from '../../../../src/testing';
import { ABI } from '../../../../src/abi';
import { defaultConfig } from '../../../../src/testing/fixtures';
import { testing } from '../../../../src';
import { GeneratorStore } from '../../../../src/engine/generator/generator_store';

describe('generator', () => {
	const logger = fakeLogger;
	const txBytes =
		'0805100118012080ade2042a20f7e7627120dab14b80b6e4f361ba89db251ee838708c3a74c6c2cc08ad793f58321d0a1b0a1432fc1c23b73db1c6205327b1cab44318e61678ea1080dac4093a40a0be9e52d9e0a53406c55a74ab0d7d106eb276a47dd88d3dc2284ed62024b2448e0bd5af1623ae7d793606a58c27d742e8855ba339f757d56972c4c6efad750c';
	const tx = new Transaction({
		params: Buffer.alloc(20),
		command: 'transfer',
		fee: BigInt(100000000),
		module: 'token',
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(32),
		signatures: [Buffer.alloc(64)],
	});

	let generator: Generator;
	let chain: Chain;
	let consensus: Consensus;
	let network: Network;
	let blockchainDB: Database;
	let generatorDB: Database;
	let abi: ABI;
	let bft: BFTModule;
	let consensusEvent: EventEmitter;

	beforeEach(() => {
		blockchainDB = new InMemoryDatabase() as never;
		generatorDB = new InMemoryDatabase() as never;
		chain = {
			chainID: utils.getRandomBytes(32),
			lastBlock: {
				header: {
					id: Buffer.from('6846255774763267134'),
					height: 9187702,
					timestamp: 93716450,
				},
				transactions: [],
			},
			finalizedHeight: 100,
			dataAccess: {
				getBlockHeaderByHeight: jest.fn(),
			},
			constants: {
				chainID: Buffer.from('chainID'),
			},
		} as never;
		consensusEvent = new EventEmitter();
		consensus = {
			execute: jest.fn(),
			syncing: jest.fn().mockReturnValue(false),
			getAggregateCommit: jest.fn(),
			certifySingleCommit: jest.fn(),
			getConsensusParams: jest.fn().mockResolvedValue({
				currentValidators: [],
				implyMaxPrevote: true,
				maxHeightCertified: 0,
			}),
			getMaxRemovalHeight: jest.fn().mockResolvedValue(0),
			events: consensusEvent,
		} as never;
		network = {
			registerEndpoint: jest.fn(),
			registerHandler: jest.fn(),
			events: {
				on: jest.fn(),
			},
			request: jest.fn().mockResolvedValue({
				data: codec.encode(getTransactionsResponseSchema, {
					transactions: [Buffer.from(txBytes, 'hex')],
				}),
			}),
		} as never;
		abi = {
			beforeTransactionsExecute: jest.fn().mockResolvedValue({
				events: [],
			}),
			afterTransactionsExecute: jest.fn().mockResolvedValue({
				events: [],
				nextValidators: [],
				precommitThreshold: 0,
				certificateThreshold: 0,
			}),
			clear: jest.fn(),
			commit: jest.fn().mockResolvedValue({ stateRoot: utils.getRandomBytes(32) }),
			verifyTransaction: jest.fn(),
			executeTransaction: jest.fn().mockResolvedValue({ events: [] }),
			initStateMachine: jest.fn().mockResolvedValue({ contextID: utils.getRandomBytes(32) }),
			insertAssets: jest.fn().mockResolvedValue({ assets: [] }),
		} as never;
		bft = {
			beforeTransactionsExecute: jest.fn(),
			method: {
				getBFTHeights: jest.fn().mockResolvedValue({
					maxHeightPrevoted: 0,
					maxHeightPrecommitted: 0,
					maxHeightCertified: 0,
				}),
				setBFTParameters: jest.fn(),
				getBFTParameters: jest.fn().mockResolvedValue({ validators: [] }),
				existBFTParameters: jest.fn().mockResolvedValue(false),
				getGeneratorAtTimestamp: jest.fn(),
				impliesMaximalPrevotes: jest.fn().mockResolvedValue(false),
				getSlotNumber: jest.fn(),
				getSlotTime: jest.fn(),
			},
		} as never;

		generator = new Generator({
			abi,
			bft,
			chain,
			consensus,
			network,
			config: {
				...defaultConfig,
				generator: {
					keys: {
						fromFile: '~/.lisk/default/keys.json',
					},
				},
			},
		});
		jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(testing.fixtures.keysList));
	});

	describe('init', () => {
		describe('loadGenerator', () => {
			beforeEach(async () => {
				for (const d of testing.fixtures.keysList.keys) {
					const generatorKeys = {
						address: cryptoAddress.getAddressFromLisk32Address(d.address),
						type: 'plain',
						data: {
							generatorKey: Buffer.from(d.plain.generatorKey, 'hex'),
							generatorPrivateKey: Buffer.from(d.plain.generatorPrivateKey, 'hex'),
							blsPrivateKey: Buffer.from(d.plain.blsPrivateKey, 'hex'),
							blsKey: Buffer.from(d.plain.blsKey, 'hex'),
						},
					};
					const encodedData = codec.encode(plainGeneratorKeysSchema, generatorKeys.data);

					await generatorDB.set(
						Buffer.concat([GENERATOR_STORE_KEY_PREFIX, generatorKeys.address]),
						codec.encode(generatorKeysSchema, {
							type: generatorKeys.type,
							data: encodedData,
						}),
					);
				}
			});

			it('should load all 101 validators', async () => {
				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
					genesisHeight: 0,
				});
				expect(generator['_keypairs'].values()).toHaveLength(103);
			});

			it('should handle finalized height change between maxRemovalHeight and max height precommitted', async () => {
				jest.spyOn(generator, '_handleFinalizedHeightChanged' as any).mockReturnValue([] as never);
				jest
					.spyOn(generator['_bft'].method, 'getBFTHeights')
					.mockResolvedValue({ maxHeightPrecommitted: 515, maxHeightCertified: 313 } as never);
				jest.spyOn(generator['_consensus'], 'getMaxRemovalHeight').mockResolvedValue(200);

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
					genesisHeight: 0,
				});
				expect(generator['_handleFinalizedHeightChanged']).toHaveBeenCalledWith(200, 515);
			});
		});

		describe('saveKeysFromFile', () => {
			it('should not store any data when generator.keys.fromFile is not defined', async () => {
				generator['_config'].generator = { keys: {} };
				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
					genesisHeight: 0,
				});

				const store = new GeneratorStore(generator['_generatorDB']);
				const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);

				await expect(subStore.iterate({})).resolves.toEqual([]);
			});

			it('should reject if file does not follow exepcted format', async () => {
				jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ invalid: 'file' }));
				await expect(
					generator.init({
						blockchainDB,
						generatorDB,
						logger,
						genesisHeight: 0,
					}),
				).rejects.toThrow('Lisk validator found 1 error');
			});

			it('should store all keys from the file defined', async () => {
				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
					genesisHeight: 0,
				});

				const store = new GeneratorStore(generator['_generatorDB']);
				const subStore = store.getGeneratorStore(GENERATOR_STORE_KEY_PREFIX);

				await expect(subStore.iterate({})).resolves.toHaveLength(
					testing.fixtures.keysList.keys.length,
				);
			});
		});
	});

	describe('start', () => {
		beforeEach(async () => {
			jest.spyOn(generator['_pool'], 'add').mockResolvedValue({} as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
			jest.useFakeTimers();
		});

		it('should not block the promise', async () => {
			await expect(generator.start()).toResolve();
		});

		it('should load transaction from network when network is ready', async () => {
			await expect(generator.start()).toResolve();
			expect(network.events.on).toHaveReturnedTimes(1);
			(network.events.on as jest.Mock).mock.calls[0][1]();
			expect(network.request).toHaveBeenCalledWith({ procedure: NETWORK_RPC_GET_TRANSACTIONS });
		});

		it('should try to load transaction from network maximum 5 times', async () => {
			await expect(generator.start()).toResolve();
			expect(network.events.on).toHaveReturnedTimes(1);
			(network.request as jest.Mock).mockRejectedValue(new Error('invalid request'));
			(network.events.on as jest.Mock).mock.calls[0][1]();
			expect(generator['_pool'].add).not.toHaveBeenCalled();
			expect(network.request).toHaveBeenCalled();
		});
	});

	describe('stop', () => {
		beforeEach(async () => {
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
			await generator.start();
		});

		it('should not block the promise', async () => {
			await expect(generator.stop()).toResolve();
		});

		it('should stop transaction pool', async () => {
			jest.spyOn(generator['_pool'], 'stop');
			await generator.stop();
			expect(generator['_pool'].stop).toHaveBeenCalledTimes(1);
		});

		it('should stop block generation', async () => {
			jest.spyOn(generator['_generationJob'], 'stop');
			await generator.stop();
			expect(generator['_generationJob'].stop).toHaveBeenCalledTimes(1);
		});
	});

	describe('onNewBlock', () => {
		beforeEach(async () => {
			jest.spyOn(generator['_pool'], 'remove');
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
			await generator.start();
		});

		it('should remove included transactions from the transaction pool', () => {
			generator.onNewBlock({ transactions: [tx] } as never);

			expect(generator['_pool'].remove).toHaveBeenCalledTimes(1);
		});
	});

	describe('onDeleteBlock', () => {
		beforeEach(async () => {
			jest.spyOn(generator['_pool'], 'add').mockResolvedValue({} as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
			await generator.start();
		});

		it('should add included transactions to the transaction pool', () => {
			generator.onDeleteBlock({ transactions: [tx] } as never);

			expect(generator['_pool'].add).toHaveBeenCalledTimes(1);
		});
	});

	describe('_generateLoop', () => {
		const currentSlot = 5;
		const lastBlockSlot = 4;
		const forgedBlock = {
			header: {
				height: 10,
				id: Buffer.from('1'),
				timestamp: Date.now(),
				reward: 1,
			},
		};
		beforeEach(async () => {
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
		});

		it('should verify if node is syncing', async () => {
			await generator['_generateLoop']();

			expect(consensus.syncing).toHaveBeenCalledOnce();
		});

		it('should not generate if node is syncing', async () => {
			consensus.syncing = jest.fn().mockReturnValue(true);

			await generator['_generateLoop']();

			expect(consensus.syncing).toHaveBeenCalledOnce();

			expect(bft.method.getGeneratorAtTimestamp).not.toHaveBeenCalled();
		});

		it('should not generate if current block slot is same as last block slot', async () => {
			(bft.method.getSlotNumber as jest.Mock).mockReturnValue(lastBlockSlot);
			(bft.method.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000));
			await generator['_generateLoop']();

			expect(bft.method.getGeneratorAtTimestamp).not.toHaveBeenCalled();
		});

		it('should not generate if validator is not registered for given time', async () => {
			(bft.method.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot);
			(bft.method.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue({
				address: utils.getRandomBytes(20),
			});
			jest.spyOn(generator, '_generateBlock' as never);
			await generator['_generateLoop']();

			expect(generator['_generateBlock']).not.toHaveBeenCalled();
		});

		it('should wait for threshold time if last block not received', async () => {
			(bft.method.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot - 1);
			(bft.method.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000));
			(bft.method.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue({
				address: cryptoAddress.getAddressFromLisk32Address(
					testing.fixtures.keysList.keys[0].address,
				),
			});
			jest.spyOn(generator, '_generateBlock' as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).not.toHaveBeenCalled();
		});

		it('should not wait if threshold time passed and last block not received', async () => {
			(bft.method.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot - 1);
			(bft.method.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000) - 5);
			(bft.method.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue({
				address: cryptoAddress.getAddressFromLisk32Address(
					testing.fixtures.keysList.keys[0].address,
				),
			});

			jest.spyOn(generator, '_generateBlock' as never).mockResolvedValue(forgedBlock as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).toHaveBeenCalled();
		});

		it('should not wait if threshold remaining but last block already received', async () => {
			(bft.method.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot);
			(bft.method.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000) + 5);
			(bft.method.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue({
				address: cryptoAddress.getAddressFromLisk32Address(
					testing.fixtures.keysList.keys[0].address,
				),
			});

			jest.spyOn(generator, '_generateBlock' as never).mockResolvedValue(forgedBlock as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).toHaveBeenCalled();
		});
	});

	describe('generateBlock', () => {
		const generatorAddress = utils.getRandomBytes(20);
		const keypair = {
			publicKey: utils.getRandomBytes(32),
			privateKey: utils.getRandomBytes(64),
		};
		const currentTime = Math.floor(Date.now() / 1000);
		const validatorsHash = utils.hash(utils.getRandomBytes(32));
		const assetHash = utils.hash(utils.getRandomBytes(32));
		const aggregateCommit = {
			aggregationBits: Buffer.alloc(0),
			certificateSignature: utils.getRandomBytes(96),
			height: 3456,
		};

		beforeEach(async () => {
			jest
				.spyOn(generator['_forgingStrategy'], 'getTransactionsForBlock')
				.mockResolvedValue({ transactions: [tx], events: [] });
			jest
				.spyOn(generator['_bft'].method, 'getBFTParameters')
				.mockResolvedValue({ validatorsHash, validators: [] } as never);
			jest
				.spyOn(generator['_consensus'], 'getAggregateCommit')
				.mockResolvedValue(aggregateCommit as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
		});

		it('should call all hooks', async () => {
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});
			expect(abi.initStateMachine).toHaveBeenCalledTimes(1);
			expect(abi.insertAssets).toHaveBeenCalledTimes(1);
			expect(abi.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(abi.afterTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(abi.commit).toHaveBeenCalledTimes(1);
			expect(abi.clear).toHaveBeenCalledTimes(1);

			expect(block.transactions).toHaveLength(1);
			expect(block.header.signature).toHaveLength(64);
		});

		it('should have finalizedHeight in the context', async () => {
			await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(abi.insertAssets).toHaveBeenCalledWith({
				contextID: expect.any(Buffer),
				finalizedHeight: expect.any(Number),
			});
		});

		it('should assign validatorsHash to the block', async () => {
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.validatorsHash).toEqual(validatorsHash);
		});

		it('should assign impliesMaxPrevotes to the block', async () => {
			jest.spyOn(generator['_bft'].method, 'impliesMaximalPrevotes').mockResolvedValue(true);

			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.impliesMaxPrevotes).toBe(true);
		});

		it('should assign assetRoot to the block', async () => {
			jest.spyOn(BlockAssets.prototype, 'getRoot').mockResolvedValue(assetHash);
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.assetRoot).toEqual(assetHash);
		});

		it('should assign eventRoot to the block when event is empty', async () => {
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.eventRoot).toEqual(utils.hash(Buffer.alloc(0)));
		});

		it('should assign non empty eventRoot to the block when event exist', async () => {
			jest.spyOn(abi, 'beforeTransactionsExecute').mockResolvedValue({
				events: [
					{
						module: 'sample',
						name: 'init',
						data: Buffer.from([0, 0, 2]),
						topics: [Buffer.from([2])],
						height: 2,
						index: 0,
					},
				],
			});
			jest.spyOn(abi, 'afterTransactionsExecute').mockResolvedValue({
				events: [
					{
						module: 'sample',
						name: 'init',
						data: Buffer.from([0, 0, 1]),
						topics: [Buffer.from([3])],
						height: 2,
						index: 0,
					},
				],
				nextValidators: [],
				preCommitThreshold: BigInt(0),
				certificateThreshold: BigInt(0),
			});
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.eventRoot).not.toEqual(utils.hash(Buffer.alloc(0)));
		});

		it('should assign aggregateCommit to the block', async () => {
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.aggregateCommit).toEqual(aggregateCommit);
		});
	});

	describe('events CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED', () => {
		const passphrase = Mnemonic.generateMnemonic(256);
		const keys = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
		const address = cryptoAddress.getAddressFromPublicKey(keys.publicKey);
		const blsSecretKey = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const keypair = {
			...keys,
			blsSecretKey,
			blsPublicKey: bls.getPublicKeyFromPrivateKey(blsSecretKey),
		};
		const blsKey = bls.getPublicKeyFromPrivateKey(keypair.blsSecretKey);
		const blockHeader = createFakeBlockHeader();

		beforeEach(async () => {
			generator['_keypairs'].set(address, keypair);
			when(generator['_bft'].method.existBFTParameters as jest.Mock)
				.calledWith(expect.anything(), 1)
				.mockResolvedValue(true as never)
				.calledWith(expect.anything(), 12)
				.mockResolvedValue(true as never)
				.calledWith(expect.anything(), 21)
				.mockResolvedValue(true as never)
				.calledWith(expect.anything(), 51)
				.mockResolvedValue(false as never)
				.calledWith(expect.anything(), 55)
				.mockResolvedValue(true as never);
			when(generator['_bft'].method.getBFTParameters as jest.Mock)
				.calledWith(expect.anything(), 11)
				.mockResolvedValue({ validators: [{ address, blsKey }] })
				.calledWith(expect.anything(), 20)
				.mockResolvedValue({ validators: [{ address, blsKey: Buffer.alloc(48) }] })
				.calledWith(expect.anything(), 50)
				.mockResolvedValue({ validators: [{ address, blsKey }] })
				.calledWith(expect.anything(), 54)
				.mockResolvedValue({ validators: [] });

			jest
				.spyOn(generator['_chain'].dataAccess, 'getBlockHeaderByHeight')
				.mockResolvedValue(blockHeader as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
				genesisHeight: 0,
			});
			await generator.start();
			jest.spyOn(generator['_consensus'], 'certifySingleCommit');
		});

		it('should call certifySingleCommit for range when params for height + 1 exist', async () => {
			// Act
			await Promise.all(generator['_handleFinalizedHeightChanged'](10, 50));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(2);
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledWith(blockHeader, {
				address,
				blsPublicKey: blsKey,
				blsSecretKey: keypair.blsSecretKey,
			});
		});

		it('should not call certifySingleCommit for range when params for height + 1 does not exist', async () => {
			// Act
			await Promise.all(generator['_handleFinalizedHeightChanged'](51, 54));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
		});

		it('should not call certifySingleCommit for finalized height + 1 when BFT params exist', async () => {
			// Act
			await Promise.all(generator['_handleFinalizedHeightChanged'](53, 54));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
		});

		it('should not call certifySingleCommit for the validator who has not registered bls key', async () => {
			// Act
			await Promise.all(generator['_handleFinalizedHeightChanged'](20, 21));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
		});

		it('should call certifySingleCommit for finalized height + 1 when BFT params does not exist', async () => {
			// For height 50, it should ceritifySingleCommit event though BFTParameter does not exist
			await Promise.all(generator['_handleFinalizedHeightChanged'](15, 50));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(1);
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledWith(blockHeader, {
				address,
				blsPublicKey: blsKey,
				blsSecretKey: keypair.blsSecretKey,
			});
		});

		it('should not call certifySingleCommit when validator is not active at the height', async () => {
			// height 20 returns existBFTParameters true, but no active validators.
			// Therefore, it should not certify single commit
			// Act
			await Promise.all(generator['_handleFinalizedHeightChanged'](15, 54));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).not.toHaveBeenCalled();
		});
	});
});
