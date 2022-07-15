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
import { EventEmitter } from 'events';
import { BlockAssets, Chain, Transaction } from '@liskhq/lisk-chain';
import {
	generatePrivateKey,
	getAddressFromPassphrase,
	getAddressFromPublicKey,
	getPrivateAndPublicKeyFromPassphrase,
	getPublicKeyFromPrivateKey,
	getRandomBytes,
	hash,
	intToBuffer,
} from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { when } from 'jest-when';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import { Generator } from '../../../../src/engine/generator';
import { Consensus } from '../../../../src/engine/generator/types';
import { Network } from '../../../../src/engine/network';
import { configUtils } from '../../../utils';
import { fakeLogger } from '../../../utils/mocks';

import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';
import { NETWORK_RPC_GET_TRANSACTIONS } from '../../../../src/engine/generator/constants';
import { getTransactionsResponseSchema } from '../../../../src/engine/generator/schemas';
import { BFTModule } from '../../../../src/engine/bft';
import { createFakeBlockHeader } from '../../../../src/testing';
import { ABI } from '../../../../src/abi';

describe('generator', () => {
	const logger = fakeLogger;
	const generators = [
		{
			publicKey: Buffer.from(
				'c24ec443a9e0f18f67275dea31fa3083292e249db7347ac62958ff3ba9ab9b9b',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('c24ec443a9e0f18f67275dea31fa3083292e249db7347ac62958ff3ba9ab9b9b', 'hex'),
			),
			encryptedPassphrase:
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=8540bb771c785b4e89f1502b1c7daeab6ccb55d3199993bf0065866bf23eb1ddc85522f44b9b960eae0aff83d7e0029bf9b6b12dbf1108d050835677c264387a6733365f9e542b95c83a886e58fc381e97495ccb34d628e266b2e3b39d0948106afcbad20f4656287d26b4871e280da00c29b33a08458be8ab373bc775947c7aa420a34a8767c25b96f44be3c1a853d6a70bd9a61f01b89d9b&mac=f6a7b85215dd8573554aa47281fb0f72721febacd1e73d4db106d17a0868ced5&salt=4966e4b6a7a4a67dc8f6a0934074fd65&iv=d285514c0687e4636605c3a8&tag=36dccdbda3a036e1957b6b9479cc7a65&iterations=1&parallelism=4&memorySize=2024',
		},
		{
			publicKey: Buffer.from(
				'e2ab259cabe2b00f4f3760f3cdd989e09c2abb828150ddd2a30f004634c6d825',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('e2ab259cabe2b00f4f3760f3cdd989e09c2abb828150ddd2a30f004634c6d825', 'hex'),
			),
			encryptedPassphrase:
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=181e2810b8b95b399bfafae012cc0bf1d326e4954d27c103ebb8b88e8fd2ec12591bced770061f2c5032bd9a404562be09df5cbb130b03a3014d984e9041ac1164a70b6065a0b1c1bdab94b60015ede6b11b213003b86bf7ebb47c7cdcde6864e6dc67846d034c11afd33a614f289116f683c9c2b7420b421e7cd850ff4be14732122f8b02a850972b1b0357980559463af3a5317d66eb255b9979d5114e3c8847ef0c&mac=e605cc7e3ab01784b9bdee078fa6fb623d8c551f459f72e586b2f89e4bfc3af4&salt=ea719460870cb801900ed673476d8e1f&iv=e71c89f5466d4e0f076e2272&tag=025a827cf135c5eeb89b950b44ad4b42&iterations=1&parallelism=4&memorySize=2024',
		},
		{
			publicKey: Buffer.from(
				'fc1fa2e4f57f9e6d142328b12f17fd5739e44c07e4026bfb41dd877912511fa3',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('fc1fa2e4f57f9e6d142328b12f17fd5739e44c07e4026bfb41dd877912511fa3', 'hex'),
			),
			encryptedPassphrase:
				'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=ca989fe2ea9f41fd8b637e38757735024cfc438744021c94e10e93d3f264111219b536a297fae975341d87ceadcec044411c7233412a33dec78ce339dc66725ae641ebd1f291fde6e8908495022f983ac8c06dbff37d7b191902b4468c3351a2e8177760b38354afba1bb2092a4d8bcc14dd5af69c34a6e53970d55063aa4044fa2c93b71ba8290642&mac=22af4dfd03c47781697b0bc0e5dba1dff23e573c8eb61928acdbc30620817923&salt=175636a6761b48eef2fbd540ac1baca0&iv=84f431d4065d853ea97a607f&tag=84df212423f2a7a98ed8e9d6b3e30df4&iterations=1&parallelism=4&memorySize=2024',
		},
	];
	const txBytes =
		'0805100118012080ade2042a20f7e7627120dab14b80b6e4f361ba89db251ee838708c3a74c6c2cc08ad793f58321d0a1b0a1432fc1c23b73db1c6205327b1cab44318e61678ea1080dac4093a40a0be9e52d9e0a53406c55a74ab0d7d106eb276a47dd88d3dc2284ed62024b2448e0bd5af1623ae7d793606a58c27d742e8855ba339f757d56972c4c6efad750c';
	const tx = new Transaction({
		params: Buffer.alloc(20),
		commandID: intToBuffer(0, 4),
		fee: BigInt(100000000),
		moduleID: intToBuffer(2, 4),
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
			networkIdentifier: getRandomBytes(32),
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
				networkIdentifier: Buffer.from('networkIdentifier'),
			},
		} as never;
		consensusEvent = new EventEmitter();
		consensus = {
			execute: jest.fn(),
			getSlotNumber: jest.fn(),
			getSlotTime: jest.fn(),
			getGeneratorAtTimestamp: jest.fn(),
			getAggregateCommit: jest.fn(),
			certifySingleCommit: jest.fn(),
			getMaxRemovalHeight: jest.fn().mockResolvedValue(0),
			getConsensusParams: jest.fn().mockResolvedValue({
				currentValidators: [],
				implyMaxPrevote: true,
				maxHeightCertified: 0,
			}),
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
			beforeTransactionsExecute: jest.fn().mockResolvedValue({ events: [] }),
			afterTransactionsExecute: jest.fn().mockResolvedValue({
				events: [],
				nextValidators: [],
				precommitThreshold: 0,
				certificateThreshold: 0,
			}),
			clear: jest.fn(),
			commit: jest.fn().mockResolvedValue({ stateRoot: getRandomBytes(32) }),
			verifyTransaction: jest.fn(),
			executeTransaction: jest.fn().mockResolvedValue({ events: [] }),
			initStateMachine: jest.fn().mockResolvedValue({ contextID: getRandomBytes(32) }),
			insertAssets: jest.fn().mockResolvedValue({ assets: [] }),
		} as never;
		bft = {
			beforeTransactionsExecute: jest.fn(),
			api: {
				getBFTHeights: jest.fn().mockResolvedValue({
					maxHeightPrevoted: 0,
					maxHeightPrecommitted: 0,
					maxHeightCertified: 0,
				}),
				setBFTParameters: jest.fn(),
				setGeneratorKeys: jest.fn(),
				getBFTParameters: jest.fn().mockResolvedValue({ validators: [] }),
				existBFTParameters: jest.fn().mockResolvedValue(false),
			},
		} as never;

		generator = new Generator({
			abi,
			bft,
			chain,
			consensus,
			network,
			generationConfig: {
				generators: genesisDelegates.delegates.map(d => ({
					address: Buffer.from(d.address, 'hex'),
					encryptedPassphrase: d.encryptedPassphrase,
				})),
				password: genesisDelegates.delegates[0].password,
				waitThreshold: 2,
			},
			genesisConfig: configUtils.constantsConfig(),
		});
	});

	describe('init', () => {
		describe('loadGenerator', () => {
			let accountDetails: {
				readonly address: Buffer;
				readonly encryptedPassphrase: string;
			};

			beforeEach(() => {
				accountDetails = {
					address: getAddressFromPublicKey(
						Buffer.from('75e99d6f2359ebaba661d0651c04f3d9cb8cd405d452e30af9f5d10e1cf732ed'),
					),
					encryptedPassphrase:
						'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=8aa7c85bdad53ef1bce5877f9d6160b2e4e77e40bc3e7e64781ad0ea19fe4fa8f6239d00138b03a2fb8724f3f206268b7c5825724b436e0c08f1a489122a35640c20511d9d32423a3c55115f8833f9e4f9863179837674e28fd109b2a49bf158038669386f7e0f385fd8460ad6a86b8119876bd2040c3ad6c27492d139bc76e225a7796c00380769cb62feaaf502d9a4106d3952680ede743fd895f5&mac=6b6f362b3dd09507632d191acaaa26390f572a08dd9bceca57f2c3025df518e1&salt=673748497daee381fd2a4b656a8cd91b&iv=87a4d0885de25939396ffa32&tag=ac0d3f2dbaf99c9afafbef49f86f2bf5&iterations=1&parallelism=4&memorySize=2024',
				};
				generator['_config'].force = true;
				generator['_config'].generators = [];
			});

			it('should not load any delegates when forging.force is false', async () => {
				generator['_config'].force = false;
				generator['_config'].generators = generators;

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});
				return expect(generator['_keypairs'].values()).toHaveLength(0);
			});

			it('should not load any delegates when forging.delegates array is empty', async () => {
				generator['_config'].force = true;
				generator['_config'].generators = [];

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});
				return expect(generator['_keypairs'].values()).toHaveLength(0);
			});

			it('should not load any delegates when forging.delegates list is undefined', async () => {
				generator['_config'].force = true;
				generator['_config'].generators = undefined as never;

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});

				return expect(generator['_keypairs'].values()).toHaveLength(0);
			});

			it('should return error if number of iterations is omitted', async () => {
				generator['_config'].force = true;
				generator['_config'].generators = [accountDetails];

				await expect(
					generator.init({
						blockchainDB,
						generatorDB,
						logger,
					}),
				).rejects.toThrow(
					`Invalid encryptedPassphrase for address: ${accountDetails.address.toString(
						'hex',
					)}. Unsupported state or unable to authenticate data`,
				);
			});

			it('should return error if encrypted passphrase is invalid', async () => {
				generator['_config'].generators = [accountDetails];

				await expect(
					generator.init({
						blockchainDB,
						generatorDB,
						logger,
					}),
				).rejects.toThrow(
					`Invalid encryptedPassphrase for address: ${accountDetails.address.toString(
						'hex',
					)}. Unsupported state or unable to authenticate data`,
				);
			});

			it('should load all 101 delegates', async () => {
				generator['_config'].generators = genesisDelegates.delegates.map(d => ({
					address: Buffer.from(d.address, 'hex'),
					encryptedPassphrase: d.encryptedPassphrase,
				}));

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});
				expect(generator['_keypairs'].values()).toHaveLength(103);
			});

			it('should handle finalized height change between max removal height and max height precommitted', async () => {
				jest.spyOn(generator, '_handleFinalizedHeightChanged' as any).mockReturnValue([] as never);
				jest.spyOn(generator['_consensus'], 'getMaxRemovalHeight').mockResolvedValue(313);
				jest
					.spyOn(generator['_bft'].api, 'getBFTHeights')
					.mockResolvedValue({ maxHeightPrecommitted: 515 } as never);

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});
				expect(generator['_handleFinalizedHeightChanged']).toHaveBeenCalledWith(313, 515);
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
			generator['_config'].force = true;
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
			});
		});

		it('should not generate if current block slot is same as last block slot', async () => {
			(consensus.getSlotNumber as jest.Mock).mockReturnValue(lastBlockSlot);
			(consensus.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000));
			await generator['_generateLoop']();

			expect(consensus.getGeneratorAtTimestamp).not.toHaveBeenCalled();
		});

		it('should not generate if validator is not registered for given time', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot);
			(consensus.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue(getRandomBytes(20));
			jest.spyOn(generator, '_generateBlock' as never);
			await generator['_generateLoop']();

			expect(generator['_generateBlock']).not.toHaveBeenCalled();
		});

		it('should wait for threshold time if last block not received', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot - 1);
			(consensus.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000));
			(consensus.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue(
				Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
			);
			jest.spyOn(generator, '_generateBlock' as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).not.toHaveBeenCalled();
		});

		it('should not wait if threshold time passed and last block not received', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot - 1);
			(consensus.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000) - 5);
			(consensus.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue(
				Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
			);

			jest.spyOn(generator, '_generateBlock' as never).mockResolvedValue(forgedBlock as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).toHaveBeenCalled();
		});

		it('should not wait if threshold remaining but last block already received', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot);
			(consensus.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000) + 5);
			(consensus.getGeneratorAtTimestamp as jest.Mock).mockResolvedValue(
				Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
			);

			jest.spyOn(generator, '_generateBlock' as never).mockResolvedValue(forgedBlock as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).toHaveBeenCalled();
		});
	});

	describe('generateBlock', () => {
		const generatorAddress = getRandomBytes(20);
		const keypair = {
			publicKey: getRandomBytes(32),
			privateKey: getRandomBytes(64),
		};
		const currentTime = Math.floor(Date.now() / 1000);
		const validatorsHash = hash(getRandomBytes(32));
		const assetHash = hash(getRandomBytes(32));
		const aggregateCommit = {
			aggregationBits: Buffer.alloc(0),
			certificateSignature: getRandomBytes(96),
			height: 3456,
		};

		beforeEach(async () => {
			jest
				.spyOn(generator['_forgingStrategy'], 'getTransactionsForBlock')
				.mockResolvedValue({ transactions: [tx], events: [] });
			jest
				.spyOn(generator['_bft'].api, 'getBFTParameters')
				.mockResolvedValue({ validatorsHash } as never);
			jest
				.spyOn(generator['_consensus'], 'getAggregateCommit')
				.mockResolvedValue(aggregateCommit as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
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

			expect(block.header.eventRoot).toEqual(hash(Buffer.alloc(0)));
		});

		it('should assign non empty eventRoot to the block when event exist', async () => {
			jest.spyOn(abi, 'beforeTransactionsExecute').mockResolvedValue({
				events: [
					{
						data: getRandomBytes(32),
						index: 0,
						moduleID: Buffer.from([0, 0, 0, 3]),
						topics: [Buffer.from([0])],
						typeID: Buffer.from([0, 0, 0, 1]),
					},
				],
			});
			const block = await generator.generateBlock({
				generatorAddress,
				timestamp: currentTime,
				privateKey: keypair.privateKey,
				height: 2,
			});

			expect(block.header.eventRoot).not.toEqual(hash(Buffer.alloc(0)));
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
		const address = getAddressFromPassphrase(passphrase);
		const keypair = {
			...getPrivateAndPublicKeyFromPassphrase(passphrase),
			blsSecretKey: generatePrivateKey(Buffer.from(passphrase, 'utf-8')),
		};
		const blsPK = getPublicKeyFromPrivateKey(keypair.blsSecretKey);
		const blockHeader = createFakeBlockHeader();

		beforeEach(async () => {
			generator['_keypairs'].set(address, keypair);
			when(generator['_bft'].api.existBFTParameters as jest.Mock)
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
			when(generator['_bft'].api.getBFTParameters as jest.Mock)
				.calledWith(expect.anything(), 11)
				.mockResolvedValue({ validators: [{ address }] })
				.calledWith(expect.anything(), 20)
				.mockResolvedValue({ validators: [] })
				.calledWith(expect.anything(), 50)
				.mockResolvedValue({ validators: [{ address }] })
				.calledWith(expect.anything(), 54)
				.mockResolvedValue({ validators: [] });

			jest
				.spyOn(generator['_chain'].dataAccess, 'getBlockHeaderByHeight')
				.mockResolvedValue(blockHeader as never);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
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
				blsPublicKey: blsPK,
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

		it('should call certifySingleCommit for finalized height + 1 when BFT params does not exist', async () => {
			// For height 50, it should ceritifySingleCommit event though BFTParameter does not exist
			await Promise.all(generator['_handleFinalizedHeightChanged'](15, 50));

			// Assert
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledTimes(1);
			expect(generator['_consensus'].certifySingleCommit).toHaveBeenCalledWith(blockHeader, {
				address,
				blsPublicKey: blsPK,
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
