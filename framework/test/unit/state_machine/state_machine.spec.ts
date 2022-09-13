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
import { Transaction, BlockAssets } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Logger } from '../../../src/logger';
import {
	BlockHeader,
	BlockContext,
	EventQueue,
	GenesisBlockContext,
	StateMachine,
	TransactionContext,
	VerifyStatus,
} from '../../../src/state_machine';
import { CustomCommand0, CustomModule0, CustomModule2 } from './custom_modules';
import {
	EVENT_INDEX_AFTER_TRANSACTIONS,
	EVENT_INDEX_BEFORE_TRANSACTIONS,
	EVENT_INDEX_FINALIZE_GENESIS_STATE,
	EVENT_INDEX_INIT_GENESIS_STATE,
} from '../../../src/state_machine/constants';
import { PrefixedStateReadWriter } from '../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../src/testing/in_memory_prefixed_state';
import { NamedRegistry } from '../../../src/modules/named_registry';
import { loggerMock } from '../../../src/testing/mocks';

describe('state_machine', () => {
	const genesisHeader = {} as BlockHeader;
	const header = {} as BlockHeader;
	const logger = {} as Logger;
	const assets = new BlockAssets();
	let stateStore: PrefixedStateReadWriter;
	let eventQueue: EventQueue;
	const chainID = Buffer.from('network identifier', 'utf8');
	const transaction = {
		module: 'customModule0',
		command: 'customCommand0',
		params: codec.encode(new CustomCommand0(new NamedRegistry(), new NamedRegistry()).schema, {
			data: 'some info',
		}),
	} as Transaction;

	let stateMachine: StateMachine;
	let mod: CustomModule0;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		eventQueue = new EventQueue(0);
		stateMachine = new StateMachine();
		mod = new CustomModule0();
		stateMachine.registerModule(mod);
		await stateMachine.init(loggerMock, {} as any);
	});

	describe('executeGenesisBlock', () => {
		it('should call all registered executeGenesisBlock', async () => {
			const ctx = new GenesisBlockContext({
				eventQueue,
				header: genesisHeader,
				assets,
				logger,
				stateStore,
			});
			await stateMachine.executeGenesisBlock(ctx);
			expect(mod.initGenesisState).toHaveBeenCalledTimes(1);
			expect(mod.initGenesisState).toHaveBeenCalledWith({
				logger,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				header: genesisHeader,
				assets,
				setNextValidators: expect.any(Function),
			});
		});

		it('should add events with a topic with EVENT_INDEX_INIT_GENESIS_STATE and EVENT_INDEX_FINALIZE_GENESIS_STATE', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new GenesisBlockContext({
				eventQueue,
				header: genesisHeader,
				assets,
				logger,
				stateStore,
			});
			await stateMachine.executeGenesisBlock(ctx);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(2);
			expect(events[0].toObject().topics[0]).toEqual(EVENT_INDEX_INIT_GENESIS_STATE);
			expect(events[1].toObject().topics[0]).toEqual(EVENT_INDEX_FINALIZE_GENESIS_STATE);
		});
	});

	describe('verifyTransaction', () => {
		it('should call all registered verifyTransaction and verify of the command', async () => {
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				header,
				chainID,
				transaction,
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			const result = await stateMachine.verifyTransaction(ctx);
			expect(mod.verifyTransaction).toHaveBeenCalledWith({
				chainID,
				logger,
				transaction,
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(mod.commands[0].verify).toHaveBeenCalledTimes(1);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should fail if one of the verify fails', async () => {
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				header,
				chainID,
				transaction,
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			stateMachine.registerModule(new CustomModule2());
			const result = await stateMachine.verifyTransaction(ctx);
			expect(result.status).toBe(VerifyStatus.FAIL);
		});
	});

	describe('executeTransaction', () => {
		it('should call all registered transaction execute hooks', async () => {
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transaction,
				currentValidators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(1),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
				],
				impliesMaxPrevote: true,
				maxHeightCertified: 22,
				certificateThreshold: BigInt(3),
			});
			await stateMachine.executeTransaction(ctx);
			expect(mod.beforeCommandExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				transaction,
				header,
				assets,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: true,
				maxHeightCertified: 22,
				certificateThreshold: BigInt(3),
			});
			expect(mod.afterCommandExecute).toHaveBeenCalledTimes(1);
		});

		it('should add event with a topic with transaction id', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transaction,
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.executeTransaction(ctx);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].toObject().topics[0]).toEqual(transaction.id);
		});

		it('should rollback state if afterCommandExecute fails', async () => {
			const events = [
				{
					module: 'customModule0',
					name: 'customModule0 Event Name',
					height: 12,
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
				},
				{
					module: 'auth',
					name: 'Auth Event Name',
					height: 12,
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
				},
				{
					module: 'customModule0',
					name: 'customModule0 Event Name',
					height: 12,
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32)],
				},
			];
			for (const e of events) {
				eventQueue.unsafeAdd(e.module, e.name, e.data, e.topics);
			}

			mod.beforeCommandExecute.mockImplementation(() => {
				eventQueue.add('auth', 'Auth Name', utils.getRandomBytes(100), [utils.getRandomBytes(32)]);
			});

			mod.afterCommandExecute.mockImplementation(() => {
				throw new Error('afterCommandExecute failed');
			});

			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transaction,
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.executeTransaction(ctx);
			expect(ctx.eventQueue.getEvents()).toHaveLength(events.length);
		});
	});

	describe('verifyAssets', () => {
		it('should call all registered verifyAssets', async () => {
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.verifyAssets(ctx);
			expect(mod.verifyAssets).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			// expect(systemMod.verifyAssets).toHaveBeenCalledTimes(1);
			expect(mod.verifyAssets).toHaveBeenCalledTimes(1);
		});
	});

	describe('beforeExecuteBlock', () => {
		it('should call all registered beforeExecuteBlock', async () => {
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.beforeExecuteBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: expect.any(Boolean),
				maxHeightCertified: expect.any(Number),
				certificateThreshold: expect.any(BigInt),
			});
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
		});

		it('should add event with a topic EVENT_INDEX_BEFORE_TRANSACTIONS', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.beforeExecuteBlock(ctx);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].toObject().topics[0]).toEqual(EVENT_INDEX_BEFORE_TRANSACTIONS);
		});
	});

	describe('afterExecuteBlock', () => {
		it('should call all registered afterTransactionsExecute', async () => {
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.afterExecuteBlock(ctx);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				transactions: [transaction],
				currentValidators: expect.any(Array),
				certificateThreshold: expect.any(BigInt),
				impliesMaxPrevote: expect.any(Boolean),
				maxHeightCertified: expect.any(Number),
				setNextValidators: expect.any(Function),
			});
			expect(mod.afterTransactionsExecute).toHaveBeenCalledTimes(1);
		});

		it('should add event with a topic EVENT_INDEX_AFTER_TRANSACTIONS', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.afterExecuteBlock(ctx);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].toObject().topics[0]).toEqual(EVENT_INDEX_AFTER_TRANSACTIONS);
		});
	});

	describe('executeBlock', () => {
		it('should call all registered before/after executeBlock', async () => {
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.executeBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: expect.any(Boolean),
				maxHeightCertified: expect.any(Number),
				certificateThreshold: expect.any(BigInt),
			});
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				transactions: [transaction],
				currentValidators: expect.any(Array),
				impliesMaxPrevote: expect.any(Boolean),
				certificateThreshold: expect.any(BigInt),
				maxHeightCertified: expect.any(Number),
				setNextValidators: expect.any(Function),
			});
			expect(mod.afterTransactionsExecute).toHaveBeenCalledTimes(1);
		});
	});
});
