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
import { Transaction, StateStore, BlockAssets } from '@liskhq/lisk-chain';
import { Logger } from '../../../../src/logger';
import { BlockContext } from '../../../../src/node/state_machine/block_context';
import { EventQueue } from '../../../../src/node/state_machine/event_queue';
import { GenesisBlockContext } from '../../../../src/node/state_machine/genesis_block_context';
import { StateMachine } from '../../../../src/node/state_machine/state_machine';
import { TransactionContext } from '../../../../src/node/state_machine/transaction_context';
import { BlockHeader, VerifyStatus } from '../../../../src/node/state_machine';
import { CustomModule0, CustomModule1, CustomModule2 } from './custom_modules';

describe('state_machine', () => {
	const genesisHeader = {} as BlockHeader;
	const header = {} as BlockHeader;
	const logger = {} as Logger;
	const assets = new BlockAssets();
	const stateStore = {} as StateStore;
	const eventQueue = new EventQueue();
	const networkIdentifier = Buffer.from('network identifier', 'utf8');
	const transaction = {
		moduleID: 3,
		commandID: 0,
		params: {},
	} as Transaction;

	let stateMachine: StateMachine;
	let mod: CustomModule0;
	let systemMod: CustomModule1;

	beforeEach(() => {
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
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				header: genesisHeader,
				assets,
			});
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
			});
			await stateMachine.executeTransaction(ctx);
			expect(mod.beforeCommandExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				transaction,
				header,
				assets,
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(systemMod.afterCommandExecute).toHaveBeenCalledTimes(1);
			expect(mod.afterCommandExecute).toHaveBeenCalledTimes(1);
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
			});
			await stateMachine.verifyAssets(ctx);
			expect(mod.verifyAssets).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue,
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
			});
			await stateMachine.beforeExecuteBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(systemMod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
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
			});
			await stateMachine.afterExecuteBlock(ctx);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				transactions: [transaction],
			});
			expect(mod.afterTransactionsExecute).toHaveBeenCalledTimes(1);
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
			});
			await stateMachine.executeBlock(ctx);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
			});
			expect(systemMod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.beforeTransactionsExecute).toHaveBeenCalledTimes(1);
			expect(mod.afterTransactionsExecute).toHaveBeenCalledWith({
				networkIdentifier,
				logger,
				header,
				assets,
				eventQueue,
				getAPIContext: expect.any(Function),
				getStore: expect.any(Function),
				transactions: [transaction],
			});
			expect(mod.afterTransactionsExecute).toHaveBeenCalledTimes(1);
		});
	});
});
