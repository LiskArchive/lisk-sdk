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

import {
	BaseTransaction,
	Status as TransactionStatus,
	TransactionJSON,
	TransactionResponse,
} from '@liskhq/lisk-transactions';
import { EventEmitter } from 'events';

import {
	calculateMilestone,
	calculateReward,
	calculateSupply,
} from './block_reward';
import {
	applyConfirmedGenesisStep,
	applyConfirmedStep,
	deleteFromBlockId,
	deleteLastBlock,
	saveBlock,
	undoConfirmedStep,
} from './chain';
import { Slots } from './slots';
import { StateStore } from './state_store';
import { TransactionInterfaceAdapter } from './transaction_interface_adapter';
import {
	applyTransactions,
	checkAllowedTransactions,
	checkPersistedTransactions,
	composeTransactionSteps,
	processSignature,
	validateTransactions,
	verifyTransactions,
} from './transactions';
import { TransactionHandledResult } from './transactions/compose_transaction_steps';
import {
	BlockInstance,
	BlockJSON,
	BlockRewardOptions,
	Contexter,
	ExceptionOptions,
	Logger,
	MatcherTransaction,
	SignatureObject,
	Storage,
	StorageFilter,
	StorageOptions,
	StorageTransaction,
	TempBlock,
} from './types';
import * as blocksUtils from './utils';
import {
	validateBlockSlot,
	validatePayload,
	validatePreviousBlockProperty,
	validateReward,
	validateSignature,
} from './validate';
import {
	BlocksVerify,
	verifyBlockNotExists,
	verifyPreviousBlockId,
} from './verify';

interface BlocksConfig {
	// Components
	readonly logger: Logger;
	readonly storage: Storage;
	// Unique requirements
	readonly genesisBlock: BlockJSON;
	readonly slots: Slots;
	readonly exceptions: ExceptionOptions;
	// Modules
	readonly registeredTransactions: {
		readonly [key: number]: typeof BaseTransaction;
	};
	// Constants
	readonly epochTime: string;
	readonly blockTime: number;
	readonly networkIdentifier: string;
	readonly blockReceiptTimeout: number; // Set default
	readonly loadPerIteration: number;
	readonly maxPayloadLength: number;
	readonly maxTransactionsPerBlock: number;
	readonly activeDelegates: number;
	readonly rewardDistance: number;
	readonly rewardOffset: number;
	readonly rewardMileStones: ReadonlyArray<string>;
	readonly totalAmount: string;
	readonly blockSlotWindow: number;
}

export class Blocks extends EventEmitter {
	public readonly slots: Slots;

	private _lastBlock: BlockInstance;
	private readonly blocksVerify: BlocksVerify;
	private readonly _transactionAdapter: TransactionInterfaceAdapter;
	private readonly logger: Logger;
	private readonly storage: Storage;
	private readonly blockRewardArgs: BlockRewardOptions;
	private readonly exceptions: ExceptionOptions;
	private readonly genesisBlock: BlockInstance;
	private readonly constants: {
		readonly epochTime: string;
		readonly blockTime: number;
		readonly blockReceiptTimeout: number;
		readonly maxPayloadLength: number;
		readonly maxTransactionsPerBlock: number;
		readonly loadPerIteration: number;
		readonly activeDelegates: number;
		readonly blockSlotWindow: number;
	};

	public readonly blockReward: {
		readonly [key: string]: (height: number) => number | bigint;
	};

	public constructor({
		// Components
		logger,
		storage,
		// Unique requirements
		genesisBlock,
		exceptions,
		// Modules
		registeredTransactions,
		// Constants
		epochTime,
		blockTime,
		networkIdentifier,
		blockReceiptTimeout, // Set default
		loadPerIteration,
		maxPayloadLength,
		maxTransactionsPerBlock,
		activeDelegates,
		rewardDistance,
		rewardOffset,
		rewardMileStones,
		totalAmount,
		blockSlotWindow,
	}: BlocksConfig) {
		super();
		this._transactionAdapter = new TransactionInterfaceAdapter(
			networkIdentifier,
			registeredTransactions,
		);
		const genesisInstance = this.deserialize(genesisBlock);
		this._lastBlock = genesisInstance;

		this.logger = logger;
		this.storage = storage;
		this.exceptions = exceptions;
		this.genesisBlock = genesisInstance;
		this.slots = new Slots({ epochTime, interval: blockTime });
		this.blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: height =>
				calculateMilestone(height, this.blockRewardArgs),
			calculateReward: height => calculateReward(height, this.blockRewardArgs),
			calculateSupply: height => calculateSupply(height, this.blockRewardArgs),
		};
		this.constants = {
			epochTime,
			blockTime,
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
			blockSlotWindow,
		};

