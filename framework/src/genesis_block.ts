/*
 * Copyright © 2022 Lisk Foundation
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
	Block,
	BlockAssets,
	BlockHeader,
	EVENT_KEY_LENGTH,
	SMTStore,
	StateStore,
} from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import { Logger } from './logger';
import { computeValidatorsHash } from './node';
import { EventQueue, GenesisBlockContext, StateMachine } from './state_machine';

export interface GenesisBlockGenerateInput {
	height?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
	assets: {
		schema: Schema;
		moduleID: number;
		data: Record<string, unknown>;
	}[];
}

const GENESIS_BLOCK_VERSION = 0;
const EMPTY_BUFFER = Buffer.alloc(0);
const EMPTY_HASH = hash(EMPTY_BUFFER);

export const generateGenesisBlock = async (
	stateMachine: StateMachine,
	logger: Logger,
	input: GenesisBlockGenerateInput,
): Promise<Block> => {
	const assets = new BlockAssets(
		input.assets.map(asset => ({
			moduleID: asset.moduleID,
			data: codec.encode(asset.schema, asset.data),
		})),
	);
	assets.sort();
	const assetsRoot = await assets.getRoot();
	const height = input.height ?? 0;
	const previousBlockID = input.previousBlockID ?? Buffer.alloc(32, 0);
	const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
	const header = new BlockHeader({
		version: GENESIS_BLOCK_VERSION,
		previousBlockID,
		height,
		timestamp,
		generatorAddress: EMPTY_BUFFER,
		maxHeightGenerated: 0,
		maxHeightPrevoted: height,
		signature: EMPTY_BUFFER,
		transactionRoot: EMPTY_HASH,
		assetsRoot,
		aggregateCommit: {
			height: 0,
			aggregationBits: EMPTY_BUFFER,
			certificateSignature: EMPTY_BUFFER,
		},
	});

	const db = new InMemoryKVStore();
	const stateStore = new StateStore(db);

	const blockCtx = new GenesisBlockContext({
		eventQueue: new EventQueue(),
		header,
		assets,
		logger,
		stateStore,
	});

	await stateMachine.executeGenesisBlock(blockCtx);

	const smtStore = new SMTStore(new InMemoryKVStore());
	const smt = new SparseMerkleTree({ db: smtStore });
	stateStore.finalize(db.batch());

	header.stateRoot = smt.rootHash;

	const blockEvents = blockCtx.eventQueue.getEvents();
	const eventSmtStore = new SMTStore(new InMemoryKVStore());
	const eventSMT = new SparseMerkleTree({
		db: eventSmtStore,
		keyLength: EVENT_KEY_LENGTH,
	});
	for (const e of blockEvents) {
		const pairs = e.keyPair();
		for (const pair of pairs) {
			await eventSMT.update(pair.key, pair.value);
		}
	}
	header.eventRoot = eventSMT.rootHash;
	header.validatorsHash = computeValidatorsHash(
		blockCtx.nextValidators.validators,
		blockCtx.nextValidators.certificateThreshold,
	);

	return new Block(header, [], assets);
};
