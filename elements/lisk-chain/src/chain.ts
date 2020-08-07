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
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import { validator } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { calculateReward } from './block_reward';
import {
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
	EVENT_DELETE_BLOCK,
	EVENT_NEW_BLOCK,
	CONSENSUS_STATE_VALIDATORS_KEY,
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
} from './types';
import {
	validateBlockSlot,
	validateBlockProperties,
	validatePreviousBlockProperty,
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
	baseAccountSchema,
	blockHeaderSchema,
	stateDiffSchema,
	getGenesisBlockHeaderAssetSchema,
	blockHeaderAssetSchema,
	validatorsSchema,
} from './schema';

interface ChainConstructor {
	readonly db: KVStore;
	// Unique requirements
	readonly genesisBlock: GenesisBlock;
	readonly accounts: { [name: string]: AccountSchema };
	// Constants
	readonly networkIdentifier: Buffer;
	readonly blockTime: number;
	readonly maxPayloadLength: number;
	readonly rewardDistance: number;
	readonly rewardOffset: number;
	readonly rewardMilestones: ReadonlyArray<bigint>;
	readonly minBlockHeaderCache?: number;
	readonly maxBlockHeaderCache?: number;
}

// eslint-disable-next-line new-cap
const debug = Debug('lisk:chain');

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
	};

	private _lastBlock: Block;
	private readonly _networkIdentifier: Buffer;
	private readonly _blockRewardArgs: BlockRewardOptions;
	private readonly _genesisBlock: GenesisBlock;
	private readonly _accountSchema: Schema;
	private readonly _blockAssetSchema: {
		readonly [key: number]: Schema;
	};
	private readonly _defaultAccount: Record<string, unknown>;
	private _numberOfValidators: number;

	public constructor({
		db,
		// Unique requirements
		genesisBlock,
		// schemas
		accounts,
		// Constants
		blockTime,
		networkIdentifier,
		maxPayloadLength,
		rewardDistance,
		rewardOffset,
		rewardMilestones,
		minBlockHeaderCache = DEFAULT_MIN_BLOCK_HEADER_CACHE,
		maxBlockHeaderCache = DEFAULT_MAX_BLOCK_HEADER_CACHE,
	}: ChainConstructor) {
		this._numberOfValidators = -1;
		this.events = new EventEmitter();

		this._accountSchema = objects.cloneDeep(baseAccountSchema);
		this._defaultAccount = {};
		for (const [name, schema] of Object.entries(accounts)) {
			const { default: defaultValue, ...schemaWithoutDefault } = schema;
			this._accountSchema.properties[name] = schemaWithoutDefault;
			(this._accountSchema.required as string[]).push(name);
			this._defaultAccount[name] = defaultValue;
		}
		this._blockAssetSchema = {
			0: getGenesisBlockHeaderAssetSchema(this._accountSchema),
			2: blockHeaderAssetSchema,
		};

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
		this._genesisBlock = genesisBlock;
		this.slots = new Slots({
			genesisBlockTimestamp: genesisBlock.header.timestamp,
			interval: blockTime,
		});
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
		};
	}

	public get lastBlock(): Block {
		return this._lastBlock;
	}

	public get numberOfValidators(): number {
		return this._numberOfValidators;
	}

	public get genesisBlock(): GenesisBlock {
		return this._genesisBlock;
	}

	public get accountSchema(): Schema {
		return this._accountSchema;
	}

	public get blockAssetSchema(): { [key: number]: Schema } {
		return this._blockAssetSchema;
	}

	public async init(): Promise<void> {
		let storageLastBlock: Block;
		try {
			storageLastBlock = await this.dataAccess.getLastBlock();
		} catch (error) {
			throw new Error('Failed to load last block');
		}

		if (storageLastBlock.header.height !== this.genesisBlock.header.height) {
			await this._cacheBlockHeaders(storageLastBlock);
		}

		const validators = await this.getValidators();
		this._numberOfValidators = validators.length;

		this._lastBlock = storageLastBlock;
	}

	public calculateReward(height: number): bigint {
		return calculateReward(height, this._blockRewardArgs);
	}

	public resetBlockHeaderCache(): void {
		this.dataAccess.resetBlockHeaderCache();
	}

	public async newStateStore(skipLastHeights = 0): Promise<StateStore> {
		const fromHeight = Math.max(
			0,
			this._lastBlock.header.height - this.numberOfValidators * 3 - skipLastHeights,
		);
		const toHeight = Math.max(this._lastBlock.header.height - skipLastHeights, 1);
		const lastBlockHeaders = await this.dataAccess.getBlockHeadersByHeightBetween(
			fromHeight,
			toHeight,
		);

		const lastBlockReward = this.calculateReward(
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
		let matchingGenesisBlock: BlockHeader | undefined;
		try {
			matchingGenesisBlock = await this.dataAccess.getBlockHeaderByID(genesisBlock.header.id);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
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
		return isValidSeedReveal(blockHeader, stateStore, this.numberOfValidators);
	}

	public validateGenesisBlockHeader(block: GenesisBlock): void {
		validateGenesisBlockHeader(block, this._accountSchema);
	}

	// eslint-disable-next-line class-methods-use-this
	public applyGenesisBlock(block: GenesisBlock, stateStore: StateStore): void {
		for (const account of block.header.asset.accounts) {
			stateStore.account.set(account.address, account);
		}
		const initialValidators = block.header.asset.initDelegates.map(address => ({
			address,
			minActiveHeight: 0,
			isConsensusParticipant: false,
		}));
		stateStore.consensus.set(
			CONSENSUS_STATE_VALIDATORS_KEY,
			codec.encode(validatorsSchema, { validators: initialValidators }),
		);
		this._numberOfValidators = block.header.asset.initDelegates.length;
	}

	public validateBlockHeader(block: Block): void {
		const headerWithoutAsset = {
			...block.header,
			asset: Buffer.alloc(0),
		};
		// Validate block header
		const errors = validator.validate(blockHeaderSchema, headerWithoutAsset);
		if (errors.length) {
			throw new Error(errors[0].message);
		}
		// Validate block header asset
		const assetSchema = this.dataAccess.getBlockHeaderAssetSchema(block.header.version);
		const assetErrors = validator.validate(assetSchema, block.header.asset);
		if (assetErrors.length) {
			throw new Error(assetErrors[0].message);
		}

		validatePreviousBlockProperty(block, this._genesisBlock);
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
		validateReward(block, this.calculateReward(block.header.height));

		const encodedPayload = Buffer.concat(
			block.payload.map(tx => this.dataAccess.encodeTransaction(tx)),
		);
		validateBlockProperties(block, encodedPayload, this.constants.maxPayloadLength);
	}

	public async verifyBlockHeader(block: Block, stateStore: StateStore): Promise<void> {
		verifyPreviousBlockId(block, this._lastBlock, this._genesisBlock);
		validateBlockSlot(block, this._lastBlock, this.slots);
		verifyReward(block.header, stateStore, this.numberOfValidators);
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
		if (block.header.version === this.genesisBlock.header.version) {
			throw new Error('Cannot delete genesis block');
		}
		let secondLastBlock: Block;
		try {
			secondLastBlock = await this.dataAccess.getBlockByID(block.header.previousBlockID);
		} catch (error) {
			throw new Error('PreviousBlock is null');
		}

		await this.dataAccess.deleteBlock(block, stateStore, saveTempBlock);
		await this.dataAccess.removeBlockHeader(block.header.id);
		this._lastBlock = secondLastBlock;

		this.events.emit(EVENT_DELETE_BLOCK, {
			block,
			accounts: stateStore.account.getUpdated(),
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

	// eslint-disable-next-line class-methods-use-this
	public async setValidators(
		validators: { address: Buffer; isConsensusParticipant: boolean }[],
		stateStore: StateStore,
	): Promise<void> {
		const validatorsBuffer = await stateStore.consensus.get(CONSENSUS_STATE_VALIDATORS_KEY);
		if (!validatorsBuffer) {
			const initialValidators = validators.map(v => ({ ...v, minActiveHeight: 0 }));
			stateStore.consensus.set(
				CONSENSUS_STATE_VALIDATORS_KEY,
				codec.encode(validatorsSchema, { validators: initialValidators }),
			);
			return;
		}
		const { validators: previousValidators } = codec.decode<{ validators: Validator[] }>(
			validatorsSchema,
			validatorsBuffer,
		);
		const [lastBlock] = stateStore.chain.lastBlockHeaders;
		const nextValidatorSet = [];
		for (const nextValidator of validators) {
			const previousInfo = previousValidators.find(pv => pv.address.equals(nextValidator.address));
			nextValidatorSet.push({
				...nextValidator,
				minActiveHeight:
					// currently processed block is still in process, so the next block height is +2
					previousInfo !== undefined ? previousInfo.minActiveHeight : lastBlock.height + 2,
			});
		}
		const encodedValidators = codec.encode(validatorsSchema, { validators: nextValidatorSet });
		stateStore.consensus.set(CONSENSUS_STATE_VALIDATORS_KEY, encodedValidators);
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
}
