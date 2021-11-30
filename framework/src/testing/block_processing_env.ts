/* eslint-disable dot-notation */
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

import { Block, Chain, DataAccess, BlockHeader, Transaction } from '@liskhq/lisk-chain';
import { getNetworkIdentifier, getKeys } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';

import { BaseModule } from '../modules';
import { InMemoryChannel } from '../controller';
import { loggerMock, channelMock } from './mocks';
import { defaultConfig, getPassphraseFromDefaultConfig } from './fixtures';
import { createDB, removeDB } from './utils';
import { ApplicationConfig, GenesisConfig } from '../types';
import { Consensus } from '../node/consensus';
import { APIContext } from '../node/state_machine';
import { Node } from '../node';
import { createNewAPIContext } from '../node/state_machine/api_context';

type Options = {
	genesisConfig?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingParams {
	modules?: BaseModule[];
	options?: Options;
	initDelegates?: Buffer[];
}

export interface BlockProcessingEnv {
	createBlock: (payload?: Transaction[], timestamp?: number) => Promise<Block>;
	getConsensus: () => Consensus;
	getChain: () => Chain;
	getBlockchainDB: () => KVStore;
	process: (block: Block) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
	getNextValidatorPassphrase: (blockHeader: BlockHeader) => Promise<string>;
	getDataAccess: () => DataAccess;
	getNetworkId: () => Buffer;
	cleanup: (config: Options) => Promise<void>;
}

const getAppConfig = (genesisConfig?: GenesisConfig): ApplicationConfig => {
	const mergedConfig = objects.mergeDeep(
		{},
		{
			...defaultConfig,
			genesisConfig: {
				...defaultConfig.genesisConfig,
				...(genesisConfig ?? {}),
			},
		},
	) as ApplicationConfig;

	return mergedConfig;
};

const getNextTimestamp = async (node: Node, apiContext: APIContext, previousBlock: BlockHeader) => {
	const previousSlotNumber = await node.validatorAPI.getSlotNumber(
		apiContext,
		previousBlock.timestamp,
	);
	return node.validatorAPI.getSlotTime(apiContext, previousSlotNumber + 1);
};

const createProcessableBlock = async (
	node: Node,
	payload: Transaction[],
	timestamp?: number,
): Promise<Block> => {
	// Get previous block and generate valid timestamp, seed reveal, maxHeightPrevoted, reward and maxHeightPreviouslyForged
	const apiContext = createNewAPIContext(node['_blockchainDB']);
	const previousBlockHeader = node['_chain'].lastBlock.header;
	const nextTimestamp =
		timestamp ?? (await getNextTimestamp(node, apiContext, previousBlockHeader));
	const validator = await node.validatorAPI.getGeneratorAtTimestamp(apiContext, nextTimestamp);
	const passphrase = getPassphraseFromDefaultConfig(validator);
	for (const tx of payload) {
		await node['_generator']['_pool'].add(tx);
	}
	const { privateKey } = getKeys(passphrase);
	const block = await node.generateBlock({
		generatorAddress: validator,
		height: previousBlockHeader.height + 1,
		privateKey,
		timestamp: nextTimestamp,
	});

	return block;
};

export const getBlockProcessingEnv = async (
	params: BlockProcessingParams,
): Promise<BlockProcessingEnv> => {
	const appConfig = getAppConfig(params.options?.genesisConfig);

	removeDB(params.options?.databasePath);
	const blockchainDB = createDB('blockchain', params.options?.databasePath);
	const forgerDB = createDB('forger', params.options?.databasePath);
	const node = new Node({
		options: appConfig,
	});
	const genesisBlock = await node.generateGenesisBlock({
		assets: [],
	});
	await node.init({
		blockchainDB,
		channel: channelMock as InMemoryChannel,
		forgerDB,
		genesisBlock,
		logger: loggerMock,
		nodeDB: (new InMemoryKVStore() as unknown) as KVStore,
	});

	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.header.id,
		appConfig.genesisConfig.communityIdentifier,
	);

	return {
		createBlock: async (payload: Transaction[] = [], timestamp?: number): Promise<Block> =>
			createProcessableBlock(node, payload, timestamp),
		getChain: () => node['_chain'],
		getConsensus: () => node['_consensus'],
		getBlockchainDB: () => blockchainDB,
		process: async (block): Promise<void> => node['_consensus'].execute(block),
		processUntilHeight: async (height): Promise<void> => {
			for (let index = 0; index < height; index += 1) {
				const nextBlock = await createProcessableBlock(node, []);
				await node['_consensus'].execute(nextBlock);
			}
		},
		getLastBlock: () => node['_chain'].lastBlock,
		getNextValidatorPassphrase: async (previousBlockHeader: BlockHeader): Promise<string> => {
			const apiContext = createNewAPIContext(blockchainDB);
			const nextTimestamp = await getNextTimestamp(node, apiContext, previousBlockHeader);
			const validator = await node.validatorAPI.getGeneratorAtTimestamp(apiContext, nextTimestamp);
			const passphrase = getPassphraseFromDefaultConfig(validator);

			return passphrase;
		},
		getNetworkId: () => networkIdentifier,
		getDataAccess: () => node['_chain'].dataAccess,
		cleanup: async ({ databasePath }): Promise<void> => {
			await node.stop();
			await blockchainDB.close();
			removeDB(databasePath);
		},
	};
};
