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

import { BFT } from '@liskhq/lisk-bft';
import { Block, Chain, DataAccess, GenesisBlock } from '@liskhq/lisk-chain';
import { getRandomBytes, getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { KVStore } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';

import { Processor } from '../node/processor';
import { InMemoryChannel } from '../controller';
import { loggerMock, channelMock } from './mocks';
import { createBlock } from './create_block';
import { defaultAccount, defaultConfig, createGenesisBlockWithAccounts } from './fixtures';
import { createDB, removeDB, getAccountSchemaFromModules } from './utils';
import { ApplicationConfig, GenesisConfig } from '../types';
import { ModuleClass } from './types';

type Options = {
	genesisConfig?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingParams {
	modules: ModuleClass[];
	options?: Options;
}

export interface BlockProcessingEnv {
	process: (block: Block) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
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

const getProcessor = (
	db: KVStore,
	appConfig: ApplicationConfig,
	genesisBlock: GenesisBlock,
	networkIdentifier: Buffer,
	params: BlockProcessingParams,
): Processor => {
	const channel = (channelMock as unknown) as InMemoryChannel;

	const chainModule = new Chain({
		db,
		genesisBlock,
		networkIdentifier,
		maxPayloadLength: appConfig.genesisConfig.maxPayloadLength,
		rewardDistance: appConfig.genesisConfig.rewards.distance,
		rewardOffset: appConfig.genesisConfig.rewards.offset,
		rewardMilestones: appConfig.genesisConfig.rewards.milestones.map(s => BigInt(s)),
		blockTime: appConfig.genesisConfig.blockTime,
		minFeePerByte: appConfig.genesisConfig.minFeePerByte,
		baseFees: appConfig.genesisConfig.baseFees,
		accountSchemas: getAccountSchemaFromModules(params.modules),
	});

	const bftModule = new BFT({
		chain: chainModule,
		threshold: appConfig.genesisConfig.bftThreshold,
		genesisHeight: genesisBlock.header.height,
	});

	const processor = new Processor({
		channel,
		logger: loggerMock,
		chainModule,
		bftModule,
	});

	return processor;
};

export const getBlockProcessingEnv = async (
	params: BlockProcessingParams,
): Promise<BlockProcessingEnv> => {
	const appConfig = getAppConfig(params.options?.genesisConfig);
	const { genesisBlock } = createGenesisBlockWithAccounts(params.modules);
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.header.id,
		appConfig.genesisConfig.communityIdentifier,
	);
	const db = createDB('blockchain', params.options?.databasePath);
	const processor = getProcessor(db, appConfig, genesisBlock, networkIdentifier, params);
	await processor.init(genesisBlock);

	return {
		process: async (block): Promise<void> => processor.process(block),
		processUntilHeight: async (height): Promise<void> => {
			for (let index = 0; index < height; index += 1) {
				// Get previous block before creating and processing new block
				const { height: lastBlockHeight, id, timestamp } = processor['_chain'].lastBlock.header;

				const nextBlock = createBlock({
					passphrase: defaultAccount.passphrase,
					networkIdentifier,
					timestamp: timestamp + 10,
					previousBlockID: id,
					header: {
						height: lastBlockHeight + 1,
						asset: {
							maxHeightPreviouslyForged: lastBlockHeight + 1,
							maxHeightPrevoted: 0,
							seedReveal: getRandomBytes(16),
						},
					},
					payload: [],
				});
				await processor.process(nextBlock);
			}
		},
		getLastBlock: () => processor['_chain'].lastBlock,
		getNetworkId: () => networkIdentifier,
		getDataAccess: () => processor['_chain'].dataAccess,
		cleanup: async ({ databasePath }): Promise<void> => {
			await processor.stop();
			await db.close();
			removeDB(databasePath);
		},
	};
};
