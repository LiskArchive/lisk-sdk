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

import { AccountDefaultProps, Block, GenesisBlock } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';

import { applicationConfigSchema } from '../schema/application_config_schema';
import { ApplicationConfig, GenesisConfig, StateStore } from '../types';
import { ModuleClass } from './types';
import { Node } from '../node/node';
import { loggerMock } from './mocks/logger_mock';
import { moduleBusMock, moduleChannelMock } from './mocks/channel_mock';
import { InMemoryChannel } from '../controller';
import { Bus } from '../controller/bus';
import { createBlock } from './create_block';
import { defaultGenesisConfig } from './fixtures';
import { createDB, removeDB, getModuleInstance } from './utils';
import { StateStoreMock } from './mocks/state_store_mock';

type config = {
	genesisConfig?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingEnv<T> {
	modules: ModuleClass[];
	genesisBlockJSON: GenesisBlock<T>;
	config?: config;
}

export interface BlockProcessingEnvResult {
	process: (block: Block, options?: Record<string, unknown>) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
	getStateStore: () => StateStore;
	getNetworkId: () => Buffer;
	cleanup: (config: config) => Promise<void>;
}

const getAppConfig = (configPropsToOverride: Partial<ApplicationConfig>): ApplicationConfig => {
	const mergedConfig = objects.mergeDeep(
		{},
		{
			...applicationConfigSchema.default,
			genesisConfig: {
				...applicationConfigSchema.default.genesisConfig,
				...configPropsToOverride.genesisConfig,
			},
			network: { maxInboundConnections: 0, seedPeers: [] },
		},
	) as ApplicationConfig;

	return mergedConfig;
};

const getNodeInstance = async <T>(params: BlockProcessingEnv<T>): Promise<Node> => {
	// Node configuration options
	const overrideConfig = { genesisConfig: params.config?.genesisConfig ?? {} } as Partial<
		ApplicationConfig
	>;
	const appConfig = getAppConfig(overrideConfig);
	const node = new Node({
		options: appConfig,
		genesisBlockJSON: (params.genesisBlockJSON as unknown) as Record<string, unknown>,
	});

	if (params.modules.length) {
		for (const moduleClass of params.modules) {
			const moduleInstance = getModuleInstance(moduleClass, params.config);
			node.registerModule(moduleInstance);
		}
	}

	// DB instances
	const blockchainDB = createDB('blockchain', params.config?.databasePath);
	const forgerDB = createDB('forger', params.config?.databasePath);
	const nodeDB = createDB('node', params.config?.databasePath);

	await node.init({
		bus: (moduleBusMock as unknown) as Bus,
		channel: (moduleChannelMock as unknown) as InMemoryChannel,
		logger: loggerMock,
		blockchainDB,
		forgerDB,
		nodeDB,
	});

	return node;
};

export const getBlockProcessingEnv = async <T = AccountDefaultProps>(
	params: BlockProcessingEnv<T>,
): Promise<BlockProcessingEnvResult> => {
	const node = await getNodeInstance<T>(params);

	return {
		process: async (block): Promise<void> => node['_processor'].process(block),
		processUntilHeight: async (height): Promise<void> => {
			const { networkIdentifier } = node;
			const passphrase = params.config?.passphrase ?? defaultGenesisConfig.passphrase;

			for (let index = 0; index < height; index += 1) {
				// Get previous block before creating and processing new block
				const { height: lastBlockHeight, id, timestamp } = node['_chain'].lastBlock.header;

				const nextBlock = createBlock({
					passphrase,
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
				await node['_processor'].process(nextBlock);
			}
		},
		getLastBlock: () => node['_chain'].lastBlock,
		getNetworkId: () => node.networkIdentifier,
		getStateStore: () => new StateStoreMock(),
		cleanup: async ({ databasePath }): Promise<void> => {
			await node.cleanup();
			await node['_forgerDB'].close();
			await node['_nodeDB'].close();
			await node['_blockchainDB'].close();
			removeDB(databasePath);
		},
	};
};
