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
 */

'use strict';

const find = require('find');
const setup = require('./setup');
const Network = require('./network');

const TOTAL_PEERS = Number.parseInt(process.env.TOTAL_PEERS) || 10;
// Full mesh network with 2 connection for bi-directional communication
const EXPECTED_TOTAL_CONNECTIONS = (TOTAL_PEERS - 1) * TOTAL_PEERS * 2;
// 2 connections (1 bidirectional) are established for each node in order to
// monitor and interact with them as part of the test.
const NUMBER_OF_MONITORING_CONNECTIONS = TOTAL_PEERS * 2;
const WSPORTS = [];
_.range(TOTAL_PEERS).map(index => {
	return WSPORTS.push(5000 + index);
});

describe(`Start a network of ${TOTAL_PEERS} nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases`, async () => {
	const configurations = setup.config.generateLiskConfigs(TOTAL_PEERS);
	const network = new Network(configurations);
	const suiteFolder = 'framework/test/network/scenarios/';
	const filepaths = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);

	before(() => {
		return network.launchNetwork({ enableForging: true });
	});

	afterEach(function(done) {
		if (this.currentTest.state === 'failed') {
			console.warn(`Test failed: ${this.currentTest.title}`);
			return done(this.currentTest.err);
		}
		return done();
	});

	after(() => {
		return network.killNetwork();
	});

	describe('launching Network test scenarios', async () => {
		filepaths.forEach(filepath => {
			const currentFilePath = filepath.replace('framework/test/network', '.');
			// eslint-disable-next-line import/no-dynamic-require
			const test = require(currentFilePath);
			test(
				configurations,
				network,
				WSPORTS,
				TOTAL_PEERS,
				EXPECTED_TOTAL_CONNECTIONS,
				NUMBER_OF_MONITORING_CONNECTIONS
			);
		});
	});
});

process.on('unhandledRejection', err => {
	throw err;
});
