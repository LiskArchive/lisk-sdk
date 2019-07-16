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

'use strict';

const { genesisConfig, storageConfig, cacheConfig } = require('../configs');
const { defaultTransactions } = require('../default_transactions');
const ChainModule = require('../../../../../src/modules/chain');
const genesisBlock = require('../../../../fixtures/config/devnet/genesis_block');

const createDefaultChainModule = async databaseName => {
	const channel = {
		publish: jest.fn(),
		once: jest.fn(),
		invoke: jest.fn((action, arg) => {
			if (action === 'app:getComponentConfig') {
				if (arg === 'storage') {
					return storageConfig(databaseName);
				}
				if (arg === 'cache') {
					return cacheConfig();
				}
			}
			return {};
		}),
		subscribe: jest.fn((event, listener) => {
			listener({});
		}),
	};

	const options = {
		...ChainModule.defaults.default,
		constants: genesisConfig(),
		genesisBlock,
		registeredTransactions: defaultTransactions(),
	};
	const chainModule = new ChainModule(options);

	await chainModule.load(channel);

	return chainModule;
};

module.exports = {
	createDefaultChainModule,
};
