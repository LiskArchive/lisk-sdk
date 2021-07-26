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
import { Chain, Transaction } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey, getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { Generator } from '../../../../src/node/generator';
import { Consensus, GeneratorModule } from '../../../../src/node/generator/types';
import { Network } from '../../../../src/node/network';
import { StateMachine } from '../../../../src/node/state_machine';
import { configUtils } from '../../../utils';
import { fakeLogger } from '../../../utils/node';

import * as genesisDelegates from '../../../fixtures/genesis_delegates.json';
import { NETWORK_RPC_GET_TRANSACTIONS } from '../../../../src/node/generator/constants';
import { getTransactionsResponseSchema } from '../../../../src/node/generator/schemas';

describe('generator', () => {
	const logger = fakeLogger;
	const generators = [
		{
			publicKey: Buffer.from(
				'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f', 'hex'),
			).toString('hex'),
			encryptedPassphrase:
				'iterations=1&salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
		},
		{
			publicKey: Buffer.from(
				'141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a', 'hex'),
			).toString('hex'),
			encryptedPassphrase:
				'iterations=1&salt=5c709afdae35d43d4090e9ef31d14d85&cipherText=c205189b91f797c3914f5d82ccc7cccfb3c620cef512c3bf8f50cd280bd5ff1450e8b9be997179582e62bec0cb655ca2eb8ff6833892f9e350dc5182b61bd648cd02f7f95468c7ec51aa3b43&iv=bfae7a255077c6de61a1ec59&tag=59cfd0a55d39a765a84725f4be464179&version=1',
		},
		{
			publicKey: Buffer.from(
				'3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
				'hex',
			),
			address: getAddressFromPublicKey(
				Buffer.from('3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135', 'hex'),
			).toString('hex'),
			encryptedPassphrase:
				'iterations=1&salt=588600600cd7660cf2346cd390093900&cipherText=6469aca1fe386e709c89c9a1d644abd969e64326f0f27f7be25248727892ec860e1e2dae54d283e65b1d21657a74047fb46ba732d1c83b93c8e2c0c96e98c2a9c4d87d0ac23db6dec9e3728426e3&iv=357d723a607f5baaf1fb218a&tag=f42bc3722b2964806d83a8ca3da2f94d&version=1',
		},
	];
	const txBytes =
		'0805100118012080ade2042a20f7e7627120dab14b80b6e4f361ba89db251ee838708c3a74c6c2cc08ad793f58321d0a1b0a1432fc1c23b73db1c6205327b1cab44318e61678ea1080dac4093a40a0be9e52d9e0a53406c55a74ab0d7d106eb276a47dd88d3dc2284ed62024b2448e0bd5af1623ae7d793606a58c27d742e8855ba339f757d56972c4c6efad750c';
	const tx = new Transaction({
		asset: Buffer.alloc(20),
		assetID: 0,
		fee: BigInt(100000000),
		moduleID: 2,
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(32),
		signatures: [Buffer.alloc(64)],
	});

	let generator: Generator;
	let chain: Chain;
	let consensus: Consensus;
	let stateMachine: StateMachine;
	let network: Network;
	let blockchainDB: KVStore;
	let generatorDB: KVStore;

	beforeEach(() => {
		blockchainDB = new InMemoryKVStore() as never;
		generatorDB = new InMemoryKVStore() as never;
		chain = {
			lastBlock: {
				header: {
					id: Buffer.from('6846255774763267134'),
					height: 9187702,
					timestamp: 93716450,
				},
				payload: [],
			},
			dataAccess: {
				decodeTransaction: jest.fn().mockReturnValue(tx),
			},
			constants: {
				networkIdentifier: Buffer.from('networkIdentifier'),
			},
		} as never;
		consensus = {
			getSlotNumber: jest.fn(),
			getSlotTime: jest.fn(),
			getGenerator: jest.fn(),
			execute: jest.fn(),
		} as never;

		stateMachine = {
			verifyTransaction: jest.fn(),
			beforeExecuteBlock: jest.fn(),
			afterExecuteBlock: jest.fn(),
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

		generator = new Generator({
			chain,
			consensus,
			network,
			stateMachine,
			generatorConfig: {
				generators: genesisDelegates.delegates,
				defaultPassword: genesisDelegates.delegates[0].password,
				modules: {},
				waitThreshold: 2,
			},
			genesisConfig: configUtils.constantsConfig(),
		});
	});

	describe('init', () => {
		describe('loadGenerator', () => {
			let accountDetails: {
				readonly address: string;
				readonly encryptedPassphrase: string;
			};

			beforeEach(() => {
				accountDetails = {
					address: getAddressFromPublicKey(
						Buffer.from('9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f'),
					).toString('hex'),
					encryptedPassphrase:
						'salt=8c79d754416acccb567a42cf62b2e3bb&cipherText=73f5827fcd8eeab475abff71476cbce3b1ecacdeac55a738bb2f0a676d8e543bb92c91e1c1e3ddb6cef07a503f034dc7718e39657218d5a955859c5524be06de5954a5875b4c7b1cd11835e3477f1d04&iv=aac6a3b77c0594552bd9c932&tag=86231fb20e7b263264ca68b3585967ca&version=1',
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
					`Invalid encryptedPassphrase for address: ${accountDetails.address}. Unsupported state or unable to authenticate data`,
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
					`Invalid encryptedPassphrase for address: ${accountDetails.address}. Unsupported state or unable to authenticate data`,
				);
			});

			it('should load all 101 delegates', async () => {
				generator['_config'].generators = genesisDelegates.delegates;

				await generator.init({
					blockchainDB,
					generatorDB,
					logger,
				});
				expect(generator['_keypairs'].values()).toHaveLength(103);
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
			generator.onNewBlock({ payload: [tx] } as never);

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
			generator.onDeleteBlock({ payload: [tx] } as never);

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

			expect(consensus.getGenerator).not.toHaveBeenCalled();
		});

		it('should not generate if validator is not registered for given time', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot);
			(consensus.getGenerator as jest.Mock).mockReturnValue(getRandomBytes(20));
			jest.spyOn(generator, '_generateBlock' as never);
			await generator['_generateLoop']();

			expect(generator['_generateBlock']).not.toHaveBeenCalled();
		});

		it('should wait for threshold time if last block not received', async () => {
			(consensus.getSlotNumber as jest.Mock)
				.mockReturnValueOnce(currentSlot)
				.mockReturnValueOnce(lastBlockSlot - 1);
			(consensus.getSlotTime as jest.Mock).mockReturnValue(Math.floor(Date.now() / 1000));
			(consensus.getGenerator as jest.Mock).mockReturnValue(
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
			(consensus.getGenerator as jest.Mock).mockReturnValue(
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
			(consensus.getGenerator as jest.Mock).mockReturnValue(
				Buffer.from(genesisDelegates.delegates[0].address, 'hex'),
			);

			jest.spyOn(generator, '_generateBlock' as never).mockResolvedValue(forgedBlock as never);

			await generator['_generateLoop']();

			expect(generator['_generateBlock']).toHaveBeenCalled();
		});
	});

	describe('_generateBlock', () => {
		let mod1: GeneratorModule;
		let mod2: GeneratorModule;

		const generatorAddress = getRandomBytes(20);
		const keypair = {
			publicKey: getRandomBytes(32),
			privateKey: getRandomBytes(64),
		};
		const currentTime = Math.floor(Date.now() / 1000);

		beforeEach(async () => {
			mod1 = {
				id: 1,
				initBlock: jest.fn(),
			};
			mod2 = {
				id: 2,
				sealBlock: jest.fn(),
			};
			generator.registerModule(mod1);
			generator.registerModule(mod2);
			jest.spyOn(stateMachine, 'beforeExecuteBlock');
			jest.spyOn(stateMachine, 'afterExecuteBlock');
			jest.spyOn(generator['_forgingStrategy'], 'getTransactionsForBlock').mockResolvedValue([tx]);
			await generator.init({
				blockchainDB,
				generatorDB,
				logger,
			});
		});

		it('should call all hooks', async () => {
			const block = await generator['_generateBlock'](generatorAddress, keypair, currentTime);

			expect(mod1.initBlock).toHaveBeenCalledTimes(1);
			expect(mod2.sealBlock).toHaveBeenCalledTimes(1);
			expect(stateMachine.beforeExecuteBlock).toHaveBeenCalledTimes(1);
			expect(stateMachine.afterExecuteBlock).toHaveBeenCalledTimes(1);
			expect(stateMachine.afterExecuteBlock).toHaveBeenCalledAfter(mod2.sealBlock as jest.Mock);

			expect(block.payload).toHaveLength(1);
			expect(block.header.signature).toHaveLength(64);
		});
	});
});
