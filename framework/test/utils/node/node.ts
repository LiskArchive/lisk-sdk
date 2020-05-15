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
import * as genesisBlock from '../../fixtures/config/devnet/genesis_block.json';
import * as config from '../../fixtures/config/devnet/config.json';
import { Logger } from '../../../src/application/logger';
import { InMemoryChannel } from '../../../src/controller/channels';

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
	const nodeOptions = {
		...nodeConfig(),
		...nodeConfigs,
		...options,
		constants: constantsConfig(),
		genesisBlock,
		registeredTransactions: { ...registeredTransactions },
	};
	return new Node({
		channel: channel ?? (createMockChannel() as any),
		options: nodeOptions as Options,
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
