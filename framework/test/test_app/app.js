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
const {
	Application,
	// eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('../../dist-node');

const {
	HTTPAPIPlugin,
} = require('../../../framework-plugins/lisk-framework-http-api-plugin/dist-node');

process.env.NODE_ENV = 'test';

let app;
const dummyLastCommitId = 'a4adbfb7651874c5746dbc389b281a111af79e96';
const dummyBuildVersion = '#buildVersion';

const appConfig = {
	version: '3.0.0',
	protocolVersion: '2.0',
	label: 'lisk-devnet',
	lastCommitId: dummyLastCommitId,
	buildVersion: dummyBuildVersion,
	ipc: {
		enabled: true,
	},
};

const network = process.env.LISK_NETWORK || 'devnet';

try {
	// eslint-disable-next-line import/no-dynamic-require,global-require
	const config = require(`../fixtures/config/${network}/config`);
	// eslint-disable-next-line import/no-dynamic-require,global-require
	const genesisBlock = require(`../fixtures/config/${network}/genesis_block`);

	const mergedConfig = {
		...appConfig,
		...config,
		ipc: {
			enabled: true,
		},
	};
	// To run multiple applications for same network for integration tests
	app = new Application(genesisBlock, mergedConfig);

	app.registerPlugin(HTTPAPIPlugin, { loadAsChildProcess: true });
} catch (e) {
	console.error('Application start error.', e);
	process.exit();
}

module.exports = app;
