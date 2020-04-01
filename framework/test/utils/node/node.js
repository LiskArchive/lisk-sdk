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

const { constantsConfig, nodeConfig } = require('../configs');
const {
	registeredTransactions,
} = require('../../utils/registered_transactions');
const { createMockChannel } = require('../channel');
const { Node } = require('../../../src/application/node');
const genesisBlock = require('../../fixtures/config/devnet/genesis_block');
const config = require('../../fixtures/config/devnet/config');

const createNode = ({ storage, logger, channel, options = {} }) => {
	const nodeOptions = {
		...nodeConfig(),
		...config,
		...options,
		constants: constantsConfig(),
		genesisBlock,
		registeredTransactions: { ...registeredTransactions },
	};
	return new Node({
		channel: channel || createMockChannel(),
		options: nodeOptions,
		logger,
		storage,
		applicationState: null,
	});
};

const fakeLogger = {
	trace: () => {},
	debug: () => {},
	info: () => {},
	error: () => {},
	warn: () => {},
	fatal: () => {},
};

const createAndLoadNode = async (
	storage,
	logger = fakeLogger,
	channel = undefined,
	options = {},
) => {
	const chainModule = createNode({ storage, logger, channel, options });
	await chainModule.bootstrap();
	return chainModule;
};

module.exports = {
	createNode,
	createAndLoadNode,
	fakeLogger,
};
