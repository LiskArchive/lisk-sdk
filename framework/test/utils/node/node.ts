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

import { KVStore } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';
import { nodeConfig } from '../configs';
import { createMockChannel, createMockBus } from '../channel';
import { Node, NodeOptions } from '../../../src/node/node';
import * as config from '../../fixtures/config/devnet/config.json';
import * as genesisBlockJSON from '../../fixtures/config/devnet/genesis_block.json';
import { Logger } from '../../../src/logger';
import { InMemoryChannel } from '../../../src/controller/channels';
import { ApplicationConfig } from '../../../src/types';
import { TokenModule, SequenceModule, KeysModule, DPoSModule } from '../../../src/modules';

const { plugins, ...rootConfigs } = config;

export const createNode = ({ options = {} }: { options?: Partial<NodeOptions> }): Node => {
	const mergedConfig = objects.mergeDeep({}, nodeConfig(), rootConfigs, options, {
		network: { maxInboundConnections: 0 },
	}) as ApplicationConfig;
	const node = new Node({
		options: mergedConfig,
		genesisBlockJSON,
	});
	node.registerModule(new TokenModule(mergedConfig.genesisConfig));
	node.registerModule(new SequenceModule(mergedConfig.genesisConfig));
	node.registerModule(new KeysModule(mergedConfig.genesisConfig));
	node.registerModule(new DPoSModule(mergedConfig.genesisConfig));

	return node;
};

/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types */
export const fakeLogger = {
	trace: () => {},
	debug: () => {},
	info: () => {},
	error: () => {},
	warn: () => {},
	fatal: () => {},
};
/* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types */

export const createAndLoadNode = async (
	blockchainDB: KVStore,
	forgerDB: KVStore,
	logger: Logger = fakeLogger as Logger,
	channel?: InMemoryChannel,
	options?: NodeOptions,
): Promise<Node> => {
	const chainModule = createNode({
		options,
	});
	const nodeDB = ({
		get: jest.fn(),
		put: jest.fn(),
	} as unknown) as KVStore;
	await chainModule.init({
		bus: createMockBus() as any,
		channel: channel ?? (createMockChannel() as any),
		logger,
		blockchainDB,
		forgerDB,
		nodeDB,
	});
	return chainModule;
};
