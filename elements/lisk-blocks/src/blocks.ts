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
import { DataAccess } from './data_access';
import { StateStore } from './state_store';
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
	BlockHeader,
	BlockHeaderJSON,
	BlockInstance,
	BlockJSON,
	BlockRewardOptions,
	Contexter,
	ExceptionOptions,
	Logger,
	MatcherTransaction,
	SignatureObject,
	Slots,
	Storage,
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
	private _lastBlock: BlockInstance;
	private readonly blocksVerify: BlocksVerify;
	private readonly logger: Logger;
	private readonly storage: Storage;
	private readonly dataAccess: DataAccess;
	private readonly slots: Slots;
	private readonly blockRewardArgs: BlockRewardOptions;
	private readonly exceptions: ExceptionOptions;
	private readonly genesisBlock: BlockInstance;
	private readonly constants: {
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
	public readonly deserialize: (blockJSON: BlockJSON) => BlockInstance;
	public readonly serialize: (blockInstance: BlockInstance) => BlockJSON;
	public readonly deserializeBlockHeader: (
		blockHeader: BlockHeaderJSON,
	) => BlockHeader;
	public readonly deserializeTransaction: (
		transactionJSON: TransactionJSON,
	) => BaseTransaction;

	public constructor({
		// Components
		logger,
		storage,
		// Unique requirements
		genesisBlock,
		slots,
		exceptions,
		// Modules
		registeredTransactions,
		// Constants
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

		this.logger = logger;
		this.storage = storage;
		this.dataAccess = new DataAccess({
			dbStorage: storage,
			networkIdentifier,
			registeredTransactions,
		});

		// Binding data access to allow access to its scope accessibility
		this.deserialize = this.dataAccess.deserialize.bind(this.dataAccess);
		this.serialize = this.dataAccess.serialize.bind(this.dataAccess);
		this.deserializeBlockHeader = this.dataAccess.deserializeBlockHeader.bind(
			this.dataAccess,
		);
		this.deserializeTransaction = this.dataAccess.deserializeTransaction.bind(
			this.dataAccess,
		);
		const genesisInstance = this.deserialize(genesisBlock);
		this._lastBlock = genesisInstance;
		this.exceptions = exceptions;
		this.genesisBlock = genesisInstance;
		this.slots = slots;
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
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
			blockSlotWindow,
		};

		this.blocksVerify = new BlocksVerify({
			dataAccess: this.dataAccess,
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
		const genesisBlock = await this.dataAccess.getBlockHeaderByHeight(1);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		const storageLastBlock = await this.dataAccess.getLastBlock();
		if (!Object.keys(storageLastBlock).length) {
			throw new Error('Failed to load last block');
		}

		this._lastBlock = storageLastBlock;
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
			} = await checkPersistedTransactions(this.dataAccess)(
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
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		const secondLastBlock = await deleteLastBlock(
			this.storage,
			this.dataAccess,
			block,
		);

		if (saveTempBlock) {
			const blockTempEntry = {
				id: blockJSON.id,
				height: blockJSON.height,
				fullBlock: blockJSON,
			};
			await this.storage.entities.TempBlock.create(blockTempEntry, {});
		}
		this._lastBlock = secondLastBlock;
	}

	public async removeBlockFromTempTable(
		blockId: string,
		tx: StorageTransaction,
	): Promise<void> {
		return this.storage.entities.TempBlock.delete({ id: blockId }, {}, tx);
	}

	public async getTempBlocks(): Promise<TempBlock[]> {
		const tempBlocks = await this.dataAccess.getTempBlocks();

		return tempBlocks;
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
		return deleteFromBlockId(this.storage, this.dataAccess, block.id);
	}

	public async getJSONBlocksWithLimitAndOffset(
		limit: number,
		offset: number = 0,
	): Promise<BlockInstance[]> {
		// Calculate toHeight
		const toHeight = offset + limit;

		// Loads extended blocks from storage
		const blocks = await this.dataAccess.getBlocksByHeightBetween(
			offset,
			toHeight,
		);

		return blocks.sort((a: BlockInstance, b: BlockInstance) =>
			a.height > b.height ? 1 : -1,
		);
	}

	public async loadBlocksFromLastBlockId(
		lastBlockId: string,
		limit: number = 1,
	): Promise<BlockInstance[]> {
		return blocksUtils.loadBlocksFromLastBlockId(
			this.dataAccess,
			lastBlockId,
			limit,
		);
	}

	public async getHighestCommonBlock(
		ids: string[],
	): Promise<BlockHeader | undefined> {
		try {
			const blocks = await this.dataAccess.getBlockHeadersByIDs(ids);
			const sortedBlocks = blocks.sort((a: BlockHeader, b: BlockHeader) =>
				a.height > b.height ? -1 : 1,
			);
			const highestCommonBlock = sortedBlocks.shift();

			return highestCommonBlock;
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
			checkPersistedTransactions(this.dataAccess),
			verifyTransactions(this.slots, this.exceptions),
		)(transactions, stateStore);
	}

	public async processTransactions(
		transactions: BaseTransaction[],
	): Promise<TransactionHandledResult> {
		const stateStore = new StateStore(this.storage);

		return composeTransactionSteps(
			checkPersistedTransactions(this.dataAccess),
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
