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
const utils = require('./utils');
const setup = require('./setup');

const TOTAL_PEERS = Number.parseInt(process.env.TOTAL_PEERS) || 10;
// Full mesh network with 2 connection for bi-directional communication
const EXPECTED_OUTOGING_CONNECTIONS = (TOTAL_PEERS - 1) * TOTAL_PEERS * 2;
const NUMBER_OF_TRANSACTIONS = process.env.NUMBER_OF_TRANSACTIONS || 1000;

describe(`Start a network of ${TOTAL_PEERS} nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases`, () => {
	const wsPorts = [];
	_.range(TOTAL_PEERS).map(index => {
		wsPorts.push(5000 + index);
	});
	const configurations = setup.config.generateLiskConfigs(TOTAL_PEERS);
	let testFailedError;

	before(done => {
		setup.createNetwork(configurations, done);
	});

	afterEach(function(done) {
		if (this.currentTest.state === 'failed') {
			console.warn(`Test failed: ${this.currentTest.title}`);
			testFailedError = this.currentTest.err;
		}
		done();
	});

	after(done => {
		setup.exit(() => {
			done(testFailedError);
		});
	});

	it(`there should be exactly ${TOTAL_PEERS} listening connections for 500[0-9] ports`, done => {
		utils.getListeningConnections(wsPorts, (err, numOfConnections) => {
			if (err) {
				return done(err);
			}

			if (numOfConnections === TOTAL_PEERS) {
				done();
			} else {
				done(
					`There are ${numOfConnections} listening connections on web socket ports.`
				);
			}
		});
	});

	it(`there should be a maximum ${EXPECTED_OUTOGING_CONNECTIONS} established connections from 500[0-9] ports`, done => {
		utils.getEstablishedConnections(wsPorts, (err, numOfConnections) => {
			if (err) {
				return done(err);
			}
			// It should be less than EXPECTED_OUTOGING_CONNECTIONS, as nodes are just started and establishing the connections
			if (numOfConnections <= EXPECTED_OUTOGING_CONNECTIONS) {
				done();
			} else {
				done(
					`There are ${numOfConnections} established connections on web socket ports.`
				);
			}
		});
	});

	describe('when WS connections to all nodes all established', () => {
		const suiteFolder = 'test/network/scenarios/';
		const filepaths = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);
		filepaths.forEach(filepath => {
			const currentFilePath = filepath.replace('test/network', '.');
			// eslint-disable-next-line import/no-dynamic-require
			const test = require(currentFilePath);
			test(
				configurations,
				TOTAL_PEERS,
				EXPECTED_OUTOGING_CONNECTIONS,
				NUMBER_OF_TRANSACTIONS
			);
		});
	});
});
