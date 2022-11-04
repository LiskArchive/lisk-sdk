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
import * as os from 'os';
import * as path from 'path';
import { Block, BlockAssets, BlockHeader, EVENT_KEY_LENGTH, SMTStore } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, StateDB } from '@liskhq/lisk-db';
import { SparseMerkleTree } from '@liskhq/lisk-tree';
import { Logger } from './logger';
import { computeValidatorsHash } from './engine';
import { EventQueue, GenesisBlockContext, StateMachine } from './state_machine';
import { PrefixedStateReadWriter } from './state_machine/prefixed_state_read_writer';

export interface GenesisBlockGenerateInput {
	chainID: Buffer;
	height?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
	assets: {
		schema: Schema;
		module: string;
		data: Record<string, unknown>;
	}[];
}

const GENESIS_BLOCK_VERSION = 0;
const EMPTY_BUFFER = Buffer.alloc(0);
const EMPTY_HASH = utils.hash(EMPTY_BUFFER);

export const generateGenesisBlock = async (
	stateMachine: StateMachine,
	logger: Logger,
	input: GenesisBlockGenerateInput,
): Promise<Block> => {
	const assets = new BlockAssets(
		input.assets.map(asset => ({
			module: asset.module,
			data: codec.encode(asset.schema, asset.data),
		})),
	);
	assets.sort();
	const assetRoot = await assets.getRoot();
	const height = input.height ?? 0;
	const previousBlockID = input.previousBlockID ?? Buffer.alloc(32, 0);
	const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
	const header = new BlockHeader({
		version: GENESIS_BLOCK_VERSION,
		previousBlockID,
		height,
		timestamp,
		generatorAddress: Buffer.alloc(20, 0),
		maxHeightGenerated: 0,
		maxHeightPrevoted: height,
		signature: EMPTY_BUFFER,
		transactionRoot: EMPTY_HASH,
		impliesMaxPrevotes: true,
		assetRoot,
		aggregateCommit: {
			height: 0,
			aggregationBits: EMPTY_BUFFER,
			certificateSignature: EMPTY_BUFFER,
		},
	});

	const tempPath = path.join(
		os.tmpdir(),
		utils.getRandomBytes(3).toString('hex'),
		Date.now().toString(),
	);
	const stateDB = new StateDB(tempPath);
	const stateStore = new PrefixedStateReadWriter(stateDB.newReadWriter());

	const blockCtx = new GenesisBlockContext({
		eventQueue: new EventQueue(height),
		header,
		assets,
		logger,
		stateStore,
		chainID: input.chainID,
	});

	await stateMachine.executeGenesisBlock(blockCtx);

	const stateRoot = await stateDB.commit(stateStore.inner, height, EMPTY_HASH, {
		checkRoot: false,
		readonly: true,
	});

	header.stateRoot = stateRoot;

	const blockEvents = blockCtx.eventQueue.getEvents();
	const eventSmtStore = new SMTStore(new InMemoryDatabase());
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
