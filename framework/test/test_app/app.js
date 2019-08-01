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

const path = require('path');
const {
	Application,
	configurator,
	/* eslint-disable import/no-unresolved */
} = require('../../src');

process.env.NODE_ENV = 'test';

let app;
const dummyLastCommitId = 'a4adbfb7651874c5746dbc389b281a111af79e96';
const dummyBuildVersion = '#buildVersion';

const appConfig = {
	app: {
		version: '2.0.0',
		minVersion: '1.0.0',
		protocolVersion: '1.1',
		lastCommitId: dummyLastCommitId,
		buildVersion: dummyBuildVersion,
	},
};

// Support for PROTOCOL_VERSION only for tests
if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
	appConfig.app.protocolVersion = process.env.PROTOCOL_VERSION;
}

const network = process.env.LISK_NETWORK || 'devnet';

try {
	// TODO: I would convert config.json to .JS
	configurator.loadConfig(appConfig);
	configurator.loadConfigFile(
		path.resolve(__dirname, `../fixtures/config/${network}/config`),
	);
	// eslint-disable-next-line import/no-dynamic-require
	const genesisBlock = require(`../fixtures/config/${network}/genesis_block`);

	if (process.env.CUSTOM_CONFIG_FILE) {
		configurator.loadConfigFile(path.resolve(process.env.CUSTOM_CONFIG_FILE));
	}

	const config = configurator.getConfig({}, { failOnInvalidArg: false });

	// Support for PROTOCOL_VERSION only for tests
	if (process.env.NODE_ENV === 'test' && process.env.PROTOCOL_VERSION) {
		config.app.protocolVersion = process.env.PROTOCOL_VERSION;
	}

	// To run multiple applications for same network for integration tests
	config.app.label = `lisk-devnet-${config.modules.http_api.httpPort}`;

	app = new Application(genesisBlock, config);
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}

module.exports = app;
