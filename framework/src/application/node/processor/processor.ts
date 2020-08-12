/*
 * Copyright © 2019 Lisk Foundation
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

import { ForkStatus, BFT } from '@liskhq/lisk-bft';
import { Chain, Block, GenesisBlock, StateStore, Transaction } from '@liskhq/lisk-chain';
import { objects, jobHandlers } from '@liskhq/lisk-utils';
import { EventEmitter } from 'events';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { Logger } from '../../logger';
import { InMemoryChannel } from '../../../controller/channels';
import { BaseModule, BaseAsset } from '../../../modules';
import { Pipeline } from './pipeline';
import {
	BeforeBlockApplyInput,
	TransactionApplyInput,
	AfterBlockApplyInput,
	AfterGenesisBlockApplyInput,
	ReducerHandler,
	Consensus,
	Delegate,
} from '../../../types';

const forkStatusList = [
	ForkStatus.IDENTICAL_BLOCK,
	ForkStatus.VALID_BLOCK,
	ForkStatus.DOUBLE_FORGING,
	ForkStatus.TIE_BREAK,
	ForkStatus.DIFFERENT_CHAIN,
	ForkStatus.DISCARD,
];

export const EVENT_PROCESSOR_SYNC_REQUIRED = 'EVENT_PROCESSOR_SYNC_REQUIRED';
export const EVENT_PROCESSOR_BROADCAST_BLOCK = 'EVENT_PROCESSOR_BROADCAST_BLOCK';

interface ProcessorInput {
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly chainModule: Chain;
	readonly bftModule: BFT;
}

export class Processor {
	public readonly events: EventEmitter;
	private readonly _channel: InMemoryChannel;
	private readonly _logger: Logger;
	private readonly _chain: Chain;
	private readonly _bft: BFT;
	private readonly _jobQueue: jobHandlers.JobQueue;
	private readonly _modules: BaseModule[] = [];
	private _stop = false;
	private readonly _hooks: {
		beforeTransactionApply: Pipeline<TransactionApplyInput>;
		afterTransactionApply: Pipeline<TransactionApplyInput>;
		beforeBlockApply: Pipeline<BeforeBlockApplyInput>;
		afterBlockApply: Pipeline<AfterBlockApplyInput>;
		afterGenesisBlockApply: Pipeline<AfterGenesisBlockApplyInput>;
	};

	public constructor({ channel, logger, chainModule, bftModule }: ProcessorInput) {
		this._channel = channel;
		this._logger = logger;
		this._chain = chainModule;
		this._bft = bftModule;
		this._jobQueue = new jobHandlers.JobQueue();
		this.events = new EventEmitter();
		this._hooks = {
			beforeTransactionApply: new Pipeline<TransactionApplyInput>(),
			afterTransactionApply: new Pipeline<TransactionApplyInput>(),
			beforeBlockApply: new Pipeline<BeforeBlockApplyInput>(),
			afterBlockApply: new Pipeline<AfterBlockApplyInput>(),
			afterGenesisBlockApply: new Pipeline<AfterGenesisBlockApplyInput>(),
		};
	}

	public register(customModule: BaseModule): void {
		const existingModule = this._modules.find(m => m.type === customModule.type);
		if (existingModule) {
			throw new Error(`Module type ${customModule.type} is already registered`);
		}
		if (customModule.afterGenesisBlockApply) {
			this._hooks.afterGenesisBlockApply.pipe([
				customModule.afterGenesisBlockApply.bind(customModule),
			]);
		}
		if (customModule.beforeBlockApply) {
			this._hooks.beforeBlockApply.pipe([customModule.beforeBlockApply.bind(customModule)]);
		}
		if (customModule.beforeTransactionApply) {
			this._hooks.beforeTransactionApply.pipe([
				customModule.beforeTransactionApply.bind(customModule),
			]);
		}
		if (customModule.afterTransactionApply) {
			this._hooks.afterTransactionApply.pipe([
				customModule.afterTransactionApply.bind(customModule),
			]);
		}
		if (customModule.afterBlockApply) {
			this._hooks.afterBlockApply.pipe([customModule.afterBlockApply.bind(customModule)]);
		}
		this._modules.push(customModule);
	}

	public async init(genesisBlock: GenesisBlock): Promise<void> {
		this._logger.debug(
			{
				id: genesisBlock.header.id,
				transactionRoot: genesisBlock.header.transactionRoot,
			},
			'Initializing processor',
		);
		const genesisExist = await this._chain.genesisBlockExist(genesisBlock);
		// do init check for block state. We need to load the blockchain
		const stateStore = await this._chain.newStateStore();
		if (!genesisExist) {
			this._chain.validateGenesisBlockHeader(genesisBlock);
			this._chain.applyGenesisBlock(genesisBlock, stateStore);
			await this._hooks.afterGenesisBlockApply.run({
				genesisBlock,
				stateStore,
				reducerHandler: this._createReducerHandler(stateStore),
			});
			// TODO: saveBlock should accept both genesis and normal block
			await this._chain.saveBlock((genesisBlock as unknown) as Block, stateStore, 0);
		}
		await this._chain.init();
		await this._bft.init(stateStore);
		this._logger.info('Blockchain ready');
	}

	public async stop(): Promise<void> {
		this._stop = true;
		await this._jobQueue.stop();
	}

	// process is for standard processing of block, especially when received from network
	public async process(block: Block, { peerId }: { peerId?: string } = {}): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Starting to process block',
			);
			const { lastBlock } = this._chain;
			const forkStatus = this._bft.forkChoice(block.header, lastBlock.header);

			if (!forkStatusList.includes(forkStatus)) {
				this._logger.debug({ status: forkStatus, blockId: block.header.id }, 'Unknown fork status');
				throw new Error('Unknown fork status');
			}

			// Discarding block
			if (forkStatus === ForkStatus.DISCARD) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Discarding block',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			if (forkStatus === ForkStatus.IDENTICAL_BLOCK) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Block already processed',
				);
				return;
			}
			if (forkStatus === ForkStatus.DOUBLE_FORGING) {
				this._logger.warn(
					{
						id: block.header.id,
						generatorPublicKey: block.header.generatorPublicKey,
					},
					'Discarding block due to double forging',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === ForkStatus.DIFFERENT_CHAIN) {
				this._logger.debug(
					{ id: block.header.id, height: block.header.height },
					'Detected different chain to sync',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				// Sync requires decoded block
				this.events.emit(EVENT_PROCESSOR_SYNC_REQUIRED, {
					block,
					peerId,
				});
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});
				return;
			}
			// Replacing a block
			if (forkStatus === ForkStatus.TIE_BREAK) {
				this._logger.info(
					{ id: lastBlock.header.id, height: lastBlock.header.height },
					'Received tie breaking block',
				);
				const encodedBlock = this._chain.dataAccess.encode(block);
				this._channel.publish('app:chain:fork', {
					block: encodedBlock.toString('base64'),
				});

				this._validate(block);
				const previousLastBlock = objects.cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock);
				try {
					await this._processValidated(block);
				} catch (err) {
					this._logger.error(
						{
							id: block.header.id,
							previousBlockId: previousLastBlock.header.id,
							err: err as Error,
						},
						'Failed to apply newly received block. restoring previous block.',
					);
					await this._processValidated(previousLastBlock, {
						skipBroadcast: true,
					});
				}
				return;
			}

			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing valid block',
			);
			this._validate(block);
			await this._processValidated(block);
		});
	}

	public validate(block: Block): void {
		this._logger.debug({ id: block.header.id, height: block.header.height }, 'Validating block');
		this._validate(block);
	}

	// processValidated processes a block assuming that statically it's valid
	public async processValidated(
		block: Block,
		{ removeFromTempTable = false }: { removeFromTempTable?: boolean } = {},
	): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			this._logger.debug(
				{ id: block.header.id, height: block.header.height },
				'Processing validated block',
			);
			return this._processValidated(block, {
				skipBroadcast: true,
				removeFromTempTable,
			});
		});
	}

	public async deleteLastBlock({
		saveTempBlock = false,
	}: { saveTempBlock?: boolean } = {}): Promise<void> {
		if (this._stop) {
			return;
		}
		await this._jobQueue.add(async () => {
			const { lastBlock } = this._chain;
			this._logger.debug(
				{ id: lastBlock.header.id, height: lastBlock.header.height },
				'Deleting last block',
			);
			await this._deleteBlock(lastBlock, saveTempBlock);
			return this._chain.lastBlock;
		});
	}

	public validateTransaction(transaction: Transaction): void {
		transaction.validate();
		const customAsset = this._getAsset(transaction);
		if (customAsset.validateAsset) {
			const decodedAsset = codec.decode(customAsset.assetSchema, transaction.asset);
			const assetSchemaErrors = validator.validate(customAsset.assetSchema, decodedAsset as object);
			if (assetSchemaErrors.length) {
				throw new LiskValidationError(assetSchemaErrors);
			}
			customAsset.validateAsset({
				asset: decodedAsset,
				transaction,
			});
		}
	}

	public async verifyTransactions(
		transactions: Transaction[],
		stateStore: StateStore,
	): Promise<void> {
		if (!transactions.length) {
			return;
		}
		for (const transaction of transactions) {
			await this._hooks.beforeTransactionApply.run({
				reducerHandler: this._createReducerHandler(stateStore),
				stateStore,
				transaction,
			});
			const customAsset = this._getAsset(transaction);
			const decodedAsset = codec.decode(customAsset.assetSchema, transaction.asset);
			await customAsset.applyAsset({
				asset: decodedAsset,
				reducerHandler: this._createReducerHandler(stateStore),
				senderID: transaction.senderID,
				stateStore,
				transaction,
			});
			await this._hooks.afterTransactionApply.run({
				reducerHandler: this._createReducerHandler(stateStore),
				stateStore,
				transaction,
			});
		}
	}

	private async _processValidated(
		block: Block,
		{
			skipBroadcast,
			removeFromTempTable = false,
		}: {
			skipBroadcast?: boolean;
			removeFromTempTable?: boolean;
		} = {},
	): Promise<Block> {
		const stateStore = await this._chain.newStateStore();
		const reducerHandler = this._createReducerHandler(stateStore);
		await this._chain.verifyBlockHeader(block, stateStore);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		await this._bft.verifyBlockHeader(block.header, stateStore);

		if (!skipBroadcast) {
			// FIXME: this is using instance, use event emitter instead
			this.events.emit(EVENT_PROCESSOR_BROADCAST_BLOCK, {
				block,
			});
		}

		await this._hooks.beforeBlockApply.run({
			block,
			stateStore,
			reducerHandler,
		});

		if (block.payload.length) {
			for (const transaction of block.payload) {
				await this._hooks.beforeTransactionApply.run({
					reducerHandler: this._createReducerHandler(stateStore),
					stateStore,
					transaction,
				});
			}
		}

		if (block.payload.length) {
			for (const transaction of block.payload) {
				const customAsset = this._getAsset(transaction);
				const decodedAsset = codec.decode(customAsset.assetSchema, transaction.asset);
				await customAsset.applyAsset({
					asset: decodedAsset,
					reducerHandler,
					senderID: transaction.senderID,
					stateStore,
					transaction,
				});
				await this._hooks.afterTransactionApply.run({
					reducerHandler: this._createReducerHandler(stateStore),
					stateStore,
					transaction,
				});
			}
		}

		// Apply should always be executed after save as it performs database calculations
		// i.e. Dpos.apply expects to have this processing block in the database
		await this._hooks.afterBlockApply.run({
			block,
			reducerHandler,
			stateStore,
			consensus: this._createConsensus(stateStore),
		});

		await this._chain.saveBlock(block, stateStore, this._bft.finalizedHeight, {
			removeFromTempTable,
		});

		return block;
	}

	private _validate(block: Block): void {
		this._chain.validateBlockHeader(block);
		if (block.payload.length) {
			for (const transaction of block.payload) {
				this.validateTransaction(transaction);
			}
		}
	}

	private async _deleteBlock(block: Block, saveTempBlock = false): Promise<void> {
		if (block.header.height <= this._bft.finalizedHeight) {
			throw new Error('Can not delete block below or same as finalized height');
		}

		// Offset must be set to 1, because lastBlock is still this deleting block
		const stateStore = await this._chain.newStateStore(1);
		await this._chain.removeBlock(block, stateStore, { saveTempBlock });
	}

	private _createConsensus(stateStore: StateStore): Consensus {
		return {
			getFinalizedHeight: (): number => this._bft.finalizedHeight,
			updateDelegates: async (delegates: Delegate[]): Promise<void> => {
				await this._chain.setValidators(delegates, stateStore);
			},
		};
	}

	private _createReducerHandler(stateStore: StateStore): ReducerHandler {
		return {
			invoke: async (name: string, params: Record<string, unknown>): Promise<unknown> => {
				const requestNames = name.split(':');
				if (requestNames.length !== 2) {
					throw new Error('Invalid format to call reducer');
				}
				const [moduleName, funcName] = requestNames;
				const customModule = this._getModuleByName(moduleName);
				const fn = customModule.reducers[funcName];
				if (!fn) {
					throw new Error(`${funcName} does not exist in module ${moduleName}`);
				}
				return fn(params, stateStore);
			},
		};
	}

	private _getModuleByName(name: string): BaseModule {
		const customModule = this._modules.find(m => m.name === name);
		if (!customModule) {
			throw new Error(`Module ${name} does not exist`);
		}
		return customModule;
	}

	private _getAsset(transaction: Transaction): BaseAsset {
		const customModule = this._modules.find(m => m.type === transaction.moduleType);
		if (!customModule) {
			throw new Error(`Module type ${transaction.moduleType} does not exist`);
		}
		const customAsset = customModule.transactionAssets.find(
			asset => asset.type === transaction.assetType,
		);
		if (!customAsset) {
			throw new Error(
				`Asset type ${transaction.assetType} does not exist in module type ${transaction.moduleType}.`,
			);
		}
		return customAsset;
	}
}
