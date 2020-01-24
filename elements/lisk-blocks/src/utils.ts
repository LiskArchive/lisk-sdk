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

import { Storage as StorageAccess } from './data_access';
import { BlockHeader, BlockJSON, Storage, StorageTransaction } from './types';

export const loadBlocksFromLastBlockId = async (
	storageAccess: StorageAccess,
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
	const [lastBlock] = await storageAccess.getBlockHeadersByIDs([lastBlockId]);
	if (!lastBlock) {
		throw new Error(`Invalid lastBlockId requested: ${lastBlockId}`);
	}

	const lastBlockHeight = lastBlock.height;

	// Calculate max block height for database query
	const fetchUntilHeight = lastBlockHeight + limit;

	const blocks = await storageAccess.getExtendedBlocksByHeightBetween(
		lastBlockHeight + 1,
		fetchUntilHeight,
	);
	const sortedBlocks = blocks.sort((a: BlockJSON, b: BlockJSON) =>
		a.height > b.height ? 1 : -1,
	);

	return sortedBlocks;
};

export const getIdSequence = async (
	storage: Storage,
	height: number,
	lastBlock: BlockHeader,
	genesisBlock: BlockHeader,
	numberOfDelegates: number,
) => {
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	const rows: Array<Partial<
		BlockJSON
	>> = await storage.entities.Block.getFirstBlockIdOfLastRounds({
		height,
		numberOfRounds: 5,
		numberOfDelegates,
	});
	if (rows.length === 0) {
		throw new Error(`Failed to get id sequence for height: ${height}`);
	}

	const ids: string[] = [];

	// Add genesis block at the end if the set doesn't contain it already
	if (genesisBlock) {
		const partialGenesis = {
			id: genesisBlock.id,
			height: genesisBlock.height,
		};

		if (!rows.map(r => r.id).includes(partialGenesis.id)) {
			rows.push(partialGenesis);
		}
	}

	// Add last block at the beginning if the set doesn't contain it already
	if (lastBlock && !rows.map(r => r.id).includes(lastBlock.id)) {
		rows.unshift({
			id: lastBlock.id,
			height: lastBlock.height,
		});
	}

	// Extract blocks IDs
	rows.forEach(row => {
		// FIXME: Looks like double check
		if (!ids.includes(row.id as string)) {
			ids.push(row.id as string);
		}
	});

	return {
		firstHeight: rows[0].height,
		ids: ids.join(),
	};
};

export const addBlockProperties = (block: BlockJSON) => {
	block.totalAmount = BigInt(block.totalAmount || 0);
	block.totalFee = BigInt(block.totalFee || 0);
	block.reward = BigInt(block.reward || 0);

	if (block.version === undefined) {
		block.version = 0;
	}
	if (block.numberOfTransactions === undefined) {
		block.numberOfTransactions =
			block.transactions === undefined ? 0 : block.transactions.length;
	}
	if (block.payloadLength === undefined) {
		block.payloadLength = 0;
	}
	if (block.transactions === undefined) {
		block.transactions = [];
	}

	return block;
};

export const deleteBlockProperties = (block: BlockHeader) => {
	const reducedBlock = {
		...block,
	};
	/* tslint:disable:no-delete */
	if (reducedBlock.version === 0) {
		delete reducedBlock.version;
	}
	// VerifyBlock ensures numberOfTransactions is transactions.length
	if (typeof reducedBlock.numberOfTransactions === 'number') {
		delete reducedBlock.numberOfTransactions;
	}
	if (reducedBlock.totalAmount === BigInt(0)) {
		delete reducedBlock.totalAmount;
	}
	if (reducedBlock.totalFee === BigInt(0)) {
		delete reducedBlock.totalFee;
	}
	if (reducedBlock.payloadLength === 0) {
		delete reducedBlock.payloadLength;
	}
	if (reducedBlock.reward === BigInt(0)) {
		delete reducedBlock.reward;
	}
	if (reducedBlock.transactions && reducedBlock.transactions.length === 0) {
		delete reducedBlock.transactions;
	}
	/* tslint:enable:no-delete */

	return reducedBlock;
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
	storageAccess: StorageAccess,
	tx: StorageTransaction,
): Promise<{
	readonly blocksCount: number;
	readonly genesisBlock: BlockJSON;
}> => {
	const promises = [
		storageAccess.getBlockCount(),
		storageAccess.getBlockHeadersByHeightBetween(0, 1),
	];

	const [blocksCount, genesisBlock] = await tx.batch(promises);

	return {
		blocksCount,
		genesisBlock,
	};
};
