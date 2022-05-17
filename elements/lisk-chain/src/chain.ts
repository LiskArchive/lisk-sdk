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

import { codec } from '@liskhq/lisk-codec';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import * as createDebug from 'debug';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import {
	DEFAULT_KEEP_EVENTS_FOR_HEIGHTS,
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
	GENESIS_BLOCK_VERSION,
} from './constants';
import { DataAccess } from './data_access';
import {
	blockSchema,
	signingBlockHeaderSchema,
	blockHeaderSchema,
	stateDiffSchema,
} from './schema';
import { Block } from './block';
import { Event } from './event';
import { BlockHeader } from './block_header';
import { CurrentState } from './state_store/smt_store';

interface ChainConstructor {
	// Constants
	readonly keepEventsForHeights: number;
	readonly maxTransactionsSize: number;
	readonly minBlockHeaderCache?: number;
	readonly maxBlockHeaderCache?: number;
}

interface ChainInitArgs {
	readonly db: KVStore;
	readonly networkIdentifier: Buffer;
	readonly genesisBlock: Block;
}

interface BlockValidationInput {
	readonly version: number;
	readonly acceptedModuleIDs: number[];
}

const debug = createDebug('lisk:chain');

export class Chain {
	public dataAccess!: DataAccess;
	public readonly constants: {
		readonly maxTransactionsSize: number;
		readonly minBlockHeaderCache: number;
		readonly maxBlockHeaderCache: number;
		readonly keepEventsForHeights: number;
	};

	private _lastBlock?: Block;
	private _finalizedHeight?: number;
	private _networkIdentifier!: Buffer;
	private _genesisHeight!: number;

	public constructor({
		// Constants
		maxTransactionsSize,
		keepEventsForHeights = DEFAULT_KEEP_EVENTS_FOR_HEIGHTS,
		minBlockHeaderCache = DEFAULT_MIN_BLOCK_HEADER_CACHE,
		maxBlockHeaderCache = DEFAULT_MAX_BLOCK_HEADER_CACHE,
	}: ChainConstructor) {
		// Register codec schema
		codec.addSchema(blockSchema);
		codec.addSchema(blockHeaderSchema);
		codec.addSchema(signingBlockHeaderSchema);
		codec.addSchema(stateDiffSchema);

		this.constants = {
			maxTransactionsSize,
			maxBlockHeaderCache,
			minBlockHeaderCache,
			keepEventsForHeights,
		};
	}

	public get genesisHeight(): number {
		return this._genesisHeight;
	}

	public get lastBlock(): Block {
		if (this._lastBlock === undefined) {
			throw new Error('Chain has not been initialized.');
		}
		return this._lastBlock;
	}

	public get finalizedHeight(): number {
		if (this._finalizedHeight === undefined) {
			throw new Error('Chain has not been initialized.');
		}
		return this._finalizedHeight;
	}

	public get networkIdentifier(): Buffer {
		return this._networkIdentifier;
	}

	public init(args: ChainInitArgs): void {
		this._networkIdentifier = args.networkIdentifier;
		this.dataAccess = new DataAccess({
			db: args.db,
			minBlockHeaderCache: this.constants.minBlockHeaderCache,
			maxBlockHeaderCache: this.constants.maxBlockHeaderCache,
			keepEventsForHeights: this.constants.keepEventsForHeights,
		});
	}

	public async loadLastBlocks(genesisBlock: Block): Promise<void> {
		let storageLastBlock: Block;
		try {
			storageLastBlock = await this.dataAccess.getLastBlock();
		} catch (error) {
			throw new Error('Failed to load last block.');
		}

		if (storageLastBlock.header.height !== genesisBlock.header.height) {
			await this._cacheBlockHeaders(storageLastBlock);
		}
		this._lastBlock = storageLastBlock;
		this._genesisHeight = genesisBlock.header.height;
		this._finalizedHeight = await this.dataAccess.getFinalizedHeight();
	}

	public resetBlockHeaderCache(): void {
		this.dataAccess.resetBlockHeaderCache();
	}

	public async genesisBlockExist(genesisBlock: Block): Promise<boolean> {
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
			throw new Error('Genesis block does not match.');
		}
		if (!lastBlockHeader && !matchingGenesisBlock) {
			return false;
		}
		return true;
	}

	public validateBlock(block: Block, inputs: BlockValidationInput): void {
		block.validate();
		if (block.header.version !== inputs.version) {
			throw new Error(`Block version must be ${inputs.version}.`);
		}
		for (const asset of block.assets.getAll()) {
			if (!inputs.acceptedModuleIDs.includes(asset.moduleID)) {
				throw new Error(`Block asset with moduleID: ${asset.moduleID} is not accepted.`);
			}
		}
		const transactionIDs = [];
		let transactionsSize = 0;
		for (const tx of block.transactions) {
			transactionIDs.push(tx.id);
			transactionsSize += tx.getBytes().length;
		}
		if (transactionsSize > this.constants.maxTransactionsSize) {
			throw new Error(
				`Transactions length is longer than configured length: ${this.constants.maxTransactionsSize}.`,
			);
		}

		const transactionRoot = regularMerkleTree.calculateMerkleRootWithLeaves(transactionIDs);
		if (!transactionRoot.equals(block.header.transactionRoot as Buffer)) {
			throw new Error('Invalid transaction root.');
		}
	}

	public async saveBlock(
		block: Block,
		events: Event[],
		state: CurrentState,
		finalizedHeight: number,
		{ removeFromTempTable } = {
			removeFromTempTable: false,
		},
	): Promise<void> {
		await this.dataAccess.saveBlock(block, events, state, finalizedHeight, removeFromTempTable);
		this.dataAccess.addBlockHeader(block.header);
		this._finalizedHeight = finalizedHeight;
		this._lastBlock = block;
	}

	public async removeBlock(
		block: Block,
		state: CurrentState,
		{ saveTempBlock } = { saveTempBlock: false },
	): Promise<void> {
		if (block.header.version === GENESIS_BLOCK_VERSION) {
			throw new Error('Cannot delete genesis block.');
		}
		let secondLastBlock: Block;
		try {
			secondLastBlock = await this.dataAccess.getBlockByID(block.header.previousBlockID);
		} catch (error) {
			throw new Error('PreviousBlock is null.');
		}

		await this.dataAccess.deleteBlock(block, state, saveTempBlock);
		await this.dataAccess.removeBlockHeader(block.header.id);
		this._lastBlock = secondLastBlock;
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
