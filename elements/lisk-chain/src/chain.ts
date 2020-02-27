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
} from '@liskhq/lisk-transactions';
import * as Debug from 'debug';
import { EventEmitter } from 'events';

import {
	applyFeeAndRewards,
	calculateMilestone,
	calculateReward,
	calculateSupply,
	getTotalFees,
	undoFeeAndRewards,
} from './block_reward';
import { DataAccess } from './data_access';
import { Slots } from './slots';
import { StateStore } from './state_store';
import {
	applyGenesisTransactions,
	applyTransactions,
	checkAllowedTransactions,
	checkIfTransactionIsInert,
	checkPersistedTransactions,
	composeTransactionSteps,
	undoTransactions,
	validateTransactions,
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
	MatcherTransaction,
	Storage,
	StorageTransaction,
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

interface ChainConstructor {
	// Components
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
	readonly minBlockHeaderCache?: number;
	readonly maxBlockHeaderCache?: number;
}

const DEFAULT_MIN_BLOCK_HEADER_CACHE = 303;
const DEFAULT_MAX_BLOCK_HEADER_CACHE = 505;
export const EVENT_NEW_BLOCK = 'NEW_BLOCK';
export const EVENT_DELETE_BLOCK = 'DELETE_BLOCK';

// tslint:disable-next-line no-magic-numbers
const TRANSACTION_TYPES_VOTE = [3, 11];

const saveBlock = async (
	storage: Storage,
	blockJSON: BlockJSON,
	tx: StorageTransaction,
): Promise<void> => {
	if (!tx) {
		throw new Error('Block should only be saved in a database tx');
	}
	// If there is already a running transaction use it
	const promises = [storage.entities.Block.create(blockJSON, {}, tx)];

	if (blockJSON.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(blockJSON.transactions, {}, tx),
		);
	}

	return tx.batch(promises);
};

const applyConfirmedStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
	exceptions: ExceptionOptions,
) => {
	if (blockInstance.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = blockInstance.transactions.filter(
		transaction => !checkIfTransactionIsInert(transaction, exceptions),
	);

	const { transactionsResponses } = await applyTransactions(exceptions)(
		nonInertTransactions,
		stateStore,
	);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliableTransactionsResponse.length > 0) {
		throw unappliableTransactionsResponse[0].errors;
	}
};

const applyConfirmedGenesisStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
): Promise<BlockInstance> => {
	blockInstance.transactions.sort(a => {
		if (TRANSACTION_TYPES_VOTE.includes(a.type)) {
			return 1;
		}

		return 0;
	});
	const sortedTransactionInstances = [...blockInstance.transactions];
	await applyGenesisTransactions()(sortedTransactionInstances, stateStore);

	return blockInstance;
};

const undoConfirmedStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
	exceptions: ExceptionOptions,
): Promise<void> => {
	if (blockInstance.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = blockInstance.transactions.filter(
		transaction =>
			!exceptions.inertTransactions ||
			!exceptions.inertTransactions.includes(transaction.id),
	);

	const { transactionsResponses } = await undoTransactions(exceptions)(
		nonInertTransactions,
		stateStore,
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}
};

const debug = Debug('lisk:chain');

export class Chain {
	private _lastBlock: BlockInstance;
	private readonly blocksVerify: BlocksVerify;
	private readonly storage: Storage;
	public readonly dataAccess: DataAccess;
	public readonly slots: Slots;
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
	private readonly events: EventEmitter;

	public readonly blockReward: {
		readonly [key: string]: (height: number) => number | bigint;
	};

	public constructor({
		// Components
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
		minBlockHeaderCache = DEFAULT_MIN_BLOCK_HEADER_CACHE,
		maxBlockHeaderCache = DEFAULT_MAX_BLOCK_HEADER_CACHE,
	}: ChainConstructor) {
		this.events = new EventEmitter();

		this.storage = storage;
		this.dataAccess = new DataAccess({
			dbStorage: storage,
			networkIdentifier,
			registeredTransactions,
			minBlockHeaderCache,
			maxBlockHeaderCache,
		});

		const genesisInstance = this.dataAccess.deserialize(genesisBlock);
		this._lastBlock = genesisInstance;
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
			dataAccess: this.dataAccess,
			exceptions: this.exceptions,
			genesisBlock: this.genesisBlock,
		});
	}

	public get lastBlock(): BlockInstance {
		// Remove receivedAt property..
		const { receivedAt, ...block } = this._lastBlock;

		return block;
	}

	public deserialize(blockJSON: BlockJSON): BlockInstance {
		return this.dataAccess.deserialize(blockJSON);
	}

	public serialize(blockJSON: BlockInstance): BlockJSON {
		return this.dataAccess.serialize(blockJSON);
	}

	public deserializeBlockHeader(blockJSON: BlockHeaderJSON): BlockHeader {
		return this.dataAccess.deserializeBlockHeader(blockJSON);
	}

	public deserializeTransaction(
		transactionJSON: TransactionJSON,
	): BaseTransaction {
		return this.dataAccess.deserializeTransaction(transactionJSON);
	}

	public async init(): Promise<void> {
		// Check mem tables
		const genesisBlock = await this.dataAccess.getBlockHeaderByHeight(1);

		if (!genesisBlock) {
			throw new Error('Failed to load genesis block');
		}

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		const storageLastBlock = await this.dataAccess.getLastBlock();
		if (!storageLastBlock) {
			throw new Error('Failed to load last block');
		}

		if (storageLastBlock.height !== genesisBlock.height) {
			await this._cacheBlockHeaders(storageLastBlock);
		}

		this._lastBlock = storageLastBlock;
	}

	public resetBlockHeaderCache(): void {
		this.dataAccess.resetBlockHeaderCache();
	}

	public newStateStore(): StateStore {
		return new StateStore(this.storage);
	}

	private async _cacheBlockHeaders(
		storageLastBlock: BlockInstance,
	): Promise<void> {
		// Cache the block headers (size=DEFAULT_MAX_BLOCK_HEADER_CACHE)
		const fromHeight = Math.max(
			storageLastBlock.height - DEFAULT_MAX_BLOCK_HEADER_CACHE,
			1,
		);
		const toHeight = storageLastBlock.height;

		debug(
			{ h: storageLastBlock.height, fromHeight, toHeight },
			'Cache block headers during chain init',
		);
		const blockHeaders = await this.dataAccess.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);
		const sortedBlockHeaders = [...blockHeaders].sort(
			(a: BlockHeader, b: BlockHeader) => a.height - b.height,
		);

		for (const blockHeader of sortedBlockHeaders) {
			debug({ height: blockHeader.height }, 'Add block header to cache');
			this.dataAccess.addBlockHeader(blockHeader);
		}
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

	public async resetState(): Promise<void> {
		await this.storage.entities.Account.resetMemTables();
		await this.storage.entities.ChainState.delete();
		this.dataAccess.resetBlockHeaderCache();
	}

	public verifyInMemory(block: BlockInstance, lastBlock: BlockInstance): void {
		verifyPreviousBlockId(block, lastBlock, this.genesisBlock);
		validateBlockSlot(block, lastBlock, this.slots);
	}

	public async verify(
		blockInstance: BlockInstance,
		_: StateStore,
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
		await this.blocksVerify.checkTransactions(blockInstance);
	}

	public async apply(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedStep(blockInstance, stateStore, this.exceptions);
		await applyFeeAndRewards(blockInstance, stateStore);
	}

	// tslint:disable-next-line prefer-function-over-method
	public async applyGenesis(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedGenesisStep(blockInstance, stateStore);
		await applyFeeAndRewards(blockInstance, stateStore);
	}

	public async save(
		blockInstance: BlockInstance,
		stateStore: StateStore,
		{ saveOnlyState, removeFromTempTable } = {
			saveOnlyState: false,
			removeFromTempTable: false,
		},
	): Promise<void> {
		return this.storage.entities.Block.begin('saveBlock', async tx => {
			await stateStore.finalize(tx);
			if (!saveOnlyState) {
				const blockJSON = this.serialize(blockInstance);
				await saveBlock(this.storage, blockJSON, tx);
			}
			if (removeFromTempTable) {
				await this.removeBlockFromTempTable(blockInstance.id, tx);
			}
			this.dataAccess.addBlockHeader(blockInstance);
			this._lastBlock = blockInstance;

			const accounts = stateStore.account
				.getUpdated()
				.map(anAccount => anAccount.toJSON());

			this.events.emit(EVENT_NEW_BLOCK, {
				block: this.serialize(blockInstance),
				accounts,
			});
		});
	}

	public async undo(
		blockInstance: BlockInstance,
		stateStore: StateStore,
	): Promise<void> {
		await undoFeeAndRewards(blockInstance, stateStore);
		await undoConfirmedStep(blockInstance, stateStore, this.exceptions);
	}

	private async _deleteLastBlock(
		lastBlock: BlockInstance,
		tx?: StorageTransaction,
	): Promise<BlockInstance> {
		if (lastBlock.height === 1) {
			throw new Error('Cannot delete genesis block');
		}
		const block = await this.dataAccess.getBlockByID(
			lastBlock.previousBlockId as string,
		);

		if (!block) {
			throw new Error('PreviousBlock is null');
		}

		await this.storage.entities.Block.delete({ id: lastBlock.id }, {}, tx);

		return block;
	}

	public async remove(
		block: BlockInstance,
		stateStore: StateStore,
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		await this.storage.entities.Block.begin('revertBlock', async tx => {
			const secondLastBlock = await this._deleteLastBlock(block, tx);

			if (saveTempBlock) {
				const blockJSON = this.serialize(block);
				const blockTempEntry = {
					id: blockJSON.id,
					height: blockJSON.height,
					fullBlock: blockJSON,
				};
				await this.storage.entities.TempBlock.create(blockTempEntry, {}, tx);
			}
			await stateStore.finalize(tx);
			await this.dataAccess.removeBlockHeader(block.id);
			this._lastBlock = secondLastBlock;

			const accounts = stateStore.account
				.getUpdated()
				.map(anAccount => anAccount.toJSON());

			this.events.emit(EVENT_DELETE_BLOCK, {
				block: this.serialize(block),
				accounts,
			});
		});
	}

	public async removeBlockFromTempTable(
		blockId: string,
		tx: StorageTransaction,
	): Promise<void> {
		return this.storage.entities.TempBlock.delete({ id: blockId }, {}, tx);
	}

	public async exists(block: BlockInstance): Promise<boolean> {
		try {
			await verifyBlockNotExists(this.storage, block);

			return false;
		} catch (err) {
			return true;
		}
	}

	public async getHighestCommonBlock(
		ids: string[],
	): Promise<BlockHeader | undefined> {
		const blocks = await this.dataAccess.getBlockHeadersByIDs(ids);
		const sortedBlocks = [...blocks].sort(
			(a: BlockHeader, b: BlockHeader) => b.height - a.height,
		);
		const highestCommonBlock = sortedBlocks.shift();

		return highestCommonBlock;
	}

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

	// TODO: Remove this function in #4841 as it is not needed on the new transaction pool
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
			applyTransactions(this.exceptions),
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

	// Temporally added because DPoS uses totalEarning to calculate the vote weight change
	// tslint:disable-next-line prefer-function-over-method
	public getTotalEarningAndBurnt(
		blockInstance: BlockInstance,
	): { readonly totalEarning: bigint; readonly totalBurnt: bigint } {
		const { totalFee, totalMinFee } = getTotalFees(blockInstance);

		return {
			totalEarning: blockInstance.reward + totalFee - totalMinFee,
			totalBurnt: totalMinFee,
		};
	}
}
