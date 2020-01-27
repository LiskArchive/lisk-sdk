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
import { hash } from '@liskhq/lisk-cryptography';

import { DataAccess } from './data_access';
import {
	BlockHeader,
	BlockInstance,
	BlockRound,
	StorageTransaction,
} from './types';

export const loadBlocksFromLastBlockId = async (
	dataAccess: DataAccess,
	lastBlockId: string,
	limit: number,
) => {
	if (!lastBlockId) {
		throw new Error('lastBlockId needs to be specified');
	}
	if (!limit) {
		throw new Error('Limit needs to be specified');
	}

	// Get height of block with supplied ID
	const [lastBlock] = await dataAccess.getBlockHeadersByIDs([lastBlockId]);
	if (!lastBlock) {
		throw new Error(`Invalid lastBlockId requested: ${lastBlockId}`);
	}

	const lastBlockHeight = lastBlock.height;

	// Calculate max block height for database query
	const fetchUntilHeight = lastBlockHeight + limit;

	const blocks = await dataAccess.getBlocksByHeightBetween(
		lastBlockHeight + 1,
		fetchUntilHeight,
	);
	const sortedBlocks = blocks.sort((a: BlockInstance, b: BlockInstance) =>
		a.height > b.height ? 1 : -1,
	);

	return sortedBlocks;
};

export const getIdSequence = async (
	dataAccess: DataAccess,
	height: number,
	lastBlock: BlockHeader,
	genesisBlock: BlockHeader,
	numberOfDelegates: number,
) => {
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	const blockIds: BlockRound[] = await dataAccess.getFirstBlockIdWithInterval(
		height,
		numberOfDelegates,
	);
	if (blockIds.length === 0) {
		throw new Error(`Failed to get id sequence for height: ${height}`);
	}

	const ids: string[] = [];

	// Add genesis block at the end if the set doesn't contain it already
	if (genesisBlock) {
		const partialGenesis = {
			id: genesisBlock.id,
			height: genesisBlock.height,
		};

		if (!blockIds.map(r => r.id).includes(partialGenesis.id)) {
			blockIds.push(partialGenesis);
		}
	}

	// Add last block at the beginning if the set doesn't contain it already
	if (lastBlock && !blockIds.map(r => r.id).includes(lastBlock.id)) {
		blockIds.unshift({
			id: lastBlock.id,
			height: lastBlock.height,
		});
	}

	return {
		firstHeight: blockIds[0].height,
		ids: ids.join(),
	};
};

export const getId = (blockBytes: Buffer): string => {
	const hashedBlock = hash(blockBytes);
	// tslint:disable-next-line no-magic-numbers
	const temp = Buffer.alloc(8);
	// tslint:disable-next-line no-magic-numbers no-let
	for (let i = 0; i < 8; i += 1) {
		// tslint:disable-next-line no-magic-numbers
		temp[i] = hashedBlock[7 - i];
	}

	const id = temp.readBigUInt64BE().toString();

	return id;
};

export const setHeight = (
	block: BlockHeader,
	lastBlock: BlockHeader,
): BlockHeader => {
	block.height = lastBlock.height + 1;

	return block;
};

export const loadMemTables = async (
	dataAccess: DataAccess,
	tx: StorageTransaction,
): Promise<{
	readonly blocksCount: number;
	readonly genesisBlock: BlockHeader;
}> => {
	const promises = [
		dataAccess.getBlocksCount(),
		dataAccess.getBlockHeadersByHeightBetween(0, 1),
	];

	const [blocksCount, genesisBlock] = await tx.batch(promises);

	return {
		blocksCount,
		genesisBlock,
	};
};
