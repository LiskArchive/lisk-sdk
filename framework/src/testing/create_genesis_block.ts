/*
 * Copyright © 2021 Lisk Foundation
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
 *
 */

import {
	Block,
	BlockHeader,
	BlockHeaderAsset,
	BlockHeaderJSON,
	TransactionJSON,
} from '@liskhq/lisk-chain';
import { hash } from '@liskhq/lisk-cryptography';
import { GenesisConfig } from '../types';

interface CreateGenesisBlock {
	genesisConfig?: GenesisConfig;
	initDelegates?: ReadonlyArray<Buffer>;
	height?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
	assets?: BlockHeaderAsset[];
}

export const createGenesisBlock = (
	params: CreateGenesisBlock,
): {
	genesisBlock: Block;
	genesisBlockJSON: { header: BlockHeaderJSON; payload: TransactionJSON[] };
} => {
	const height = params.height ?? 0;
	// Set genesis block timestamp to 1 day in past relative to current date
	const today = new Date();
	const yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24);
	const defaultTimestamp = Math.floor(yesterday.getTime() / 1000);
	const timestamp = params.timestamp ?? defaultTimestamp;
	const previousBlockID = params.previousBlockID ?? Buffer.alloc(0);

	const header = new BlockHeader({
		previousBlockID,
		generatorAddress: Buffer.alloc(0),
		height,
		timestamp,
		version: 0,
		transactionRoot: hash(Buffer.alloc(0)),
		stateRoot: hash(Buffer.alloc(0)),
		signature: Buffer.alloc(0),
		assets: params.assets ?? [],
	});

	const genesisBlock = new Block(header, []);

	return {
		genesisBlock,
		genesisBlockJSON: {
			header: header.toJSON(),
			payload: [],
		},
	};
};
