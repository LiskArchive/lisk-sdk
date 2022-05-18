/*
 * Copyright © 2022 Lisk Foundation
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

import * as os from 'os';
import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { BaseModule, TokenModule } from '../../../src';
import { ABIHandler } from '../../../src/abi_handler/abi_handler';
import { transferParamsSchema } from '../../../src/modules/token/schemas';
import { StateMachine } from '../../../src/node/state_machine';
import { applicationConfigSchema } from '../../../src/schema';
import { createFakeBlockHeader } from '../../../src/testing';
import { channelMock } from '../../../src/testing/mocks';
import { genesisBlock } from '../../fixtures';
import { fakeLogger } from '../../utils/node';

describe('abi handler', () => {
	let abiHandler: ABIHandler;
	const genesis = genesisBlock();

	beforeEach(() => {
		const stateMachine = new StateMachine();
		const mod = new TokenModule();
		jest.spyOn(mod.commands[0], 'execute').mockResolvedValue();
		stateMachine.registerModule(mod as BaseModule);
		abiHandler = new ABIHandler({
			logger: fakeLogger,
			channel: channelMock,
			stateDB: (new InMemoryKVStore() as unknown) as KVStore,
			moduleDB: (new InMemoryKVStore() as unknown) as KVStore,
			genesisBlock: genesis,
			stateMachine,
			modules: [mod],
			config: applicationConfigSchema.default,
		});
	});

	describe('init', () => {
		it('should return valid response', async () => {
			jest.spyOn(os, 'homedir').mockReturnValue('/User/lisk');
			const resp = await abiHandler.init({});

			expect(resp.genesisBlock).toEqual({
				header: genesis.header.toObject(),
				assets: genesis.assets.getAll(),
				transactions: [],
			});
			expect(resp.registeredModules).toHaveLength(1);
			expect(resp.config).toMatchSnapshot();
		});
	});

	describe('initStateMachine', () => {
		it('should fail if execution context exists', async () => {
			abiHandler['_executionContext'] = {
				id: getRandomBytes(32),
			} as never;
			await expect(
				abiHandler.initStateMachine({
					header: createFakeBlockHeader().toObject(),
					networkIdentifier: getRandomBytes(32),
				}),
			).rejects.toThrow('Execution context is already initialized');
		});

		it('should create execution context and resolve context id', async () => {
			const networkIdentifier = getRandomBytes(32);
			const resp = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier,
			});
			expect(resp.contextID).toHaveLength(32);
			expect(abiHandler['_executionContext']).not.toBeUndefined();
			expect(abiHandler['_executionContext']?.networkIdentifier).toEqual(networkIdentifier);
			expect(abiHandler['_executionContext']?.stateStore).toBeInstanceOf(StateStore);
		});
	});

	describe('initGenesisState', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.initGenesisState({
					contextID: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.initGenesisState({
					contextID: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute genesis block and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeGenesisBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			const resp = await abiHandler.initGenesisState({
				contextID,
				stateRoot: getRandomBytes(32),
			});
			expect(abiHandler['_stateMachine'].executeGenesisBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
			expect(resp.assets).toEqual(genesis.assets.getAll());
			expect(resp.nextValidators).toBeArray();
			expect(resp.certificateThreshold).toEqual(BigInt(0));
			expect(resp.preCommitThreshold).toEqual(BigInt(0));
		});
	});

	describe('insertAssets', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.insertAssets({
					contextID: getRandomBytes(32),
					finalizedHeight: 0,
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.insertAssets({
					contextID: getRandomBytes(32),
					finalizedHeight: 0,
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute insertAssets and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'insertAssets');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			const resp = await abiHandler.insertAssets({
				contextID,
				finalizedHeight: 0,
			});
			expect(abiHandler['_stateMachine'].insertAssets).toHaveBeenCalledTimes(1);

			expect(resp.assets).toEqual([]);
		});
	});

	describe('verifyAssets', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.verifyAssets({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.verifyAssets({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute verifyAssets and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyAssets');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			const resp = await abiHandler.verifyAssets({
				contextID,
				assets: [{ data: getRandomBytes(30), moduleID: 2 }],
			});
			expect(abiHandler['_stateMachine'].verifyAssets).toHaveBeenCalledTimes(1);

			expect(resp).not.toBeUndefined();
		});
	});

	describe('beforeTransactionsExecute', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.beforeTransactionsExecute({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
					consensus: {
						currentValidators: [
							{
								address: getRandomBytes(20),
								bftWeight: BigInt(1),
								blsKey: getRandomBytes(48),
								generatorKey: getRandomBytes(32),
							},
						],
						implyMaxPrevote: false,
						maxHeightCertified: 0,
					},
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.beforeTransactionsExecute({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
					consensus: {
						currentValidators: [
							{
								address: getRandomBytes(20),
								bftWeight: BigInt(1),
								blsKey: getRandomBytes(48),
								generatorKey: getRandomBytes(32),
							},
						],
						implyMaxPrevote: false,
						maxHeightCertified: 0,
					},
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute beforeTransactionsExecute and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'beforeExecuteBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			const resp = await abiHandler.beforeTransactionsExecute({
				contextID,
				assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				consensus: {
					currentValidators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(1),
							blsKey: getRandomBytes(48),
							generatorKey: getRandomBytes(32),
						},
					],
					implyMaxPrevote: false,
					maxHeightCertified: 0,
				},
			});
			expect(abiHandler['_stateMachine'].beforeExecuteBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
		});
	});

	describe('afterTransactionsExecute', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.afterTransactionsExecute({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
					consensus: {
						currentValidators: [
							{
								address: getRandomBytes(20),
								bftWeight: BigInt(1),
								blsKey: getRandomBytes(48),
								generatorKey: getRandomBytes(32),
							},
						],
						implyMaxPrevote: false,
						maxHeightCertified: 0,
					},
					transactions: [],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.afterTransactionsExecute({
					contextID: getRandomBytes(32),
					assets: [{ data: getRandomBytes(30), moduleID: 2 }],
					consensus: {
						currentValidators: [
							{
								address: getRandomBytes(20),
								bftWeight: BigInt(1),
								blsKey: getRandomBytes(48),
								generatorKey: getRandomBytes(32),
							},
						],
						implyMaxPrevote: false,
						maxHeightCertified: 0,
					},
					transactions: [],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute afterTransactionsExecute and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'afterExecuteBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			const resp = await abiHandler.afterTransactionsExecute({
				contextID,
				assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				consensus: {
					currentValidators: [
						{
							address: getRandomBytes(20),
							bftWeight: BigInt(1),
							blsKey: getRandomBytes(48),
							generatorKey: getRandomBytes(32),
						},
					],
					implyMaxPrevote: false,
					maxHeightCertified: 0,
				},
				transactions: [],
			});
			expect(abiHandler['_stateMachine'].afterExecuteBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
		});
	});

	describe('verifyTransaction', () => {
		it('should execute verifyTransaction with existing context when context ID is not empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyTransaction');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				getRandomBytes(20),
				getRandomBytes(100),
			);
			const tx = new Transaction({
				commandID: 2,
				fee: BigInt(30),
				moduleID: 2,
				nonce: BigInt(2),
				params: getRandomBytes(100),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(64)],
			});
			const resp = await abiHandler.verifyTransaction({
				contextID,
				networkIdentifier: getRandomBytes(32),
				transaction: tx.toObject(),
			});

			expect(abiHandler['_stateMachine'].verifyTransaction).toHaveBeenCalledTimes(1);
			expect(
				(abiHandler['_stateMachine'].verifyTransaction as jest.Mock).mock.calls[0][0][
					'_stateStore'
				],
			).toEqual(abiHandler['_executionContext']?.stateStore);
			expect(resp.result).toEqual(0);
		});

		it('should execute verifyTransaction with new context when context ID is empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyTransaction');
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				getRandomBytes(20),
				getRandomBytes(100),
			);
			const tx = new Transaction({
				commandID: 2,
				fee: BigInt(30),
				moduleID: 2,
				nonce: BigInt(2),
				params: getRandomBytes(100),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(64)],
			});
			const resp = await abiHandler.verifyTransaction({
				contextID: Buffer.alloc(0),
				networkIdentifier: getRandomBytes(32),
				transaction: tx.toObject(),
			});

			expect(abiHandler['_stateMachine'].verifyTransaction).toHaveBeenCalledTimes(1);
			expect(
				(abiHandler['_stateMachine'].verifyTransaction as jest.Mock).mock.calls[0][0][
					'_stateStore'
				],
			).not.toEqual(abiHandler['_executionContext']?.stateStore);
			expect(resp.result).toEqual(0);
		});
	});

	describe('executeTransaction', () => {
		it('should execute executeTransaction with existing context when context ID is not empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeTransaction');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				getRandomBytes(20),
				getRandomBytes(100),
			);
			const tx = new Transaction({
				commandID: 0,
				fee: BigInt(30),
				moduleID: 2,
				nonce: BigInt(2),
				params: codec.encode(transferParamsSchema, {}),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(64)],
			});
			const resp = await abiHandler.executeTransaction({
				contextID,
				networkIdentifier: getRandomBytes(32),
				assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				dryRun: false,
				header: createFakeBlockHeader().toObject(),
				transaction: tx.toObject(),
			});

			expect(abiHandler['_stateMachine'].executeTransaction).toHaveBeenCalledTimes(1);
			expect(
				(abiHandler['_stateMachine'].executeTransaction as jest.Mock).mock.calls[0][0][
					'_stateStore'
				],
			).toEqual(abiHandler['_executionContext']?.stateStore);
			expect(resp.result).toEqual(0);
		});

		it('should execute executeTransaction with new context when context ID is empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeTransaction');
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				getRandomBytes(20),
				getRandomBytes(100),
			);
			const tx = new Transaction({
				commandID: 0,
				fee: BigInt(30),
				moduleID: 2,
				nonce: BigInt(2),
				params: codec.encode(transferParamsSchema, {}),
				senderPublicKey: getRandomBytes(32),
				signatures: [getRandomBytes(64)],
			});
			const resp = await abiHandler.executeTransaction({
				contextID: getRandomBytes(0),
				networkIdentifier: getRandomBytes(32),
				assets: [{ data: getRandomBytes(30), moduleID: 2 }],
				dryRun: true,
				header: createFakeBlockHeader().toObject(),
				transaction: tx.toObject(),
			});

			expect(abiHandler['_stateMachine'].executeTransaction).toHaveBeenCalledTimes(1);
			expect(
				(abiHandler['_stateMachine'].executeTransaction as jest.Mock).mock.calls[0][0][
					'_stateStore'
				],
			).not.toEqual(abiHandler['_executionContext']?.stateStore);
			expect(resp.result).toEqual(0);
		});
	});

	describe('commit', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.commit({
					contextID: getRandomBytes(32),
					dryRun: true,
					expectedStateRoot: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.commit({
					contextID: getRandomBytes(32),
					dryRun: true,
					expectedStateRoot: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it.todo('should resolve updated state root without saving when dryRun == true');

		it.todo(
			'should reject before saving if new state root is different from the expected stateRoot',
		);

		it.todo('should resolve updated state root after saving all the states');
	});

	describe('revert', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.revert({
					contextID: getRandomBytes(32),
					expectedStateRoot: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			await expect(
				abiHandler.revert({
					contextID: getRandomBytes(32),
					expectedStateRoot: getRandomBytes(32),
					stateRoot: getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it.todo('should resolve updated state root');

		it.todo('should revert all the sates');
	});

	describe('clear', () => {
		it('should clear the execution context', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
				networkIdentifier: getRandomBytes(32),
			});
			expect(abiHandler['_executionContext']).not.toBeUndefined();
			await abiHandler.clear({});

			expect(abiHandler['_executionContext']).toBeUndefined();
		});
	});

	describe('finalized', () => {
		it('should clean up all the finalized state', async () => {
			jest.spyOn(abiHandler['_stateDB'], 'clear');

			await abiHandler.finalize({
				finalizedHeight: 10,
			});
			expect(abiHandler['_stateDB'].clear).toHaveBeenCalledTimes(1);
		});
	});

	describe('getMetadata', () => {
		it.todo('should resolve metadata from all the modules');
	});

	describe('query', () => {
		it.todo('should query module endpoint with expected context');

		it.todo('should query plugin endpoint with expected context');
	});

	describe('prove', () => {
		it.todo('should provide proof based on the queries provided');
	});
});
