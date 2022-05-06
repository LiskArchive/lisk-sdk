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

import { Block, Chain, DataAccess, BlockHeader, Transaction, StateStore } from '@liskhq/lisk-chain';
import { getNetworkIdentifier, getKeys } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { BaseModule } from '../modules';
import { InMemoryChannel } from '../controller';
import { loggerMock, channelMock } from './mocks';
import { defaultConfig, getPassphraseFromDefaultConfig } from './fixtures';
import { createDB, removeDB } from './utils';
import { ApplicationConfig, GenesisConfig } from '../types';
import { Consensus } from '../node/consensus';
import { APIContext } from '../node/state_machine';
import { Node } from '../node';
import { createImmutableAPIContext, createNewAPIContext } from '../node/state_machine/api_context';
import { blockAssetsJSON } from './fixtures/genesis-asset';
import { ValidatorsAPI } from '../modules/validators';
import { BFTAPI } from '../modules/bft';
import { TokenModule } from '../modules/token';
import { AuthModule } from '../modules/auth';
import { FeeModule } from '../modules/fee';
import { RewardModule } from '../modules/reward';
import { RandomModule } from '../modules/random';
import { DPoSModule } from '../modules/dpos_v2';
import { Generator } from '../node/generator';

type Options = {
	genesis?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingParams {
	modules?: BaseModule[];
	options?: Options;
	initDelegates?: Buffer[];
}

export interface BlockProcessingEnv {
	createBlock: (transactions?: Transaction[], timestamp?: number) => Promise<Block>;
	getConsensus: () => Consensus;
	getGenerator: () => Generator;
	getGenesisBlock: () => Block;
	getChain: () => Chain;
	getAPIContext: () => APIContext;
	getValidatorAPI: () => ValidatorsAPI;
	getBFTAPI: () => BFTAPI;
	getBlockchainDB: () => KVStore;
	process: (block: Block) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
	getNextValidatorPassphrase: (blockHeader: BlockHeader) => Promise<string>;
	getDataAccess: () => DataAccess;
	getNetworkId: () => Buffer;
	invoke: <T = void>(path: string, params?: Record<string, unknown>) => Promise<T>;
	cleanup: (config: Options) => Promise<void>;
}

const getAppConfig = (genesisConfig?: GenesisConfig): ApplicationConfig => {
	const mergedConfig = objects.mergeDeep(
		{},
		{
			...defaultConfig,
			genesis: {
				...defaultConfig.genesis,
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
	transactions: Transaction[],
	timestamp?: number,
): Promise<Block> => {
	// Get previous block and generate valid timestamp, seed reveal, maxHeightPrevoted, reward and maxHeightPreviouslyForged
	const apiContext = createNewAPIContext(node['_blockchainDB']);
	const previousBlockHeader = node['_chain'].lastBlock.header;
	const nextTimestamp =
		timestamp ?? (await getNextTimestamp(node, apiContext, previousBlockHeader));
	const validator = await node.validatorAPI.getGeneratorAtTimestamp(apiContext, nextTimestamp);
	const passphrase = getPassphraseFromDefaultConfig(validator);
	for (const tx of transactions) {
		await node['_generator']['_pool'].add(tx);
	}
	const { privateKey } = getKeys(passphrase);
	const block = await node.generateBlock({
		generatorAddress: validator,
		height: previousBlockHeader.height + 1,
		privateKey,
		timestamp: nextTimestamp,
		transactions,
	});

	return block;
};

export const getBlockProcessingEnv = async (
	params: BlockProcessingParams,
): Promise<BlockProcessingEnv> => {
	const appConfig = getAppConfig(params.options?.genesis);

	removeDB(params.options?.databasePath);
	const blockchainDB = createDB('blockchain', params.options?.databasePath);
	const forgerDB = createDB('forger', params.options?.databasePath);
	const node = new Node({
		options: appConfig,
	});
	const authModule = new AuthModule();
	const tokenModule = new TokenModule();
	const feeModule = new FeeModule();
	const rewardModule = new RewardModule();
	const randomModule = new RandomModule();
	const dposModule = new DPoSModule();

	// resolve dependencies
	feeModule.addDependencies(tokenModule.api);
	rewardModule.addDependencies(tokenModule.api, randomModule.api, node.bftAPI);
	dposModule.addDependencies(randomModule.api, node.bftAPI, node.validatorAPI, tokenModule.api);

	// register modules
	node.registerModule(authModule);
	node.registerModule(tokenModule);
	node.registerModule(feeModule);
	node.registerModule(rewardModule);
	node.registerModule(randomModule);
	node.registerModule(dposModule);
	const blockAssets = blockAssetsJSON.map(asset => ({
		...asset,
		data: codec.fromJSON<Record<string, unknown>>(asset.schema, asset.data),
	}));
	const genesisBlock = await node.generateGenesisBlock({
		timestamp: Math.floor(Date.now() / 1000) - 60 * 60,
		assets: blockAssets,
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
		appConfig.genesis.communityIdentifier,
	);

	return {
		createBlock: async (transactions: Transaction[] = [], timestamp?: number): Promise<Block> =>
			createProcessableBlock(node, transactions, timestamp),
		getGenesisBlock: () => genesisBlock,
		getChain: () => node['_chain'],
		getConsensus: () => node['_consensus'],
		getGenerator: () => node['_generator'],
		getValidatorAPI: () => node['_validatorsModule'].api,
		getBFTAPI: () => node['_bftModule'].api,
		getAPIContext: () => createNewAPIContext(node['_blockchainDB']),
		getBlockchainDB: () => blockchainDB,
		process: async (block): Promise<void> => node['_consensus']['_execute'](block, 'peer-id'),
		processUntilHeight: async (height): Promise<void> => {
			while (node['_chain'].lastBlock.header.height < height) {
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
		async invoke<T = void>(path: string, input: Record<string, unknown> = {}): Promise<T> {
			const [mod, method] = path.split('_');
			const endpoints = node.getModuleEndpoints();
			const endpoint = endpoints[mod];
			if (endpoint === undefined) {
				throw new Error(`Invalid endpoint ${mod} to invoke`);
			}
			const handler = endpoint[method];
			if (handler === undefined) {
				throw new Error(`Invalid endpoint ${method} is not registered for ${mod}`);
			}
			const stateStore = new StateStore(node['_blockchainDB']);
			const result = await handler({
				getStore: (moduleID: number, storePrefix: number) =>
					stateStore.getStore(moduleID, storePrefix),
				getImmutableAPIContext: () => createImmutableAPIContext(stateStore),
				logger: node['_logger'],
				networkIdentifier: node['_chain'].networkIdentifier,
				params: input,
			});
			return result as T;
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
