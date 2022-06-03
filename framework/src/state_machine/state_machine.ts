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
	private readonly _moduleIDs: number[] = [];

	private _initialized = false;

	public registerModule(mod: BaseModule): void {
		this._validateExistingModuleID(mod.id);
		this._modules.push(mod);
		this._moduleIDs.push(mod.id);
		this._moduleIDs.sort((a, b) => a - b);
	}

	public registerSystemModule(mod: BaseModule): void {
		this._validateExistingModuleID(mod.id);
		this._systemModules.push(mod);
		this._moduleIDs.push(mod.id);
		this._moduleIDs.sort((a, b) => a - b);
	}

	public getAllModuleIDs() {
		return this._moduleIDs;
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
			if (mod.initBlock) {
				await mod.initBlock(initContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.initBlock) {
				await mod.initBlock(initContext);
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
			const command = this._getCommand(ctx.transaction.moduleID, ctx.transaction.commandID);
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

	public async executeTransaction(ctx: TransactionContext): Promise<void> {
		const transactionContext = ctx.createTransactionExecuteContext();
		for (const mod of this._systemModules) {
			if (mod.beforeCommandExecute) {
				await mod.beforeCommandExecute(transactionContext);
			}
		}
		for (const mod of this._modules) {
			if (mod.beforeCommandExecute) {
				await mod.beforeCommandExecute(transactionContext);
			}
		}
		const command = this._getCommand(ctx.transaction.moduleID, ctx.transaction.commandID);
		// Execute command
		ctx.eventQueue.createSnapshot();
		// TODO: When adding failing transaction with https://github.com/LiskHQ/lisk-sdk/issues/7149, it should add try-catch, restoresnapshot and fail event
		const commandContext = ctx.createCommandExecuteContext(command.schema);
		await command.execute(commandContext);
		// TODO: This should be moved to engine with https://github.com/LiskHQ/lisk-sdk/issues/7011
		ctx.eventQueue.add(
			ctx.transaction.moduleID,
			EVENT_STANDARD_TYPE_ID,
			codec.encode(standardEventDataSchema, { success: true }),
			[ctx.transaction.id],
		);

		// Execute after transaction hooks
		for (const mod of this._modules) {
			if (mod.afterCommandExecute) {
				await mod.afterCommandExecute(transactionContext);
			}
		}
		for (const mod of this._systemModules) {
			if (mod.afterCommandExecute) {
				await mod.afterCommandExecute(transactionContext);
			}
		}
	}

	public async verifyAssets(ctx: BlockContext): Promise<void> {
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

	private _findModule(id: number): BaseModule | undefined {
		const existingModule = this._modules.find(m => m.id === id);
		if (existingModule) {
			return existingModule;
		}
		const existingSystemModule = this._systemModules.find(m => m.id === id);
		if (existingSystemModule) {
			return existingSystemModule;
		}
		return undefined;
	}

	private _getCommand(moduleID: number, commandID: number): BaseCommand {
		const targetModule = this._findModule(moduleID);
		if (!targetModule) {
			throw new Error(`Module with ID ${moduleID} is not registered.`);
		}
		// FIXME: Update assetID to commandID with https://github.com/LiskHQ/lisk-sdk/issues/6565
		const command = targetModule.commands.find(c => c.id === commandID);
		if (!command) {
			throw new Error(
				`Module with ID ${moduleID} does not have command with ID ${commandID} registered.`,
			);
		}
		return command;
	}

	private _validateExistingModuleID(id: number): void {
		const existingModule = this._modules.find(m => m.id === id);
		if (existingModule) {
			throw new Error(`Module with ID ${id} is registered.`);
		}
		const existingSystemModule = this._systemModules.find(m => m.id === id);
		if (existingSystemModule) {
			throw new Error(`Module with ID ${id} is registered as a system module.`);
		}
	}
}
