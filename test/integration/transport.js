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

var devConfig = __testContext.config;
var wsPorts = [];
var broadcastingDisabled = process.env.BROADCASTING_DISABLED === 'true';
var syncingDisabled = process.env.SYNCING_DISABLED === 'true';
const totalPeers = Number.parseInt(process.env.TOTAL_PEERS) || 10;
// Each peer connected to 9 other pairs and have 2 connection for bi-directional communication
var expectedOutgoingConnections = (totalPeers - 1) * totalPeers * 2;

describe('given configurations for 10 nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases', () => {
	var configurations;

	before(done => {
		utils.http.setVersion('1.0.0');
		// When broadcasting disabled, start two node
		// one node to forge and one to sync for testing
		configurations = _.range(totalPeers).map(index => {
			var devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.wsPort = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			devConfigCopy.logFileName = `logs/lisk_node_${index}.log`;
			if (!devConfigCopy.broadcasts) {
				devConfigCopy.broadcasts = {};
			}
			devConfigCopy.broadcasts.active = !broadcastingDisabled;
			if (!devConfigCopy.syncing) {
				devConfigCopy.syncing = {};
			}
			if (syncingDisabled && !broadcastingDisabled) {
				// When all the nodes in network is broadcast enabled
				// and syncing disabled then all the nodes in the network
				// doesn't receive the block/transactions with 2 relays
				// So we need to increase the relay limit to ensure all
				// the peers in network receives block/transactions
				devConfigCopy.broadcasts.relayLimit = 4;
			}
			devConfigCopy.syncing.active = !syncingDisabled;
			wsPorts.push(devConfigCopy.wsPort);
			return devConfigCopy;
		});
		done();
	});

	describe('when every peers contains the others on the peers list', () => {
		before(() => {
			return configurations.forEach(configuration => {
				configuration.peers.list = setup.network.generatePeers(
					configurations,
					setup.network.SYNC_MODES.ALL_TO_GROUP,
					{ indices: _.range(10) },
					configuration.wsPort
				);
			});
		});

		describe('when every peer forges with separate subset of genesis delegates and forging.force = false', () => {
			var testFailedError;

			before(() => {
				var delegatesMaxLength = Math.ceil(
					devConfig.forging.delegates.length / configurations.length
				);
				var delegates = _.clone(devConfig.forging.delegates);

				if (broadcastingDisabled) {
					return configurations.forEach(configuration => {
						if (configuration.httpPort === 4000) {
							// Set forging force to true
							// When sync only enabled to forge a block
							configuration.forging.force = true;
							configuration.forging.delegates = delegates;
						} else {
							configuration.forging.force = false;
							configuration.forging.delegates = [];
						}
					});
				}
				return configurations.forEach((configuration, index) => {
					configuration.forging.force = false;
					configuration.forging.delegates = delegates.slice(
						index * delegatesMaxLength,
						(index + 1) * delegatesMaxLength
					);
				});
			});

			describe('before network is setup', () => {
				it('there should be no active connections on 500[0-9] ports', done => {
					utils.getOpenConnections(wsPorts, (err, numOfConnections) => {
						if (err) {
							return done(err);
						}

						if (numOfConnections === 0) {
							done();
						} else {
							done(
								`There is ${numOfConnections} open connections on web socket ports.`
							);
						}
					});
				});
			});

			describe('when network is set up', () => {
				before(done => {
					setup.setupNetwork(configurations, done);
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
						describe('Run functional tests', () => {
							require('../functional/http/get/peers.js');
							require('../functional/http/get/blocks.js');
							require('../functional/http/get/transactions.js');
						});

						if (!broadcastingDisabled) {
							// This test uses broadcasting mechanism to test signatures
							// don't run this test when broadcasting is disabled
							scenarios.propagation.multisignature(params);
						}

						scenarios.propagation.blocks(params);
						scenarios.propagation.transactions(params);
						scenarios.stress.transfer_with_data(params);
						scenarios.stress.second_passphrase(params);
						scenarios.stress.register_delegate(params);
						scenarios.stress.cast_vote(params);
						scenarios.stress.register_multisignature(params);
						scenarios.stress.register_dapp(params);

						// Have to skip due to issue https://github.com/LiskHQ/lisk/issues/1954
						// eslint-disable-next-line mocha/no-skipped-tests
						it.skip(`there should exactly ${expectedOutgoingConnections} established connections from 500[0-9] ports`, done => {
							utils.getEstablishedConnections(
								wsPorts,
								(err, numOfConnections) => {
									if (err) {
										return done(err);
									}

									if (numOfConnections === expectedOutgoingConnections) {
										done();
									} else {
										done(
											`There are ${numOfConnections} established connections on web socket ports.`
										);
									}
								}
							);
						});
					});

					// When broadcasting is disabled, there are only
					// two nodes available for testing sync only
					// so skipping peer disconnect test
					if (!broadcastingDisabled) {
						scenarios.network.peers(params);
						scenarios.network.peersBlackList(params);
						scenarios.network.peerDisconnect(params);
					}
				});
			});
		});
	});
});
