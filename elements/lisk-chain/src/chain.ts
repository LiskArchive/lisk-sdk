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

import { codec, Schema } from '@liskhq/lisk-codec';
import { KVStore } from '@liskhq/lisk-db';
import {
	BaseTransaction,
	Status as TransactionStatus,
	TransactionResponse,
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
import {
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
	DEFAULT_STATE_BLOCK_SIZE,
	EVENT_DELETE_BLOCK,
	EVENT_NEW_BLOCK,
} from './constants';
import { DataAccess } from './data_access';
import { Slots } from './slots';
import { StateStore } from './state_store';
import {
	applyGenesisTransactions,
	applyTransactions,
	checkAllowedTransactions,
	checkPersistedTransactions,
	composeTransactionSteps,
	undoTransactions,
	validateTransactions,
} from './transactions';
import {
	Block,
	BlockHeader,
	BlockRewardOptions,
	Contexter,
	MatcherTransaction,
} from './types';
import {
	validateBlockSlot,
	validateBlockProperties,
	validatePreviousBlockProperty,
	validateReward,
	validateSignature,
} from './validate';
import {
	BlocksVerify,
	verifyBlockNotExists,
	verifyPreviousBlockId,
} from './verify';
import {
	blockSchema,
	signingBlockHeaderSchema,
	baseAccountSchema,
} from './schema';

interface ChainConstructor {
	readonly db: KVStore;
	// Unique requirements
	readonly genesisBlock: Block;
	// Modules
	readonly registeredTransactions: {
		readonly [key: number]: typeof BaseTransaction;
	};
	readonly registeredBlocks: {
		readonly [key: number]: Schema;
	};
	readonly accountAsset: {
		schema: object;
		default: object;
	};
	// Constants
	readonly epochTime: string;
	readonly blockTime: number;
	readonly networkIdentifier: Buffer;
	readonly maxPayloadLength: number;
	readonly rewardDistance: number;
	readonly rewardOffset: number;
	readonly rewardMilestones: ReadonlyArray<string>;
	readonly totalAmount: string;
	readonly stateBlockSize?: number;
	readonly minBlockHeaderCache?: number;
	readonly maxBlockHeaderCache?: number;
}

const applyConfirmedStep = async (
	block: Block,
	stateStore: StateStore,
): Promise<void> => {
	if (block.payload.length <= 0) {
		return;
	}

	const transactionsResponses = await applyTransactions()(
		block.payload,
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
	block: Block,
	stateStore: StateStore,
): Promise<Block> => {
	await applyGenesisTransactions()(block.payload, stateStore);

	return block;
};

const undoConfirmedStep = async (
	block: Block,
	stateStore: StateStore,
): Promise<void> => {
	if (block.payload.length === 0) {
		return;
	}

	const transactionsResponses = await undoTransactions()(
		block.payload,
		stateStore,
	);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}
};

// eslint-disable-next-line new-cap
const debug = Debug('lisk:chain');

export class Chain {
	public readonly dataAccess: DataAccess;
	public readonly events: EventEmitter;
	public readonly slots: Slots;
	public readonly blockReward: {
		readonly calculateMilestone: (height: number) => number;
		readonly calculateReward: (height: number) => bigint;
		readonly calculateSupply: (height: number) => bigint;
	};

	private _lastBlock: Block;
	private readonly blocksVerify: BlocksVerify;
	private readonly _networkIdentifier: Buffer;
	private readonly blockRewardArgs: BlockRewardOptions;
	private readonly genesisBlock: Block;
	private readonly constants: {
		readonly stateBlockSize: number;
		readonly epochTime: string;
		readonly blockTime: number;
		readonly maxPayloadLength: number;
	};
	private readonly _defaultAccountAsset: object;

	public constructor({
		db,
		// Unique requirements
		genesisBlock,
		// schemas
		registeredBlocks,
		accountAsset,
		registeredTransactions,
		// Constants
		epochTime,
		blockTime,
		networkIdentifier,
		maxPayloadLength,
		rewardDistance,
		rewardOffset,
		rewardMilestones,
		totalAmount,
		stateBlockSize = DEFAULT_STATE_BLOCK_SIZE,
		minBlockHeaderCache = DEFAULT_MIN_BLOCK_HEADER_CACHE,
		maxBlockHeaderCache = DEFAULT_MAX_BLOCK_HEADER_CACHE,
	}: ChainConstructor) {
		this.events = new EventEmitter();

		// Register codec schema
		// Add block schema
		codec.addSchema(blockSchema);
		codec.addSchema(signingBlockHeaderSchema);
		// Add block header schemas
		for (const schema of Object.values(registeredBlocks)) {
			codec.addSchema(schema);
		}
		// Add account schema
		const accountSchema = {
			...baseAccountSchema,
			properties: {
				...baseAccountSchema.properties,
				asset: {
					...baseAccountSchema.properties.asset,
					...accountAsset.schema,
				},
			},
		};
		codec.addSchema(accountSchema);
		this._defaultAccountAsset = accountAsset.default;

		this.dataAccess = new DataAccess({
			db,
			registeredBlockHeaders: registeredBlocks,
			registeredTransactions,
			accountSchema,
			minBlockHeaderCache,
			maxBlockHeaderCache,
		});

		this._lastBlock = genesisBlock;
		this._networkIdentifier = networkIdentifier;
		this.genesisBlock = genesisBlock;
		this.slots = new Slots({ epochTime, interval: blockTime });
		this.blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMilestones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: (height: number): number =>
				calculateMilestone(height, this.blockRewardArgs),
			calculateReward: (height: number): bigint =>
				calculateReward(height, this.blockRewardArgs),
			calculateSupply: (height: number): bigint =>
				calculateSupply(height, this.blockRewardArgs),
		};
		this.constants = {
			stateBlockSize,
			epochTime,
			blockTime,
			maxPayloadLength,
		};

		this.blocksVerify = new BlocksVerify({
			dataAccess: this.dataAccess,
			genesisBlock: this.genesisBlock,
		});
	}

	public get lastBlock(): Block {
		// Remove receivedAt property..
		const { ...block } = this._lastBlock;

		return block;
	}

	public async init(): Promise<void> {
		// Check mem tables
		let genesisBlock: BlockHeader;
		try {
			genesisBlock = await this.dataAccess.getBlockHeaderByHeight(1);
		} catch (error) {
			throw new Error('Failed to load genesis block');
		}

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		let storageLastBlock: Block;
		try {
			storageLastBlock = await this.dataAccess.getLastBlock();
		} catch (error) {
			throw new Error('Failed to load last block');
		}

		if (storageLastBlock.header.height !== genesisBlock.height) {
			await this._cacheBlockHeaders(storageLastBlock);
		}

		this._lastBlock = storageLastBlock;
	}

	public resetBlockHeaderCache(): void {
		this.dataAccess.resetBlockHeaderCache();
	}

	public async newStateStore(skipLastHeights = 0): Promise<StateStore> {
		const fromHeight = Math.max(
			1,
			this._lastBlock.header.height -
				this.constants.stateBlockSize -
				skipLastHeights,
		);
		const toHeight = Math.max(
			this._lastBlock.header.height - skipLastHeights,
			1,
		);
		const lastBlockHeaders = await this.dataAccess.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);

		const lastBlockReward = this.blockReward.calculateReward(
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			lastBlockHeaders[0]?.height ?? 1,
		);

		return new StateStore(this.dataAccess, {
			networkIdentifier: this._networkIdentifier,
			lastBlockHeaders,
			lastBlockReward,
			defaultAsset: this._defaultAccountAsset,
		});
	}

	public validateBlockHeader(block: Block): void {
		validatePreviousBlockProperty(block, this.genesisBlock);
		const encodedBlockHeaderWithoutSignature = this.dataAccess.encodeBlockHeader(
			block.header,
			true,
		);
		validateSignature(
			block,
			encodedBlockHeaderWithoutSignature,
			this._networkIdentifier,
		);
		validateReward(
			block,
			this.blockReward.calculateReward(block.header.height),
		);

		// Validate transactions
		const transactionsResponses = validateTransactions()(block.payload);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}

		// FIXME: need to get raw payload bytes
		const encodedPayload = Buffer.concat(
			block.payload.map(tx => this.dataAccess.encodeTransaction(tx)),
		);
		validateBlockProperties(
			block,
			encodedPayload,
			this.constants.maxPayloadLength,
		);
	}

	public async verify(
		block: Block,
		_: StateStore,
		{ skipExistingCheck }: { readonly skipExistingCheck: boolean },
	): Promise<void> {
		verifyPreviousBlockId(block, this._lastBlock, this.genesisBlock);
		validateBlockSlot(block, this._lastBlock, this.slots);
		if (!skipExistingCheck) {
			await verifyBlockNotExists(this.dataAccess, block);
			const transactionsResponses = await checkPersistedTransactions(
				this.dataAccess,
			)(block.payload);
			const invalidPersistedResponse = transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidPersistedResponse) {
				throw invalidPersistedResponse.errors;
			}
		}
		await this.blocksVerify.checkTransactions(block);
	}

	// eslint-disable-next-line class-methods-use-this
	public async apply(
		blockInstance: Block,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedStep(blockInstance, stateStore);
		await applyFeeAndRewards(blockInstance, stateStore);
	}

	// eslint-disable-next-line class-methods-use-this
	public async applyGenesis(
		blockInstance: Block,
		stateStore: StateStore,
	): Promise<void> {
		await applyConfirmedGenesisStep(blockInstance, stateStore);
		await applyFeeAndRewards(blockInstance, stateStore);
	}

	public async save(
		block: Block,
		stateStore: StateStore,
		{ removeFromTempTable } = {
			removeFromTempTable: false,
		},
	): Promise<void> {
		const accounts = stateStore.account
			.getUpdated()
			.map(anAccount => this.dataAccess.encodeAccount(anAccount));

		await this.dataAccess.saveBlock(block, stateStore, removeFromTempTable);
		this.dataAccess.addBlockHeader(block.header);
		this._lastBlock = block;

		this.events.emit(EVENT_NEW_BLOCK, {
			block: this.dataAccess.encode(block),
			accounts,
		});
	}

	// eslint-disable-next-line class-methods-use-this
	public async undo(
		blockInstance: Block,
		stateStore: StateStore,
	): Promise<void> {
		await undoFeeAndRewards(blockInstance, stateStore);
		await undoConfirmedStep(blockInstance, stateStore);
	}

	public async remove(
		block: Block,
		stateStore: StateStore,
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		if (block.header.height === 1) {
			throw new Error('Cannot delete genesis block');
		}
		let secondLastBlock: Block;
		try {
			secondLastBlock = await this.dataAccess.getBlockByID(
				block.header.previousBlockID,
			);
		} catch (error) {
			throw new Error('PreviousBlock is null');
		}

		await this.dataAccess.deleteBlock(block, stateStore, saveTempBlock);
		await this.dataAccess.removeBlockHeader(block.header.id);
		this._lastBlock = secondLastBlock;

		const accounts = stateStore.account
			.getUpdated()
			.map(anAccount => this.dataAccess.encodeAccount(anAccount));

		this.events.emit(EVENT_DELETE_BLOCK, {
			block: this.dataAccess.encode(block),
			accounts,
		});
	}

	public async exists(block: Block): Promise<boolean> {
		return this.dataAccess.isBlockPersisted(block.header.id);
	}

	public async getHighestCommonBlock(
		ids: Buffer[],
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
		const stateStore = await this.newStateStore();
		const allowedTransactionsIds = checkAllowedTransactions(context)(
			transactions as MatcherTransaction[],
		)
			.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK,
			)
			.map(transactionResponse => transactionResponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id),
		);
		const transactionsResponses = await applyTransactions()(
			allowedTransactions,
			stateStore,
		);
		const readyTransactions = allowedTransactions.filter(transaction =>
			transactionsResponses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id),
		);

		return readyTransactions;
	}

	public async validateTransactions(
		transactions: BaseTransaction[],
	): Promise<ReadonlyArray<TransactionResponse>> {
		return composeTransactionSteps(
			checkAllowedTransactions({
				blockVersion: this.lastBlock.header.version,
				blockHeight: this.lastBlock.header.height,
				blockTimestamp: this.lastBlock.header.timestamp,
			}),
			validateTransactions(),
			// Composed transaction checks are all static, so it does not need state store
		)(transactions);
	}

	public async applyTransactions(
		transactions: BaseTransaction[],
	): Promise<TransactionResponse[]> {
		const stateStore = await this.newStateStore();

		return composeTransactionSteps(
			checkAllowedTransactions(() => {
				const { version, height, timestamp } = this._lastBlock.header;

				return {
					blockVersion: version,
					blockHeight: height,
					blockTimestamp: timestamp,
				};
			}),
			checkPersistedTransactions(this.dataAccess),
			applyTransactions(),
		)(transactions, stateStore);
	}

	public async applyTransactionsWithStateStore(
		transactions: BaseTransaction[],
		stateStore: StateStore,
	): Promise<ReadonlyArray<TransactionResponse>> {
		return composeTransactionSteps(
			checkPersistedTransactions(this.dataAccess),
			applyTransactions(),
		)(transactions, stateStore);
	}

	// Temporally added because DPoS uses totalEarning to calculate the vote weight change
	// eslint-disable-next-line class-methods-use-this
	public getTotalEarningAndBurnt(
		block: Block,
	): { readonly totalEarning: bigint; readonly totalBurnt: bigint } {
		const { totalFee, totalMinFee } = getTotalFees(block);

		return {
			totalEarning: block.header.reward + totalFee - totalMinFee,
			totalBurnt: totalMinFee,
		};
	}

	private async _cacheBlockHeaders(storageLastBlock: Block): Promise<void> {
		// Cache the block headers (size=DEFAULT_MAX_BLOCK_HEADER_CACHE)
		const fromHeight = Math.max(
			storageLastBlock.header.height - DEFAULT_MAX_BLOCK_HEADER_CACHE,
			1,
		);
		const toHeight = storageLastBlock.header.height;

		debug(
			{ h: storageLastBlock.header.height, fromHeight, toHeight },
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
}
