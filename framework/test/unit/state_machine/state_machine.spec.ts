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
import {
	CustomCommand0,
	CustomCommand3,
	CustomModule0,
	CustomModule2,
	CustomModule3,
} from './custom_modules';
import {
	EVENT_INDEX_AFTER_TRANSACTIONS,
	EVENT_INDEX_BEFORE_TRANSACTIONS,
	EVENT_INDEX_FINALIZE_GENESIS_STATE,
	EVENT_INDEX_INIT_GENESIS_STATE,
	// EVENT_TOPIC_TRANSACTION_EXECUTION,
} from '../../../src/state_machine/constants';
import { PrefixedStateReadWriter } from '../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../src/testing/in_memory_prefixed_state';
import { NamedRegistry } from '../../../src/modules/named_registry';
import { loggerMock } from '../../../src/testing/mocks';
import { standardEventDataSchema } from '../../../src';

describe('state_machine', () => {
	const genesisHeader = {} as BlockHeader;
	const header = { timestamp: 123, height: 20 } as BlockHeader;
	const logger = {} as Logger;
	const assets = new BlockAssets();
	let stateStore: PrefixedStateReadWriter;
	let contextStore: Map<string, unknown>;
	let eventQueue: EventQueue;
	const chainID = Buffer.from('10000000', 'utf8');
	const transaction = {
		module: 'customModule0',
		command: 'customCommand0',
		params: codec.encode(new CustomCommand0(new NamedRegistry(), new NamedRegistry()).schema, {
			data: 'some info',
		}),
		id: utils.hash(utils.getRandomBytes(2)),
	} as Transaction;

	let stateMachine: StateMachine;
	let mod: CustomModule0;

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		eventQueue = new EventQueue(0);
		stateMachine = new StateMachine();
		contextStore = new Map();
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
				chainID,
			});
			await stateMachine.executeGenesisBlock(ctx);
			expect(mod.initGenesisState).toHaveBeenCalledTimes(1);
			expect(mod.initGenesisState).toHaveBeenCalledWith({
				logger,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				stateStore,
				header: genesisHeader,
				assets,
				setNextValidators: expect.any(Function),
				chainID,
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
				chainID,
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
				contextStore,
				header,
				chainID,
				transaction,
			});
			const result = await stateMachine.verifyTransaction(ctx);
			expect(mod.verifyTransaction).toHaveBeenCalledWith({
				chainID,
				logger,
				transaction,
				stateStore,
				contextStore,
				header,
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
				contextStore,
				header,
				chainID,
				transaction,
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
				contextStore,
				header,
				assets,
				chainID,
				transaction,
			});
			await stateMachine.executeTransaction(ctx);
			expect(mod.beforeCommandExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				transaction,
				header,
				assets,
				stateStore,
				contextStore,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(mod.afterCommandExecute).toHaveBeenCalledTimes(1);
		});

		it('should add event with a topic with transaction id and success true if command execution does not fail', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				contextStore,
				header,
				assets,
				chainID,
				transaction,
			});
			await stateMachine.executeTransaction(ctx);

			const events = ctx.eventQueue.getEvents();
			const dataDecoded = codec.decode(standardEventDataSchema, events[0].toObject().data);
			expect(events).toHaveLength(1);
			expect(events[0].toObject().topics[0]).toEqual(transaction.id);
			expect(dataDecoded).toStrictEqual({ success: true });
		});

		it('should add event with a topic with transaction id with success false if command execution fails', async () => {
			const transactionWithInvalidCommand = {
				module: 'customModule3',
				command: 'customCommand3',
				params: codec.encode(new CustomCommand3(new NamedRegistry(), new NamedRegistry()).schema, {
					data: 'some info',
				}),
				id: utils.hash(utils.getRandomBytes(2)),
			} as Transaction;
			stateMachine.registerModule(new CustomModule3());
			const ctx = new TransactionContext({
				eventQueue,
				logger,
				stateStore,
				contextStore,
				header,
				assets,
				chainID,
				transaction: transactionWithInvalidCommand,
			});
			await stateMachine.executeTransaction(ctx);

			const events = ctx.eventQueue.getEvents();
			const dataDecoded = codec.decode(standardEventDataSchema, events[0].toObject().data);
			expect(events).toHaveLength(1);

			expect(events[0].toObject().topics[0]).toEqual(transactionWithInvalidCommand.id);
			expect(dataDecoded).toStrictEqual({ success: false });
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
				contextStore,
				header,
				assets,
				chainID,
				transaction,
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
				contextStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
			});
			await stateMachine.verifyAssets(ctx);
			expect(mod.verifyAssets).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				stateStore,
				contextStore,
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
				contextStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
			});
			await stateMachine.beforeTransactionsExecute(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				stateStore,
				contextStore,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
		});

		it('should add event with a topic EVENT_INDEX_BEFORE_TRANSACTIONS', async () => {
			stateMachine.registerModule(new CustomModule2());
			const ctx = new BlockContext({
				eventQueue,
				logger,
				stateStore,
				contextStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
			});
			await stateMachine.beforeTransactionsExecute(ctx);

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
				contextStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
			});
			await stateMachine.afterExecuteBlock(ctx);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				chainID,
				logger,
				header,
				assets,
				stateStore,
				contextStore,
				eventQueue: expect.any(Object),
				getMethodContext: expect.any(Function),
				getStore: expect.any(Function),
				transactions: [transaction],
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
				contextStore,
				header,
				assets,
				chainID,
				transactions: [transaction],
			});
			await stateMachine.afterExecuteBlock(ctx);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].toObject().topics[0]).toEqual(EVENT_INDEX_AFTER_TRANSACTIONS);
		});
	});
});
