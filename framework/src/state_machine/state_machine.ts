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

import { EVENT_STANDARD_TYPE_ID, standardEventDataSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { TransactionExecutionResult } from '../abi/constants';
import { BaseCommand, BaseModule } from '../modules';
import { GenesisConfig } from '../types';
import { BlockContext } from './block_context';
import { GenerationContext } from './generator_context';
import { GenesisBlockContext } from './genesis_block_context';
import { TransactionContext } from './transaction_context';
import { VerifyStatus, VerificationResult } from './types';

export class StateMachine {
	private readonly _modules: BaseModule[] = [];
	private readonly _systemModules: BaseModule[] = [];

	private _initialized = false;

	public registerModule(mod: BaseModule): void {
		this._validateExisting(mod);
		this._modules.push(mod);
	}

	public registerSystemModule(mod: BaseModule): void {
		this._validateExisting(mod);
		this._systemModules.push(mod);
	}

	public async init(
		genesisConfig: GenesisConfig,
		generatorConfig: Record<string, Record<string, unknown>> = {},
		moduleConfig: Record<string, Record<string, unknown>> = {},
	): Promise<void> {
		if (this._initialized) {
			return;
		}
		for (const mod of this._modules) {
			if (mod.init) {
				await mod.init({
					moduleConfig: moduleConfig[mod.name] ?? {},
					generatorConfig: generatorConfig[mod.name] ?? {},
					genesisConfig,
				});
			}
		}
		this._initialized = true;
	}

	public async executeGenesisBlock(ctx: GenesisBlockContext): Promise<void> {
		const initContext = ctx.createInitGenesisStateContext();
		for (const mod of this._systemModules) {
			if (mod.initGenesisState) {
				await mod.initGenesisState(initContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.initGenesisState) {
				await mod.initGenesisState(initContext);
			}
		}
		const finalizeContext = ctx.createFinalizeGenesisStateContext();
		for (const mod of this._modules) {
			if (mod.finalizeGenesisState) {
				await mod.finalizeGenesisState(finalizeContext);
			}
		}
		for (const mod of this._systemModules) {
			if (mod.finalizeGenesisState) {
				await mod.finalizeGenesisState(finalizeContext);
			}
		}
	}

	public async insertAssets(ctx: GenerationContext): Promise<void> {
		const initContext = ctx.getInsertAssetContext();
		for (const mod of this._systemModules) {
			if (mod.insertAssets) {
				await mod.insertAssets(initContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.insertAssets) {
				await mod.insertAssets(initContext);
			}
		}
	}

	public async verifyTransaction(ctx: TransactionContext): Promise<VerificationResult> {
		const transactionContext = ctx.createTransactionVerifyContext();
		try {
			for (const mod of this._systemModules) {
				if (mod.verifyTransaction) {
					const result = await mod.verifyTransaction(transactionContext);
					if (result.status !== VerifyStatus.OK) {
						return result;
					}
				}
			}
			for (const mod of this._modules) {
				if (mod.verifyTransaction) {
					const result = await mod.verifyTransaction(transactionContext);
					if (result.status !== VerifyStatus.OK) {
						return result;
					}
				}
			}
			const command = this._getCommand(ctx.transaction.module, ctx.transaction.command);
			const commandContext = ctx.createCommandVerifyContext(command.schema);
			if (command.verify) {
				const result = await command.verify(commandContext);
				if (result.status !== VerifyStatus.OK) {
					return result;
				}
			}
			return { status: VerifyStatus.OK };
		} catch (error) {
			return { status: VerifyStatus.FAIL, error: error as Error };
		}
	}

	public async executeTransaction(ctx: TransactionContext): Promise<TransactionExecutionResult> {
		let status = TransactionExecutionResult.OK;
		const transactionContext = ctx.createTransactionExecuteContext();
		const eventQueueSnapshotID = ctx.eventQueue.createSnapshot();
		const stateStoreSnapshotID = ctx.stateStore.createSnapshot();
		for (const mod of this._systemModules) {
			if (mod.beforeCommandExecute) {
				try {
					await mod.beforeCommandExecute(transactionContext);
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					return TransactionExecutionResult.INVALID;
				}
			}
		}
		for (const mod of this._modules) {
			if (mod.beforeCommandExecute) {
				try {
					await mod.beforeCommandExecute(transactionContext);
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					return TransactionExecutionResult.INVALID;
				}
			}
		}
		const command = this._getCommand(ctx.transaction.module, ctx.transaction.command);
		// Execute command
		const commandEventQueueSnapshotID = ctx.eventQueue.createSnapshot();
		const commandStateStoreSnapshotID = ctx.stateStore.createSnapshot();
		const commandContext = ctx.createCommandExecuteContext(command.schema);
		try {
			await command.execute(commandContext);
			ctx.eventQueue.unsafeAdd(
				ctx.transaction.module,
				EVENT_STANDARD_TYPE_ID,
				codec.encode(standardEventDataSchema, { success: true }),
				[ctx.transaction.id],
			);
		} catch (error) {
			ctx.eventQueue.restoreSnapshot(commandEventQueueSnapshotID);
			ctx.stateStore.restoreSnapshot(commandStateStoreSnapshotID);
			ctx.eventQueue.unsafeAdd(
				ctx.transaction.module,
				EVENT_STANDARD_TYPE_ID,
				codec.encode(standardEventDataSchema, { success: false }),
				[ctx.transaction.id],
			);
			status = TransactionExecutionResult.FAIL;
		}

		// Execute after transaction hooks
		for (const mod of this._modules) {
			if (mod.afterCommandExecute) {
				try {
					await mod.afterCommandExecute(transactionContext);
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					return TransactionExecutionResult.INVALID;
				}
			}
		}
		for (const mod of this._systemModules) {
			if (mod.afterCommandExecute) {
				try {
					await mod.afterCommandExecute(transactionContext);
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					return TransactionExecutionResult.INVALID;
				}
			}
		}

		return status;
	}

	public async verifyAssets(ctx: BlockContext): Promise<void> {
		for (const asset of ctx.assets.getAll()) {
			if (this._findModule(asset.module) === undefined) {
				throw new Error(`Module ${asset.module} is not registered.`);
			}
		}
		const blockVerifyContext = ctx.getBlockVerifyExecuteContext();
		for (const mod of this._systemModules) {
			if (mod.verifyAssets) {
				await mod.verifyAssets(blockVerifyContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.verifyAssets) {
				await mod.verifyAssets(blockVerifyContext);
			}
		}
	}

	public async beforeExecuteBlock(ctx: BlockContext): Promise<void> {
		const blockExecuteContext = ctx.getBlockExecuteContext();
		for (const mod of this._systemModules) {
			if (mod.beforeTransactionsExecute) {
				await mod.beforeTransactionsExecute(blockExecuteContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.beforeTransactionsExecute) {
				await mod.beforeTransactionsExecute(blockExecuteContext);
			}
		}
	}

	public async afterExecuteBlock(ctx: BlockContext): Promise<void> {
		const blockExecuteContext = ctx.getBlockAfterExecuteContext();
		for (const mod of this._modules) {
			if (mod.afterTransactionsExecute) {
				await mod.afterTransactionsExecute(blockExecuteContext);
			}
		}
		for (const mod of this._systemModules) {
			if (mod.afterTransactionsExecute) {
				await mod.afterTransactionsExecute(blockExecuteContext);
			}
		}
	}

	public async executeBlock(ctx: BlockContext): Promise<void> {
		await this.beforeExecuteBlock(ctx);
		for (const tx of ctx.transactions) {
			const txContext = ctx.getTransactionContext(tx);
			const verifyResult = await this.verifyTransaction(txContext);
			if (verifyResult.status !== VerifyStatus.OK) {
				if (verifyResult.error) {
					throw verifyResult.error;
				}
				throw new Error(`Transaction verification failed. ID ${tx.id.toString('hex')}.`);
			}
			await this.executeTransaction(txContext);
		}
		await this.afterExecuteBlock(ctx);
	}

	private _findModule(name: string): BaseModule | undefined {
		const existingModule = this._modules.find(m => m.name === name);
		if (existingModule) {
			return existingModule;
		}
		const existingSystemModule = this._systemModules.find(m => m.name === name);
		if (existingSystemModule) {
			return existingSystemModule;
		}
		return undefined;
	}

	private _getCommand(module: string, command: string): BaseCommand {
		const targetModule = this._findModule(module);
		if (!targetModule) {
			throw new Error(`Module ${module} is not registered.`);
		}
		const targetCommand = targetModule.commands.find(c => c.name === command);
		if (!targetCommand) {
			throw new Error(`Module ${module} does not have command ${command} registered.`);
		}
		return targetCommand;
	}

	private _validateExisting(mod: BaseModule): void {
		const existingModule = this._modules.find(m => m.name === mod.name);
		if (existingModule) {
			throw new Error(`Modul ${mod.name} is registered.`);
		}
		const allExistingEvents = this._modules.reduce<Buffer[]>((prev, curr) => {
			prev.push(...curr.events.keys());
			return prev;
		}, []);
		for (const event of mod.events.values()) {
			const duplicate = allExistingEvents.find(k => k.equals(event.key));
			if (duplicate) {
				throw new Error(
					`Module ${mod.name} has conflicting event ${event.name}. Please update the event name.`,
				);
			}
			allExistingEvents.push(event.key);
		}
		const allExistingStores = this._modules.reduce<Buffer[]>((prev, curr) => {
			prev.push(...curr.stores.keys());
			return prev;
		}, []);
		for (const store of mod.stores.values()) {
			const duplicate = allExistingStores.find(k => k.equals(store.key));
			if (duplicate) {
				throw new Error(
					`Module ${mod.name} has conflicting store ${store.name}. Please update the store name.`,
				);
			}
			allExistingStores.push(store.key);
		}
	}
}
