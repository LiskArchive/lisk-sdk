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
import * as fs from 'fs';
import { Block, BlockAssets, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, StateDB } from '@liskhq/lisk-db';
import { BaseModule, TokenModule } from '../../../src';
import { ABIHandler } from '../../../src/abi_handler/abi_handler';
import { transferParamsSchema } from '../../../src/modules/token/schemas';
import { StateMachine } from '../../../src/state_machine';
import { applicationConfigSchema } from '../../../src/schema';
import { createFakeBlockHeader } from '../../../src/testing';
import { channelMock, loggerMock } from '../../../src/testing/mocks';
import { fakeLogger } from '../../utils/mocks';
import { TransactionExecutionResult, TransactionVerifyResult } from '../../../src/abi';
import { AuthModule } from '../../../src/modules/auth';
import { InMemoryPrefixedStateDB } from '../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../src/state_machine/prefixed_state_read_writer';

describe('abi handler', () => {
	let abiHandler: ABIHandler;
	let stateDBMock: StateDB;
	let root: Buffer;

	beforeEach(async () => {
		jest
			.spyOn(fs, 'readFileSync')
			.mockReturnValue(new Block(createFakeBlockHeader(), [], new BlockAssets()).getBytes());
		stateDBMock = {
			get: jest.fn(),
			finalize: jest.fn(),
			revert: jest.fn(),
			getCurrentState: jest.fn(),
			newReadWriter: () => new InMemoryPrefixedStateDB(),
		} as never;
		const stateMachine = new StateMachine();
		const mod = new TokenModule();
		const mod2 = new AuthModule();
		jest.spyOn(mod.commands[0], 'execute').mockResolvedValue();
		stateMachine.registerModule(mod as BaseModule);
		abiHandler = new ABIHandler({
			logger: fakeLogger,
			channel: channelMock,
			stateDB: stateDBMock as never,
			moduleDB: new InMemoryDatabase() as never,
			stateMachine,
			modules: [mod2, mod],
			config: {
				...applicationConfigSchema.default,
				genesis: { ...applicationConfigSchema.default.genesis, chainID: '10000000' },
			},
			chainID: Buffer.from('10000000', 'hex'),
		});
		abiHandler['_chainID'] = utils.getRandomBytes(32);
		await stateMachine.init(loggerMock, {
			...applicationConfigSchema.default.genesis,
			chainID: '00000000',
		});
		root = utils.getRandomBytes(32);
	});

	describe('init', () => {
		it('should not revert state and cache chainID if state is correct', async () => {
			const stateMachine = new StateMachine();
			const mod = new TokenModule();
			jest.spyOn(mod.commands[0], 'execute').mockResolvedValue();
			stateMachine.registerModule(mod as BaseModule);
			abiHandler = new ABIHandler({
				logger: fakeLogger,
				channel: channelMock,
				stateDB: stateDBMock as never,
				moduleDB: new InMemoryDatabase() as never,
				stateMachine,
				modules: [mod],
				config: {
					...applicationConfigSchema.default,
					genesis: { ...applicationConfigSchema.default.genesis, chainID: '10000000' },
				},
				chainID: Buffer.from('10000000', 'hex'),
			});
			(stateDBMock.getCurrentState as jest.Mock).mockResolvedValue({ root, version: 21 });

			const chainID = Buffer.from('10000000', 'hex');
			await abiHandler.init({ chainID, lastBlockHeight: 21, lastStateRoot: root });
			expect(stateDBMock.revert).not.toHaveBeenCalled();

			expect(abiHandler.chainID).toEqual(chainID);
		});

		it('should revert state until the same height', async () => {
			(stateDBMock.getCurrentState as jest.Mock).mockResolvedValue({ root, version: 21 });

			(stateDBMock.revert as jest.Mock).mockResolvedValue(root);

			await abiHandler.init({ chainID: Buffer.alloc(4), lastBlockHeight: 19, lastStateRoot: root });

			expect(stateDBMock.revert).toHaveBeenCalledTimes(2);
		});

		it('should reject init if states are different with the same height', async () => {
			(stateDBMock.getCurrentState as jest.Mock).mockResolvedValue({ root, version: 21 });

			(stateDBMock.revert as jest.Mock).mockResolvedValue(root);

			await expect(
				abiHandler.init({
					chainID: Buffer.alloc(4),
					lastBlockHeight: 19,
					lastStateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('State cannot be recovered. Conflict at height 19');

			expect(stateDBMock.revert).toHaveBeenCalledTimes(2);
		});

		it('should reject init if engine last block height is higher than application height', async () => {
			((stateDBMock as any).getCurrentState as jest.Mock).mockResolvedValue({ root, version: 21 });

			(stateDBMock.revert as jest.Mock).mockResolvedValue(root);

			await expect(
				abiHandler.init({
					chainID: Buffer.alloc(4),
					lastBlockHeight: 22,
					lastStateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Invalid engine state');

			expect(stateDBMock.revert).not.toHaveBeenCalled();
		});
	});

	describe('initStateMachine', () => {
		it('should fail if execution context exists', async () => {
			abiHandler['_executionContext'] = {
				id: utils.getRandomBytes(32),
			} as never;
			await expect(
				abiHandler.initStateMachine({
					header: createFakeBlockHeader().toObject(),
				}),
			).rejects.toThrow('Execution context is already initialized');
		});

		it('should create execution context and resolve context id', async () => {
			const resp = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			expect(resp.contextID).toHaveLength(32);
			expect(abiHandler['_executionContext']).toBeDefined();
			expect(abiHandler['_executionContext']?.stateStore).toBeInstanceOf(PrefixedStateReadWriter);
		});
	});

	describe('initGenesisState', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.initGenesisState({
					contextID: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.initGenesisState({
					contextID: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute genesis block and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeGenesisBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			const resp = await abiHandler.initGenesisState({
				contextID,
				stateRoot: utils.getRandomBytes(32),
			});
			expect(abiHandler['_stateMachine'].executeGenesisBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
			expect(resp.nextValidators).toBeArray();
			expect(resp.certificateThreshold).toEqual(BigInt(0));
			expect(resp.preCommitThreshold).toEqual(BigInt(0));
		});
	});

	describe('insertAssets', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.insertAssets({
					contextID: utils.getRandomBytes(32),
					finalizedHeight: 0,
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.insertAssets({
					contextID: utils.getRandomBytes(32),
					finalizedHeight: 0,
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute insertAssets and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'insertAssets');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
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
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.verifyAssets({
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute verifyAssets and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyAssets');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			const resp = await abiHandler.verifyAssets({
				contextID,
				assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
			});
			expect(abiHandler['_stateMachine'].verifyAssets).toHaveBeenCalledTimes(1);

			expect(resp).toBeDefined();
		});
	});

	describe('beforeTransactionsExecute', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.beforeTransactionsExecute({
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.beforeTransactionsExecute({
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute beforeTransactionsExecute and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'beforeExecuteBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			const resp = await abiHandler.beforeTransactionsExecute({
				contextID,
				assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
			});
			expect(abiHandler['_stateMachine'].beforeExecuteBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
		});
	});

	describe('afterTransactionsExecute', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.afterTransactionsExecute({
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
					transactions: [],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.afterTransactionsExecute({
					contextID: utils.getRandomBytes(32),
					assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
					transactions: [],
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should execute afterTransactionsExecute and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'afterExecuteBlock');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			const resp = await abiHandler.afterTransactionsExecute({
				contextID,
				assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				transactions: [],
			});
			expect(abiHandler['_stateMachine'].afterExecuteBlock).toHaveBeenCalledTimes(1);

			expect(resp.events).toBeArray();
		});
	});

	describe('verifyTransaction', () => {
		it('should execute verifyTransaction with existing context when context ID is not empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyTransaction');
			const header = createFakeBlockHeader().toObject();
			const { contextID } = await abiHandler.initStateMachine({
				header,
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				utils.getRandomBytes(20),
				utils.getRandomBytes(100),
			);
			const tx = new Transaction({
				command: 'transfer',
				fee: BigInt(30),
				module: 'token',
				nonce: BigInt(2),
				params: utils.getRandomBytes(100),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			const resp = await abiHandler.verifyTransaction({
				contextID,
				transaction: tx.toObject(),
				header,
			});

			expect(abiHandler['_stateMachine'].verifyTransaction).toHaveBeenCalledTimes(1);
			expect(
				(abiHandler['_stateMachine'].verifyTransaction as jest.Mock).mock.calls[0][0][
					'_stateStore'
				],
			).toEqual(abiHandler['_executionContext']?.stateStore);
			expect(resp.result).toEqual(TransactionVerifyResult.INVALID);
		});

		it('should execute verifyTransaction with new context when context ID is empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'verifyTransaction');
			const header = createFakeBlockHeader({ height: 10 }).toObject();
			await abiHandler.initStateMachine({
				header,
			});
			// Add random data to check if new state store is used or not
			const key = utils.getRandomBytes(20);
			await abiHandler['_executionContext']?.stateStore.set(key, utils.getRandomBytes(100));
			const tx = new Transaction({
				command: 'transfer',
				fee: BigInt(30),
				module: 'token',
				nonce: BigInt(2),
				params: utils.getRandomBytes(100),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			const resp = await abiHandler.verifyTransaction({
				contextID: Buffer.alloc(0),
				transaction: tx.toObject(),
				header,
			});

			expect(abiHandler['_stateMachine'].verifyTransaction).toHaveBeenCalledTimes(1);
			const usedStateStore = (abiHandler['_stateMachine'].verifyTransaction as jest.Mock).mock
				.calls[0][0]['_stateStore'];
			const usedHeader = (abiHandler['_stateMachine'].verifyTransaction as jest.Mock).mock
				.calls[0][0]['_header'];
			expect(usedHeader.height).toBe(10);
			// Expect used state store does not have previous information
			await expect(usedStateStore.has(key)).resolves.toBeFalse();
			expect(resp.result).toEqual(TransactionVerifyResult.INVALID);
		});
	});

	describe('executeTransaction', () => {
		it('should execute executeTransaction with existing context when context ID is not empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeTransaction');
			const { contextID } = await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			// Add random data to check if new state store is used or not
			await abiHandler['_executionContext']?.stateStore.set(
				utils.getRandomBytes(20),
				utils.getRandomBytes(100),
			);
			const tx = new Transaction({
				command: 'transfer',
				fee: BigInt(30),
				module: 'token',
				nonce: BigInt(2),
				params: codec.encode(transferParamsSchema, {
					tokenID: Buffer.alloc(8, 0),
					amount: BigInt(0),
					recipientAddress: Buffer.alloc(20, 2),
					data: '',
				}),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			const resp = await abiHandler.executeTransaction({
				contextID,
				assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
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
			expect(resp.result).toEqual(TransactionExecutionResult.OK);
		});

		it('should execute executeTransaction with new context when context ID is empty and resolve the response', async () => {
			jest.spyOn(abiHandler['_stateMachine'], 'executeTransaction');
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			// Add random data to check if new state store is used or not
			const key = utils.getRandomBytes(20);
			await abiHandler['_executionContext']?.stateStore.set(key, utils.getRandomBytes(100));
			const tx = new Transaction({
				command: 'transfer',
				fee: BigInt(30),
				module: 'token',
				nonce: BigInt(2),
				params: codec.encode(transferParamsSchema, {
					tokenID: Buffer.alloc(8, 0),
					amount: BigInt(0),
					recipientAddress: Buffer.alloc(20, 2),
					data: '',
				}),
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [utils.getRandomBytes(64)],
			});
			const resp = await abiHandler.executeTransaction({
				contextID: utils.getRandomBytes(0),
				assets: [{ data: utils.getRandomBytes(30), module: 'token' }],
				dryRun: true,
				header: createFakeBlockHeader().toObject(),
				transaction: tx.toObject(),
			});

			expect(abiHandler['_stateMachine'].executeTransaction).toHaveBeenCalledTimes(1);
			const usedStateStore = (abiHandler['_stateMachine'].executeTransaction as jest.Mock).mock
				.calls[0][0]['_stateStore'];
			// Expect used state store does not have previous information
			await expect(usedStateStore.has(key)).resolves.toBeFalse();
			expect(resp.result).toEqual(TransactionExecutionResult.OK);
		});
	});

	describe('commit', () => {
		it('should fail if execution context does not exist', async () => {
			await expect(
				abiHandler.commit({
					contextID: utils.getRandomBytes(32),
					dryRun: true,
					expectedStateRoot: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.commit({
					contextID: utils.getRandomBytes(32),
					dryRun: true,
					expectedStateRoot: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
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
					contextID: utils.getRandomBytes(32),
					expectedStateRoot: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Context is not initialized or different');
		});

		it('should fail if execution context does not match', async () => {
			await abiHandler.initStateMachine({
				header: createFakeBlockHeader().toObject(),
			});
			await expect(
				abiHandler.revert({
					contextID: utils.getRandomBytes(32),
					expectedStateRoot: utils.getRandomBytes(32),
					stateRoot: utils.getRandomBytes(32),
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
			});
			expect(abiHandler['_executionContext']).toBeDefined();
			await abiHandler.clear({});

			expect(abiHandler['_executionContext']).toBeUndefined();
		});
	});

	describe('finalized', () => {
		it('should clean up all the finalized state', async () => {
			jest.spyOn(abiHandler['_stateDB'], 'finalize');

			await abiHandler.finalize({
				finalizedHeight: 10,
			});
			expect(abiHandler['_stateDB'].finalize).toHaveBeenCalledTimes(1);
		});
	});

	describe('getMetadata', () => {
		it('should resolve metadata from all the modules', async () => {
			const resp = await abiHandler.getMetadata({});
			expect(resp.data).toBeInstanceOf(Buffer);
			const body = JSON.parse(resp.data.toString('utf-8'));
			expect(body.modules).toHaveLength(2);
			expect(body.modules[0].name).toBe('auth');
			expect(body.modules[1].name).toBe('token');
			expect(body.modules[0].name.localeCompare(body.modules[1].name, 'en')).toBeLessThan(0);
		});
	});

	describe('query', () => {
		it('should query module endpoint with expected context and return response', async () => {
			jest.spyOn(abiHandler['_channel'], 'invoke').mockResolvedValue({
				some: 'response',
			});

			const resp = await abiHandler.query({
				header: { height: 30 } as never,
				method: 'sample_method',
				params: Buffer.from(JSON.stringify({ random: 'info' })),
			});

			expect(JSON.parse(resp.data.toString('utf-8'))).toEqual({ some: 'response' });
		});

		it('should query endpoint and return error response when error happens', async () => {
			jest.spyOn(abiHandler['_channel'], 'invoke').mockRejectedValue(new Error('invalid logic'));

			const resp = await abiHandler.query({
				header: { height: 30 } as never,
				method: 'sample_method',
				params: Buffer.from(JSON.stringify({ random: 'info' })),
			});

			expect(JSON.parse(resp.data.toString('utf-8'))).toEqual({
				error: { message: 'invalid logic' },
			});
		});
	});

	describe('prove', () => {
		it.todo('should provide proof based on the queries provided');
	});
});
