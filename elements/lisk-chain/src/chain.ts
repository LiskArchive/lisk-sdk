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
import { Database, NotFoundError } from '@liskhq/lisk-db';
import * as createDebug from 'debug';
import { EventEmitter } from 'events';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { calculateDefaultReward } from './block_reward';
import {
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
	EVENT_DELETE_BLOCK,
	EVENT_NEW_BLOCK,
	EVENT_VALIDATORS_CHANGED,
	CONSENSUS_STATE_VALIDATORS_KEY,
	GENESIS_BLOCK_VERSION,
	CONSENSUS_STATE_GENESIS_INFO,
} from './constants';
import { DataAccess } from './data_access';
import { Slots } from './slots';
import { StateStore } from './state_store';
import {
	Block,
	BlockHeader,
	BlockRewardOptions,
	GenesisBlock,
	AccountSchema,
	Validator,
	GenesisInfo,
} from './types';
import { getAccountSchemaWithDefault } from './utils/account';
import {
	validateBlockSlot,
	validateBlockProperties,
	validateReward,
	validateSignature,
	validateGenesisBlockHeader,
} from './validate';
import {
	verifyPreviousBlockId,
	verifyBlockGenerator,
	isValidSeedReveal,
	verifyReward,
} from './verify';
import {
	blockSchema,
	signingBlockHeaderSchema,
	blockHeaderSchema,
	stateDiffSchema,
	getRegisteredBlockAssetSchema,
	validatorsSchema,
	genesisInfoSchema,
} from './schema';
import { Transaction } from './transaction';

interface ChainConstructor {
	readonly db: Database;
	// Unique requirements
	readonly genesisBlock: GenesisBlock;
	readonly accountSchemas: { [name: string]: AccountSchema };
	// Constants
	readonly networkIdentifier: Buffer;
	readonly blockTime: number;
	readonly maxPayloadLength: number;
	readonly rewardDistance: number;
	readonly rewardOffset: number;
	readonly minFeePerByte: number;
	readonly roundLength: number;
	readonly baseFees: {
		readonly moduleID: number;
		readonly assetID: number;
		readonly baseFee: string;
	}[];
	readonly rewardMilestones: ReadonlyArray<bigint>;
	readonly minBlockHeaderCache?: number;
	readonly maxBlockHeaderCache?: number;
}

const debug = createDebug('lisk:chain');

export class Chain {
	public readonly dataAccess: DataAccess;
	public readonly events: EventEmitter;
	public readonly slots: Slots;
	public readonly constants: {
		readonly blockTime: number;
		readonly maxPayloadLength: number;
		readonly rewardDistance: number;
		readonly rewardOffset: number;
		readonly rewardMilestones: ReadonlyArray<bigint>;
		readonly networkIdentifier: Buffer;
		readonly minFeePerByte: number;
		readonly roundLength: number;
		readonly baseFees: {
			readonly moduleID: number;
			readonly assetID: number;
			readonly baseFee: string;
		}[];
	};

	private _lastBlock: Block;
	private readonly _genesisHeight: number;
	private readonly _networkIdentifier: Buffer;
	private readonly _blockRewardArgs: BlockRewardOptions;
	private readonly _accountSchema: Schema;
	private readonly _blockAssetSchema: {
		readonly [key: number]: Schema;
	};
	private readonly _defaultAccount: Record<string, unknown>;

