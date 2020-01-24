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

const { constantsConfig } = require('../configs');
const {
	registeredTransactions,
} = require('../../utils/registered_transactions');
const { createMockChannel } = require('../channel');
const ChainModule = require('../../../src/controller/node');
const genesisBlock = require('../../fixtures/config/devnet/genesis_block');

const createChainModule = () => {
	const options = {
		...ChainModule.defaults.default,
		constants: constantsConfig(),
		genesisBlock,
		registeredTransactions: { ...registeredTransactions },
	};
	const chainModule = new ChainModule(options);

	return chainModule;
};

const createAndLoadChainModule = async databaseName => {
	const chainModule = createChainModule();
	await chainModule.load(createMockChannel(databaseName));
	return chainModule;
};

module.exports = {
	createChainModule,
	createAndLoadChainModule,
};
