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
import { constantsConfig, nodeConfig } from '../configs';
import { registeredTransactions } from '../registered_transactions';
import { createMockChannel } from '../channel';
import { Node, Options } from '../../../src/application/node/node';
import { genesisBlock } from '../../fixtures/blocks';
import * as config from '../../fixtures/config/devnet/config.json';
import { Logger } from '../../../src/application/logger';
import { InMemoryChannel } from '../../../src/controller/channels';
import { mergeDeep } from '../../../src/application/utils/merge_deep';
import { ApplicationConfig } from '../../../src/types';

const { modules, ...rootConfigs } = config;
const { network, ...nodeConfigs } = rootConfigs;

interface CreateNodeInput {
	blockchainDB: KVStore;
	forgerDB: KVStore;
	logger: Logger;
	channel?: InMemoryChannel;
	options?: Partial<Options>;
}

export const createNode = ({
	blockchainDB,
	forgerDB,
	logger,
	channel,
	options = {},
}: CreateNodeInput): Node => {
	const mergedConfig = mergeDeep(
		{},
		nodeConfig(),
		nodeConfigs,
	) as ApplicationConfig;
	const convertedDelegates = mergedConfig.forging.delegates.map(delegate => ({
		...delegate,
		publicKey: Buffer.from(delegate.publicKey, 'base64'),
		hashOnion: {
			...delegate.hashOnion,
			hashes: delegate.hashOnion.hashes.map(h => Buffer.from(h, 'base64')),
		},
	}));
	const nodeOptions = {
		...mergedConfig,
		forging: {
			...mergedConfig.forging,
			delegates: convertedDelegates,
		},
		...options,
		// TODO: Replace this attribute with configuration
		// 	https://github.com/LiskHQ/lisk-sdk/issues/5447
		communityIdentifier: 'Lisk',
		constants: constantsConfig(),
		genesisBlock: genesisBlock(),
		registeredTransactions: { ...registeredTransactions },
	};
	return new Node({
		channel: channel ?? (createMockChannel() as any),
		options: nodeOptions,
		logger,
		blockchainDB,
		forgerDB,
		applicationState: null as any,
	});
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
	options?: Options,
): Promise<Node> => {
	const chainModule = createNode({
		blockchainDB,
		forgerDB,
		logger,
		channel,
		options,
	});
	await chainModule.bootstrap();
	return chainModule;
};
