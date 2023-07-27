/*
 * Copyright © 2018 Lisk Foundation
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

import { Database } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';
import { nodeConfig } from '../configs';
import { createMockChannel, createMockBus } from '../channel';
import { Node, NodeOptions } from '../../../src/node/node';
import * as config from '../../fixtures/config/devnet/config.json';
import * as genesisBlockJSON from '../../fixtures/config/devnet/genesis_block.json';
import { Logger, createLogger } from '../../../src/logger';
import { InMemoryChannel } from '../../../src/controller/channels';
import { ApplicationConfig } from '../../../src/types';
import { TokenModule, SequenceModule, KeysModule, DPoSModule } from '../../../src/modules';
import { defaultPath } from '../kv_store';

const { plugins, ...rootConfigs } = config;

export const createNode = ({ options = {} }: { options?: Partial<NodeOptions> }): Node => {
	const mergedConfig = objects.mergeDeep({}, nodeConfig(), rootConfigs, options, {
		network: { maxInboundConnections: 0 },
	}) as ApplicationConfig;
	const node = new Node({
		options: mergedConfig,
	});
	node.registerModule(new TokenModule(mergedConfig.genesisConfig));
	node.registerModule(new SequenceModule(mergedConfig.genesisConfig));
	node.registerModule(new KeysModule(mergedConfig.genesisConfig));
	node.registerModule(new DPoSModule(mergedConfig.genesisConfig));

	return node;
};

/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types */
export const fakeLogger = createLogger({
	fileLogLevel: 'none',
	consoleLogLevel: 'none',
	logFilePath: 'test.log',
	module: 'test',
});
/* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types */

export const createAndLoadNode = async (
	blockchainDB: Database,
	forgerDB: Database,
	logger: Logger = fakeLogger,
	channel?: InMemoryChannel,
	options?: NodeOptions,
): Promise<Node> => {
	const chainModule = createNode({
		options,
	});
	const nodeDB = ({
		get: jest.fn(),
		set: jest.fn(),
	} as unknown) as Database;
	await chainModule.init({
		genesisBlockJSON,
		dataPath: defaultPath,
		bus: createMockBus() as any,
		channel: channel ?? (createMockChannel() as any),
		logger,
		blockchainDB,
		forgerDB,
		nodeDB,
	});
	return chainModule;
};
