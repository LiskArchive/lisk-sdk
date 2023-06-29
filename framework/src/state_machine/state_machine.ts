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

import { validator } from '@liskhq/lisk-validator';
import { standardEventDataSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { TransactionExecutionResult } from '../abi';
import { Logger } from '../logger';
import { BaseCommand, BaseModule } from '../modules';
import { GenesisConfig } from '../types';
import { BlockContext } from './block_context';
import { GenerationContext } from './generator_context';
import { GenesisBlockContext } from './genesis_block_context';
import { TransactionContext } from './transaction_context';
import { VerifyStatus, VerificationResult } from './types';
import { EVENT_TRANSACTION_NAME } from './constants';

export class StateMachine {
	private readonly _modules: BaseModule[] = [];

	private _logger!: Logger;
	private _initialized = false;

	public registerModule(mod: BaseModule): void {
		this._validateExisting(mod);
		this._modules.push(mod);
	}

	public async init(
		logger: Logger,
		genesisConfig: GenesisConfig,
		moduleConfig: Record<string, Record<string, unknown>> = {},
	): Promise<void> {
		this._logger = logger;
		if (this._initialized) {
			return;
		}
		for (const mod of this._modules) {
			if (mod.init) {
				await mod.init({
					moduleConfig: moduleConfig[mod.name] ?? {},
					genesisConfig,
				});
			}
			this._logger.info(`Registered and initialized ${mod.name} module`);
			for (const command of mod.commands) {
				this._logger.info(`Registered ${mod.name} module has command ${command.name}`);
			}
		}
		this._initialized = true;
	}

	public async executeGenesisBlock(ctx: GenesisBlockContext): Promise<void> {
		const initContext = ctx.createInitGenesisStateContext();
		for (const mod of this._modules) {
			if (mod.initGenesisState) {
				this._logger.debug({ moduleName: mod.name }, 'Executing initGenesisState');
				await mod.initGenesisState(initContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed initGenesisState');
			}
		}
		const finalizeContext = ctx.createFinalizeGenesisStateContext();
		for (const mod of this._modules) {
			if (mod.finalizeGenesisState) {
				this._logger.debug({ moduleName: mod.name }, 'Executing finalizeGenesisState');
				await mod.finalizeGenesisState(finalizeContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed finalizeGenesisState');
			}
		}
	}

	public async insertAssets(ctx: GenerationContext): Promise<void> {
		const initContext = ctx.getInsertAssetContext();
		for (const mod of this._modules) {
			if (mod.insertAssets) {
				this._logger.debug({ moduleName: mod.name }, 'Executing insertAssets');
				await mod.insertAssets(initContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed insertAssets');
			}
		}
	}

	public async verifyTransaction(
		ctx: TransactionContext,
		onlyCommand = false,
	): Promise<VerificationResult> {
		const transactionContext = ctx.createTransactionVerifyContext();
		try {
			if (!onlyCommand) {
				for (const mod of this._modules) {
					if (mod.verifyTransaction) {
						this._logger.debug({ moduleName: mod.name }, 'Executing verifyTransaction');
						const result = await mod.verifyTransaction(transactionContext);
						this._logger.debug({ moduleName: mod.name }, 'Executed verifyTransaction');
						if (result.status !== VerifyStatus.OK) {
							this._logger.debug(
								{ err: result.error, moduleName: mod.name },
								'Transaction verification failed',
							);
							return result;
						}
					}
				}
			}
			const command = this._getCommand(ctx.transaction.module, ctx.transaction.command);
			const commandContext = ctx.createCommandVerifyContext(command.schema);

			validator.validate(command.schema, commandContext.params);

			if (command.verify) {
				this._logger.debug(
					{ commandName: command.name, moduleName: ctx.transaction.module },
					'Executing command.verify',
				);
				const result = await command.verify(commandContext);
				this._logger.debug(
					{ commandName: command.name, moduleName: ctx.transaction.module },
					'Executed command.verify',
				);
				if (result.status !== VerifyStatus.OK) {
					this._logger.debug(
						{ err: result.error, moduleName: ctx.transaction.module, commandName: command.name },
						'Command verification failed',
					);
					return result;
				}
			}
			return { status: VerifyStatus.OK };
		} catch (error) {
			this._logger.debug(
				{
					err: error as Error,
					commandName: ctx.transaction.command,
					moduleName: ctx.transaction.module,
				},
				'Transaction verification failed',
			);
			return { status: VerifyStatus.FAIL, error: error as Error };
		}
	}

	public async executeTransaction(ctx: TransactionContext): Promise<TransactionExecutionResult> {
		let status = TransactionExecutionResult.OK;
		const transactionContext = ctx.createTransactionExecuteContext();
		const eventQueueSnapshotID = ctx.eventQueue.createSnapshot();
		const stateStoreSnapshotID = ctx.stateStore.createSnapshot();
		for (const mod of this._modules) {
			if (mod.beforeCommandExecute) {
				try {
					this._logger.debug({ moduleName: mod.name }, 'Executing beforeCommandExecute');
					await mod.beforeCommandExecute(transactionContext);
					this._logger.debug({ moduleName: mod.name }, 'Executed beforeCommandExecute');
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					this._logger.debug(
						{ err: error as Error, moduleName: mod.name },
						'Transaction beforeCommandExecution failed',
					);
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
			this._logger.debug({ commandName: command.name }, 'Executing command.execute');
			await command.execute(commandContext);
			this._logger.debug({ commandName: command.name }, 'Executed command.execute');
		} catch (error) {
			ctx.eventQueue.restoreSnapshot(commandEventQueueSnapshotID);
			ctx.stateStore.restoreSnapshot(commandStateStoreSnapshotID);
			status = TransactionExecutionResult.FAIL;
			this._logger.debug(
				{
					err: error as Error,
					moduleName: ctx.transaction.module,
					commandName: ctx.transaction.command,
				},
				'Command execution failed',
			);
		}

		// Execute after transaction hooks
		for (const mod of this._modules) {
			if (mod.afterCommandExecute) {
				try {
					this._logger.debug({ moduleName: mod.name }, 'Executing afterCommandExecute');
					await mod.afterCommandExecute(transactionContext);
					this._logger.debug({ moduleName: mod.name }, 'Executed afterCommandExecute');
				} catch (error) {
					ctx.eventQueue.restoreSnapshot(eventQueueSnapshotID);
					ctx.stateStore.restoreSnapshot(stateStoreSnapshotID);
					this._logger.debug(
						{ err: error as Error, moduleName: mod.name },
						'Transaction afterCommandExecution failed',
					);
					return TransactionExecutionResult.INVALID;
				}
			}
		}

		ctx.eventQueue.unsafeAdd(
			ctx.transaction.module,
			EVENT_TRANSACTION_NAME,
			codec.encode(standardEventDataSchema, { success: status === TransactionExecutionResult.OK }),
			[ctx.transaction.id],
		);

		return status;
	}

	public async verifyAssets(ctx: BlockContext): Promise<void> {
		for (const asset of ctx.assets.getAll()) {
			if (this._findModule(asset.module) === undefined) {
				throw new Error(`Module ${asset.module} is not registered.`);
			}
		}
		const blockVerifyContext = ctx.getBlockVerifyExecuteContext();
		for (const mod of this._modules) {
			if (mod.verifyAssets) {
				this._logger.debug({ moduleName: mod.name }, 'Executing verifyAssets');
				await mod.verifyAssets(blockVerifyContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed verifyAssets');
			}
		}
	}

	public async beforeExecuteBlock(ctx: BlockContext): Promise<void> {
		const blockExecuteContext = ctx.getBlockExecuteContext();
		for (const mod of this._modules) {
			if (mod.beforeTransactionsExecute) {
				this._logger.debug({ moduleName: mod.name }, 'Executing beforeTransactionsExecute');
				await mod.beforeTransactionsExecute(blockExecuteContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed beforeTransactionsExecute');
			}
		}
	}

	public async afterExecuteBlock(ctx: BlockContext): Promise<void> {
		const blockExecuteContext = ctx.getBlockAfterExecuteContext();
		for (const mod of this._modules) {
			if (mod.afterTransactionsExecute) {
				this._logger.debug({ moduleName: mod.name }, 'Executing afterTransactionsExecute');
				await mod.afterTransactionsExecute(blockExecuteContext);
				this._logger.debug({ moduleName: mod.name }, 'Executed afterTransactionsExecute');
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
					this._logger.debug({ err: verifyResult.error }, 'Transaction verification failed');
					throw verifyResult.error;
				}
				this._logger.debug(`Transaction verification failed. ID ${tx.id.toString('hex')}.`);
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
		return undefined;
	}

	private _getCommand(module: string, command: string): BaseCommand {
		const targetModule = this._findModule(module);
		if (!targetModule) {
			this._logger.debug(`Module ${module} is not registered`);
			throw new Error(`Module ${module} is not registered.`);
		}
		const targetCommand = targetModule.commands.find(c => c.name === command);
		if (!targetCommand) {
			this._logger.debug(`Module ${module} does not have command ${command} registered`);
			throw new Error(`Module ${module} does not have command ${command} registered.`);
		}
		return targetCommand;
	}

	private _validateExisting(mod: BaseModule): void {
		const existingModule = this._modules.find(m => m.name === mod.name);
		if (existingModule) {
			this._logger.debug(`Module ${mod.name} is registered`);
			throw new Error(`Module ${mod.name} is registered.`);
		}
		const allExistingEvents = this._modules.reduce<Buffer[]>((prev, curr) => {
			prev.push(...curr.events.keys());
			return prev;
		}, []);
		for (const event of mod.events.values()) {
			const duplicate = allExistingEvents.find(k => k.equals(event.key));
			if (duplicate) {
				this._logger.debug(`Module ${mod.name} has conflicting event ${event.name}`);
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
				this._logger.debug(`Module ${mod.name} has conflicting store ${store.name}`);
				throw new Error(
					`Module ${mod.name} has conflicting store ${store.name}. Please update the store name.`,
				);
			}
			allExistingStores.push(store.key);
		}
	}
}
