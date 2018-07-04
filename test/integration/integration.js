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

var utils = require('./utils');
var setup = require('./setup');
var scenarios = require('./scenarios');

describe('given configurations for 10 nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases', () => {
	var totalPeers = Number.parseInt(process.env.TOTAL_PEERS) || 10;
	// Each peer connected to 9 other pairs and have 2 connection for bi-directional communication
	var expectedOutgoingConnections = (totalPeers - 1) * totalPeers * 2;
	var broadcasting = process.env.BROADCASTING !== 'false';
	var syncing = process.env.SYNCING !== 'false';

	var wsPorts = [];
	_.range(totalPeers).map(index => {
		wsPorts.push(5000 + index);
	});
	var configurations = setup.config.generateLiskConfigs(
		broadcasting,
		syncing,
		totalPeers
	);
	var testFailedError;

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

	it(`there should exactly ${totalPeers} listening connections for 500[0-9] ports`, done => {
		utils.getListeningConnections(wsPorts, (err, numOfConnections) => {
			if (err) {
				return done(err);
			}

			if (numOfConnections === totalPeers) {
				done();
			} else {
				done(
					`There are ${numOfConnections} listening connections on web socket ports.`
				);
			}
		});
	});

	it(`there should maximum ${expectedOutgoingConnections} established connections from 500[0-9] ports`, done => {
		utils.getEstablishedConnections(wsPorts, (err, numOfConnections) => {
			if (err) {
				return done(err);
			}

			// It should be less than 180, as nodes are just started and establishing the connections
			if (numOfConnections <= expectedOutgoingConnections) {
				done();
			} else {
				done(
					`There are ${numOfConnections} established connections on web socket ports.`
				);
			}
		});
	});

	describe('when WS connections to all nodes all established', () => {
		var params = {};

		before(done => {
			utils.ws.establishWSConnectionsToNodes(
				configurations,
				(err, socketsResult) => {
					if (err) {
						return done(err);
					}
					params.sockets = socketsResult;
					params.configurations = configurations;
					done();
				}
			);
		});

		describe('when functional tests are successfully executed against 127.0.0.1:5000', () => {
			scenarios.propagation.blocks(params);
			scenarios.propagation.transactions(params);

			if (broadcasting) {
				// This test uses broadcasting mechanism to test signatures don't run this test when broadcasting is disabled
				scenarios.propagation.multisignature(params);
				scenarios.network.peers(params);
				scenarios.network.peersBlackList(params);
				scenarios.network.peerDisconnect(params);
			}

			// @slow tests
			scenarios.stress.transfer_with_data(params);
			scenarios.stress.second_passphrase(params);
			scenarios.stress.register_delegate(params);
			scenarios.stress.cast_vote(params);
			scenarios.stress.register_multisignature(params);
			scenarios.stress.register_dapp(params);
			// @slow
		});
	});
});
