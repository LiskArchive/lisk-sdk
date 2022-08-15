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
import { BlockContext } from '../../../src/state_machine/block_context';
import { EventQueue } from '../../../src/state_machine/event_queue';
import { GenesisBlockContext } from '../../../src/state_machine/genesis_block_context';
import { StateMachine } from '../../../src/state_machine/state_machine';
import { TransactionContext } from '../../../src/state_machine/transaction_context';
import { BlockHeader, VerifyStatus } from '../../../src/state_machine';
import { CustomCommand0, CustomModule0, CustomModule1, CustomModule2 } from './custom_modules';
import {
	EVENT_INDEX_AFTER_TRANSACTIONS,
	EVENT_INDEX_BEFORE_TRANSACTIONS,
	EVENT_INDEX_FINALIZE_GENESIS_STATE,
	EVENT_INDEX_INIT_GENESIS_STATE,
} from '../../../src/state_machine/constants';
import { PrefixedStateReadWriter } from '../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../src/testing/in_memory_prefixed_state';

describe('state_machine', () => {
	const genesisHeader = {} as BlockHeader;
	const header = {} as BlockHeader;
	const logger = {} as Logger;
	const assets = new BlockAssets();
	let stateStore: PrefixedStateReadWriter;
	let eventQueue: EventQueue;
	const networkIdentifier = Buffer.from('network identifier', 'utf8');
	const transaction = {
		module: 'customModule0',
		command: 'customCommand0',
		params: codec.encode(new CustomCommand0(utils.intToBuffer(3, 4)).schema, { data: 'some info' }),
	} as Transaction;

	let stateMachine: StateMachine;
	let mod: CustomModule0;
	let systemMod: CustomModule1;

	beforeEach(() => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		eventQueue = new EventQueue();
		stateMachine = new StateMachine();
		mod = new CustomModule0();
		systemMod = new CustomModule1();
		stateMachine.registerModule(mod);
		stateMachine.registerSystemModule(systemMod);
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
				getAPIContext: expect.any(Function),
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
				networkIdentifier,
				transaction,
				currentValidators: [],
				impliesMaxPrevote: true,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			const result = await stateMachine.verifyTransaction(ctx);
			expect(mod.verifyTransaction).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				transaction,
				getAPIContext: expect.any(Function),
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
				networkIdentifier,
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
				networkIdentifier,
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
				networkIdentifier,
				logger,
				transaction,
				header,
				assets,
				eventQueue: expect.any(Object),
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: true,
				maxHeightCertified: 22,
				certificateThreshold: BigInt(3),
			});
			expect(systemMod.afterCommandExecute).toHaveBeenCalledTimes(1);
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
				networkIdentifier,
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
					typeID: Buffer.from([0, 0, 0, 0]),
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
				},
				{
					module: 'auth',
					typeID: Buffer.from([0, 0, 0, 0]),
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
				},
				{
					module: 'customModule0',
					typeID: Buffer.from([0, 0, 0, 0]),
					data: utils.getRandomBytes(20),
					topics: [utils.getRandomBytes(32)],
				},
			];
			for (const e of events) {
				eventQueue.unsafeAdd(e.module, e.typeID, e.data, e.topics);
			}

			mod.beforeCommandExecute.mockImplementation(() => {
				eventQueue.add('auth', Buffer.from([0, 0, 0, 1]), utils.getRandomBytes(100), [
					utils.getRandomBytes(32),
				]);
			});

			systemMod.afterCommandExecute.mockImplementation(() => {
				throw new Error('afterCommandExecute failed');
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
				networkIdentifier,
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
				networkIdentifier,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.verifyAssets(ctx);
			expect(mod.verifyAssets).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(systemMod.verifyAssets).toHaveBeenCalledTimes(1);
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
				networkIdentifier,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.beforeExecuteBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: expect.any(Boolean),
				maxHeightCertified: expect.any(Number),
				certificateThreshold: expect.any(BigInt),
			});
			expect(systemMod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
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
				networkIdentifier,
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
				networkIdentifier,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.afterExecuteBlock(ctx);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getAPIContext: expect.any(Function),
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
				networkIdentifier,
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
				networkIdentifier,
				transactions: [transaction],
				currentValidators: [],
				impliesMaxPrevote: false,
				maxHeightCertified: 0,
				certificateThreshold: BigInt(0),
			});
			await stateMachine.executeBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				currentValidators: expect.any(Array),
				impliesMaxPrevote: expect.any(Boolean),
				maxHeightCertified: expect.any(Number),
				certificateThreshold: expect.any(BigInt),
			});
			expect(systemMod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue: expect.any(Object),
				getAPIContext: expect.any(Function),
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