	public constructor({
		db,
		// Unique requirements
		genesisBlock,
		// schemas
		accountSchemas,
		// Constants
		blockTime,
		networkIdentifier,
		maxPayloadLength,
		rewardDistance,
		rewardOffset,
		rewardMilestones,
		minFeePerByte,
		baseFees,
		roundLength,
		minBlockHeaderCache = DEFAULT_MIN_BLOCK_HEADER_CACHE,
		maxBlockHeaderCache = DEFAULT_MAX_BLOCK_HEADER_CACHE,
	}: ChainConstructor) {
		this.events = new EventEmitter();

		const { default: defaultAccount, ...schema } = getAccountSchemaWithDefault(accountSchemas);
		this._defaultAccount = defaultAccount;
		this._accountSchema = schema;
		this._blockAssetSchema = getRegisteredBlockAssetSchema(this._accountSchema);

		// Register codec schema
		// Add block header schemas
		codec.addSchema(blockSchema);
		codec.addSchema(blockHeaderSchema);
		codec.addSchema(signingBlockHeaderSchema);
		for (const assetSchema of Object.values(this._blockAssetSchema)) {
			codec.addSchema(assetSchema);
		}
		// Add account schema
		codec.addSchema(this._accountSchema);
		codec.addSchema(stateDiffSchema);

		this.dataAccess = new DataAccess({
			db,
			registeredBlockHeaders: this._blockAssetSchema,
			accountSchema: this._accountSchema,
			minBlockHeaderCache,
			maxBlockHeaderCache,
		});

		this._lastBlock = (genesisBlock as unknown) as Block;
		this._networkIdentifier = networkIdentifier;
		this.slots = new Slots({
			genesisBlockTimestamp: genesisBlock.header.timestamp,
			interval: blockTime,
		});
		this._genesisHeight = genesisBlock.header.height;
		this._blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMilestones,
		};
		this.constants = {
			blockTime,
			maxPayloadLength,
			rewardDistance,
			rewardOffset,
			rewardMilestones,
			networkIdentifier,
			minFeePerByte,
			baseFees,
			roundLength,
		};
	}

	public get genesisHeight(): number {
		return this._genesisHeight;
	}

	public get lastBlock(): Block {
		return this._lastBlock;
	}

	public get roundLength(): number {
		return this.constants.roundLength;
	}

	public get accountSchema(): Schema {
		return this._accountSchema;
	}

	public get blockAssetSchema(): { [key: number]: Schema } {
		return this._blockAssetSchema;
	}

	public async init(genesisBlock: GenesisBlock): Promise<void> {
		let storageLastBlock: Block;
		try {
			storageLastBlock = await this.dataAccess.getLastBlock();
		} catch (error) {
			throw new Error('Failed to load last block');
		}

		if (storageLastBlock.header.height !== genesisBlock.header.height) {
			await this._cacheBlockHeaders(storageLastBlock);
		}
		// TODO: remove on next version.
		// If there is no genesis block info stored, saves on consensus state
		// However, this should be done in apply genesis block hook below for fresh node
		const genesisInfo = await this._getGenesisInfo();
		if (!genesisInfo) {
			await this.dataAccess.setConsensusState(
				CONSENSUS_STATE_GENESIS_INFO,
				codec.encode(genesisInfoSchema, {
					height: genesisBlock.header.height,
					initRounds: genesisBlock.header.asset.initRounds,
				}),
			);
		}

		this._lastBlock = storageLastBlock;
	}

	public calculateDefaultReward(height: number): bigint {
		return calculateDefaultReward(height, this._blockRewardArgs);
	}

	public calculateExpectedReward(blockHeader: BlockHeader, stateStore: StateStore): bigint {
		const defaultReward = this.calculateDefaultReward(blockHeader.height);
		const isValid = this.isValidSeedReveal(blockHeader, stateStore);
		return isValid ? defaultReward : BigInt(0);
	}

	public resetBlockHeaderCache(): void {
		this.dataAccess.resetBlockHeaderCache();
	}

	public async newStateStore(skipLastHeights = 0): Promise<StateStore> {
		const genesisInfo = await this._getGenesisInfo();
		const fromHeight = Math.max(
			genesisInfo?.height ?? 0,
			this._lastBlock.header.height - this.constants.roundLength * 3 - skipLastHeights,
		);
		const toHeight = Math.max(this._lastBlock.header.height - skipLastHeights, 1);
		const lastBlockHeaders = await this.dataAccess.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);

		const lastBlockReward = this.calculateDefaultReward(
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			lastBlockHeaders[0]?.height ?? 1,
		);

		return new StateStore(this.dataAccess, {
			networkIdentifier: this._networkIdentifier,
			lastBlockHeaders,
			lastBlockReward,
			defaultAccount: this._defaultAccount,
		});
	}

	public async genesisBlockExist(genesisBlock: GenesisBlock): Promise<boolean> {
		const matchingGenesisBlock = await this.dataAccess.blockHeaderExists(genesisBlock.header.id);
		let lastBlockHeader: BlockHeader | undefined;
		try {
			lastBlockHeader = await this.dataAccess.getLastBlockHeader();
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		if (lastBlockHeader && !matchingGenesisBlock) {
			throw new Error('Genesis block does not match');
		}
		if (!lastBlockHeader && !matchingGenesisBlock) {
			return false;
		}
		return true;
	}

	public isValidSeedReveal(blockHeader: BlockHeader, stateStore: StateStore): boolean {
		return isValidSeedReveal(blockHeader, stateStore, this.constants.roundLength);
	}

	public validateGenesisBlockHeader(block: GenesisBlock): void {
		validateGenesisBlockHeader(block, this._accountSchema);
	}

	public async applyGenesisBlock(block: GenesisBlock, stateStore: StateStore): Promise<void> {
		for (const account of block.header.asset.accounts) {
			await stateStore.account.set(account.address, account);
		}
		const initialValidators = block.header.asset.initDelegates.map(address => ({
			address,
			// MinActiveHeight must be genesis block height + 1
			minActiveHeight: block.header.height + 1,
			isConsensusParticipant: false,
		}));
		await stateStore.consensus.set(
			CONSENSUS_STATE_VALIDATORS_KEY,
			codec.encode(validatorsSchema, { validators: initialValidators }),
		);
		await stateStore.consensus.set(
			CONSENSUS_STATE_GENESIS_INFO,
			codec.encode(genesisInfoSchema, {
				height: block.header.height,
				initRounds: block.header.asset.initRounds,
			}),
		);
	}

	public validateTransaction(transaction: Transaction): void {
		transaction.validate({
			minFeePerByte: this.constants.minFeePerByte,
			baseFees: this.constants.baseFees,
		});
	}

	public validateBlockHeader(block: Block): void {
		const headerWithoutAsset = {
			...block.header,
			asset: Buffer.alloc(0),
		};
		// Validate block header
		const errors = validator.validate(blockHeaderSchema, headerWithoutAsset);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		// Validate block header asset
		const assetSchema = this.dataAccess.getBlockHeaderAssetSchema(block.header.version);
		const assetErrors = validator.validate(assetSchema, block.header.asset);
		if (assetErrors.length) {
			throw new LiskValidationError(assetErrors);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
		const encodedBlockHeaderWithoutSignature = this.dataAccess.encodeBlockHeader(
			block.header,
			true,
		);
		validateSignature(
			block.header.generatorPublicKey,
			encodedBlockHeaderWithoutSignature,
			block.header.signature,
			this._networkIdentifier,
		);
		validateReward(block, this.calculateDefaultReward(block.header.height));

		const encodedPayload = Buffer.concat(
			block.payload.map(tx => this.dataAccess.encodeTransaction(tx)),
		);
		validateBlockProperties(block, encodedPayload, this.constants.maxPayloadLength);
	}

	public async verifyBlockHeader(block: Block, stateStore: StateStore): Promise<void> {
		verifyPreviousBlockId(block, this._lastBlock);
		validateBlockSlot(block, this._lastBlock, this.slots);
		verifyReward(block.header, stateStore, this.constants.roundLength);
		await verifyBlockGenerator(block.header, this.slots, stateStore);
	}

	public async saveBlock(
		block: Block,
		stateStore: StateStore,
		finalizedHeight: number,
		{ removeFromTempTable } = {
			removeFromTempTable: false,
		},
	): Promise<void> {
		await this.dataAccess.saveBlock(block, stateStore, finalizedHeight, removeFromTempTable);
		this.dataAccess.addBlockHeader(block.header);
		this._lastBlock = block;

		this.events.emit(EVENT_NEW_BLOCK, {
			block,
			accounts: stateStore.account.getUpdated(),
		});
	}

	public async removeBlock(
		block: Block,
		stateStore: StateStore,
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		if (block.header.version === GENESIS_BLOCK_VERSION) {
			throw new Error('Cannot delete genesis block');
		}
		let secondLastBlock: Block;
		try {
			secondLastBlock = await this.dataAccess.getBlockByID(block.header.previousBlockID);
		} catch (error) {
			throw new Error('PreviousBlock is null');
		}

		const updatedAccounts = await this.dataAccess.deleteBlock(block, stateStore, saveTempBlock);
		await this.dataAccess.removeBlockHeader(block.header.id);
		this._lastBlock = secondLastBlock;

		this.events.emit(EVENT_DELETE_BLOCK, {
			block,
			accounts: updatedAccounts,
		});
	}

	public async getValidator(timestamp: number): Promise<Validator> {
		const validators = await this.getValidators();
		const currentSlot = this.slots.getSlotNumber(timestamp);
		return validators[currentSlot % validators.length];
	}

	public async getValidators(): Promise<Validator[]> {
		const validatorsBuffer = await this.dataAccess.getConsensusState(
			CONSENSUS_STATE_VALIDATORS_KEY,
		);
		if (!validatorsBuffer) {
			return [];
		}
		const { validators } = codec.decode<{ validators: Validator[] }>(
			validatorsSchema,
			validatorsBuffer,
		);

		return validators;
	}

	public async setValidators(
		validators: { address: Buffer; isConsensusParticipant: boolean }[],
		stateStore: StateStore,
		blockHeader: BlockHeader,
	): Promise<void> {
		const lastBootstrapHeight = await this._getLastBootstrapHeight();
		if (lastBootstrapHeight > blockHeader.height) {
			debug(
				`Skipping updating validator since current height ${blockHeader.height} is lower than last bootstrap height ${lastBootstrapHeight}`,
			);
			return;
		}
		const validatorsBuffer = await stateStore.consensus.get(CONSENSUS_STATE_VALIDATORS_KEY);
		if (!validatorsBuffer) {
			throw new Error('Previous validator set must exist');
		}
		const { validators: previousValidators } = codec.decode<{ validators: Validator[] }>(
			validatorsSchema,
			validatorsBuffer,
		);
		const nextValidatorSet = [];
		for (const nextValidator of validators) {
			const previousInfo = previousValidators.find(pv => pv.address.equals(nextValidator.address));
			nextValidatorSet.push({
				...nextValidator,
				minActiveHeight:
					previousInfo !== undefined ? previousInfo.minActiveHeight : blockHeader.height + 1,
			});
		}
		const encodedValidators = codec.encode(validatorsSchema, { validators: nextValidatorSet });
		await stateStore.consensus.set(CONSENSUS_STATE_VALIDATORS_KEY, encodedValidators);
		this.events.emit(EVENT_VALIDATORS_CHANGED, { validators: nextValidatorSet });
	}

	private async _cacheBlockHeaders(storageLastBlock: Block): Promise<void> {
		// Cache the block headers (size=DEFAULT_MAX_BLOCK_HEADER_CACHE)
		const fromHeight = Math.max(storageLastBlock.header.height - DEFAULT_MAX_BLOCK_HEADER_CACHE, 0);
		const toHeight = storageLastBlock.header.height;

		debug(
			{ h: storageLastBlock.header.height, fromHeight, toHeight },
			'Cache block headers during chain init',
		);
		const blockHeaders = await this.dataAccess.getBlockHeadersByHeightBetween(fromHeight, toHeight);
		const sortedBlockHeaders = [...blockHeaders].sort(
			(a: BlockHeader, b: BlockHeader) => a.height - b.height,
		);

		for (const blockHeader of sortedBlockHeaders) {
			debug({ height: blockHeader.height }, 'Add block header to cache');
			this.dataAccess.addBlockHeader(blockHeader);
		}
	}

	private async _getLastBootstrapHeight(): Promise<number> {
		const genesisInfo = await this._getGenesisInfo();
		if (!genesisInfo) {
			throw new Error('genesis info not stored');
		}
		return this.constants.roundLength * genesisInfo.initRounds + genesisInfo.height;
	}

	private async _getGenesisInfo(): Promise<GenesisInfo | undefined> {
		const genesisInfoBytes = await this.dataAccess.getConsensusState(CONSENSUS_STATE_GENESIS_INFO);
		if (!genesisInfoBytes) {
			return undefined;
		}
		return codec.decode<GenesisInfo>(genesisInfoSchema, genesisInfoBytes);
	}
}
