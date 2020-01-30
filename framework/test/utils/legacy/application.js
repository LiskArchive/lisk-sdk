/*
 * Copyright © 2019 Lisk Foundation
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
 */

'use strict';

// Global imports
const { StorageSandbox } = require('../storage/storage_sandbox');
const { createNode } = require('../node');
const { storageConfig: defaultStorageConfig } = require('../configs');
const {
	app: { node: nodeNetworkConfig },
} = require('../../fixtures/config/devnet/config');

const channelStub = {
	invoke: sinonSandbox.stub(),
	publish: sinonSandbox.stub(),
	subscribe: sinonSandbox.stub(),
	once: sinonSandbox.stub().callsArg(1),
};

const loggerStub = {
	trace: sinonSandbox.spy(),
	debug: sinonSandbox.spy(),
	info: sinonSandbox.spy(),
	log: sinonSandbox.spy(),
	warn: sinonSandbox.spy(),
	error: sinonSandbox.spy(),
	fatal: sinonSandbox.spy(),
};

const initNode = async (options, storageConfig) => {
	const storage = new StorageSandbox(
		{
			...defaultStorageConfig(),
			...storageConfig,
		},
		storageConfig.database,
	);

	await storage.bootstrap();

	storage.entities.Account.extendDefaultOptions({
		limit: __testContext.config.constants.ACTIVE_DELEGATES,
	});

	const nodeOptions = {
		...options,
		exceptions: __testContext.config.app.node.exceptions,
		// To register both v1 and v2 processors in Node
		...{
			exceptions: {
				blockVersions: { 1: {}, 2: {} },
			},
		},
		...nodeNetworkConfig,
	};

	const node = createNode({
		storage,
		options: nodeOptions,
		channel: channelStub,
		logger: loggerStub,
	});

	await node.bootstrap();

	// Override matchers to mimic legacy processor setup
	node.processor.matchers = {
		1: () => true,
		2: ({ height }) => height === 1,
	};

	return node;
};

module.exports = {
	initNode,
};