		this.blocksVerify = new BlocksVerify({
			storage: this.storage,
			exceptions: this.exceptions,
			slots: this.slots,
			genesisBlock: this.genesisBlock,
		});
	}

	public get lastBlock(): BlockInstance {
		// Remove receivedAt property..
		const { receivedAt, ...block } = this._lastBlock;

		return block;
	}

	public async init(): Promise<void> {
		// Check mem tables
		const {
			genesisBlock,
		} = await this.storage.entities.Block.begin(
			'loader:checkMemTables',
			async tx => blocksUtils.loadMemTables(this.storage, tx),
		);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		const [storageLastBlock] = await this.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);
		if (!storageLastBlock) {
			throw new Error('Failed to load last block');
		}

		this._lastBlock = this.deserialize(storageLastBlock);
	}

	// tslint:disable-next-line prefer-function-over-method
	public serialize(blockInstance: BlockInstance): BlockJSON {
		const blockJSON = {
			...blockInstance,
			totalAmount: blockInstance.totalAmount.toString(),
			totalFee: blockInstance.totalFee.toString(),
			reward: blockInstance.reward.toString(),
			transactions: blockInstance.transactions.map(tx => ({
				...tx.toJSON(),
				blockId: blockInstance.id,
			})),
		};

		return blockJSON;
	}

	public deserialize(blockJSON: BlockJSON): BlockInstance {
		const transactions = (blockJSON.transactions || []).map(transaction =>
			this._transactionAdapter.fromJSON(transaction),
		);

		return {
			...blockJSON,
			totalAmount: BigInt(blockJSON.totalAmount || 0),
			totalFee: BigInt(blockJSON.totalFee || 0),
			reward: BigInt(blockJSON.reward || 0),
			version:
				blockJSON.version === undefined || blockJSON.version === null
					? 0
					: blockJSON.version,
			numberOfTransactions: transactions.length,
			payloadLength:
				blockJSON.payloadLength === undefined ||
				blockJSON.payloadLength === null
					? 0
					: blockJSON.payloadLength,
			transactions,
		};
	}

	public deserializeTransaction(
		transactionJSON: TransactionJSON,
	): BaseTransaction {
		return this._transactionAdapter.fromJSON(transactionJSON);
	}

	public validateBlockHeader(
		block: BlockInstance,
		blockBytes: Buffer,
		expectedReward: string,
	): void {
		validatePreviousBlockProperty(block, this.genesisBlock);
		validateSignature(block, blockBytes);
		validateReward(block, expectedReward, this.exceptions);

		// Validate transactions
		const { transactionsResponses } = validateTransactions(this.exceptions)(
			block.transactions,
		);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}

		validatePayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
		);

		// Update id
		block.id = blocksUtils.getId(blockBytes);
	}

	public verifyInMemory(block: BlockInstance, lastBlock: BlockInstance): void {
		verifyPreviousBlockId(block, lastBlock, this.genesisBlock);
		validateBlockSlot(block, lastBlock, this.slots);
	}

	public async verify(
		blockInstance: BlockInstance,
		stateStore: StateStore,
		{ skipExistingCheck }: { readonly skipExistingCheck: boolean },
	): Promise<void> {
		if (!skipExistingCheck) {
			await verifyBlockNotExists(this.storage, blockInstance);
			const {
				transactionsResponses: persistedResponse,
			} = await checkPersistedTransactions(this.storage)(
				blockInstance.transactions,
			);
			const invalidPersistedResponse = persistedResponse.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidPersistedResponse) {
				throw invalidPersistedResponse.errors;
			}
		}
		await this.blocksVerify.checkTransactions(blockInstance, stateStore);
	}

	public async apply(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedStep(blockInstance, stateStore, this.exceptions);

		this._lastBlock = blockInstance;
	}

	public async applyGenesis(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedGenesisStep(blockInstance, stateStore);

		this._lastBlock = blockInstance;
	}

	public async save(
		blockJSON: BlockJSON,
		tx: StorageTransaction,
	): Promise<void> {
		await saveBlock(this.storage, blockJSON, tx);
	}

	public async undo(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await undoConfirmedStep(blockInstance, stateStore, this.exceptions);
	}

	public async remove(
		block: BlockInstance,
		blockJSON: BlockJSON,
		tx: StorageTransaction,
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		const storageRowOfBlock = await deleteLastBlock(this.storage, block, tx);
		const secondLastBlock = this.deserialize(storageRowOfBlock);

		if (saveTempBlock) {
			const blockTempEntry = {
				id: blockJSON.id,
				height: blockJSON.height,
				fullBlock: blockJSON,
			};
			await this.storage.entities.TempBlock.create(blockTempEntry, {}, tx);
		}
		this._lastBlock = secondLastBlock;
	}

	public async removeBlockFromTempTable(
		blockId: string,
		tx: StorageTransaction,
	): Promise<void> {
		return this.storage.entities.TempBlock.delete({ id: blockId }, {}, tx);
	}

	public async getTempBlocks(
		filter: StorageFilter = {},
		options: StorageOptions = {},
		tx: StorageTransaction,
	): Promise<TempBlock[]> {
		return this.storage.entities.TempBlock.get(filter, options, tx);
	}

	public async exists(block: BlockInstance): Promise<boolean> {
		try {
			await verifyBlockNotExists(this.storage, block);

			return false;
		} catch (err) {
			return true;
		}
	}

	public async deleteAfter(block: BlockInstance): Promise<void> {
		return deleteFromBlockId(this.storage, block.id);
	}

	public async getJSONBlocksWithLimitAndOffset(
		limit: number,
		offset: number = 0,
	): Promise<BlockJSON[]> {
		// Calculate toHeight
		const toHeight = offset + limit;

		const filters = {
			height_gte: offset,
			height_lt: toHeight,
		};

		const options = {
			// tslint:disable-next-line no-null-keyword
			limit: null,
			sort: ['height:asc', 'rowId:asc'],
			extended: true,
		};

		// Loads extended blocks from storage
		return this.storage.entities.Block.get(filters, options);
	}

	public async loadBlocksFromLastBlockId(
		lastBlockId: string,
		limit: number = 1,
	): Promise<BlockJSON[]> {
		return blocksUtils.loadBlocksFromLastBlockId(
			this.storage,
			lastBlockId,
			limit,
		);
	}

	// TODO: Unit tests written in mocha, which should be migrated to jest.
	public async getHighestCommonBlock(ids: string[]): Promise<BlockJSON> {
		try {
			const [block] = await this.storage.entities.Block.get(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);

			return block;
		} catch (e) {
			const errMessage = 'Failed to fetch the highest common block';
			this.logger.error({ err: e }, errMessage);
			throw new Error(errMessage);
		}
	}

	// TODO: Unit tests written in mocha, which should be migrated to jest.
	public async filterReadyTransactions(
		transactions: BaseTransaction[],
		context: Contexter,
	): Promise<BaseTransaction[]> {
		const stateStore = new StateStore(this.storage);
		const allowedTransactionsIds = checkAllowedTransactions(context)(
			transactions as MatcherTransaction[],
		)
			.transactionsResponses.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK,
			)
			.map(transactionResponse => transactionResponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id),
		);
		const { transactionsResponses: responses } = await applyTransactions(
			this.exceptions,
		)(allowedTransactions, stateStore);
		const readyTransactions = allowedTransactions.filter(transaction =>
			responses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id),
		);

		return readyTransactions;
	}

	public async validateTransactions(
		transactions: BaseTransaction[],
	): Promise<TransactionHandledResult> {
		return composeTransactionSteps(
			checkAllowedTransactions({
				blockVersion: this.lastBlock.version,
				blockHeight: this.lastBlock.height,
				blockTimestamp: this.lastBlock.timestamp,
			}),
			validateTransactions(this.exceptions),
			// Composed transaction checks are all static, so it does not need state store
		)(transactions);
	}

	public async verifyTransactions(
		transactions: BaseTransaction[],
	): Promise<TransactionHandledResult> {
		const stateStore = new StateStore(this.storage);

		return composeTransactionSteps(
			checkAllowedTransactions(() => {
				const { version, height, timestamp } = this._lastBlock;

				return {
					blockVersion: version,
					blockHeight: height,
					blockTimestamp: timestamp,
				};
			}),
			checkPersistedTransactions(this.storage),
			verifyTransactions(this.slots, this.exceptions),
		)(transactions, stateStore);
	}

	public async processTransactions(
		transactions: BaseTransaction[],
	): Promise<TransactionHandledResult> {
		const stateStore = new StateStore(this.storage);

		return composeTransactionSteps(
			checkPersistedTransactions(this.storage),
			applyTransactions(this.exceptions),
		)(transactions, stateStore);
	}

	public async processSignature(
		transaction: BaseTransaction,
		signature: SignatureObject,
	): Promise<TransactionResponse> {
		const stateStore = new StateStore(this.storage);

		return processSignature()(transaction, signature, stateStore);
	}
}
