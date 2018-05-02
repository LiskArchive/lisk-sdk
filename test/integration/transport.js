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

var devConfig = require('../data/config.json');
var utils = require('./utils');
var setup = require('./setup');
var scenarios = require('./scenarios');

const totalPeers = 10;
// Each peer connected to 9 other pairs and have 2 connection for bi-directional communication
var expectedOutgoingConnections = (totalPeers - 1) * totalPeers * 2;
var wsPorts = [];

describe('given configurations for 10 nodes with address "127.0.0.1", WS ports 500[0-9] and HTTP ports 400[0-9] using separate databases', () => {
	var configurations;
	var broadcastingDisabled;
	var syncingDisabled;

	before(done => {
		broadcastingDisabled = process.env.BROADCASTING_DISABLED === 'true';
		syncingDisabled = process.env.SYNCING_DISABLED === 'true';

		utils.http.setVersion('1.0.0');
		configurations = _.range(totalPeers).map(index => {
			var devConfigCopy = _.cloneDeep(devConfig);
			devConfigCopy.ip = '127.0.0.1';
			devConfigCopy.wsPort = 5000 + index;
			devConfigCopy.httpPort = 4000 + index;
			if (!devConfigCopy.broadcasts) {
				devConfigCopy.broadcasts = {};
			}
			devConfigCopy.broadcasts.active = !broadcastingDisabled;
			if (!devConfigCopy.syncing) {
				devConfigCopy.syncing = {};
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
				configuration.peers.list = setup.sync.generatePeers(
					configurations,
					setup.sync.SYNC_MODES.ALL_TO_GROUP,
					{ indices: _.range(10) }
				);
			});
		});

		describe('when every peer forges with separate subset of genesis delegates and forging.force = false', () => {
			var testFailedError;

			before(() => {
				var secretsMaxLength = Math.ceil(
					devConfig.forging.secret.length / configurations.length
				);
				var secrets = _.clone(devConfig.forging.secret);

				return configurations.forEach((configuration, index) => {
					configuration.forging.force = false;
					configuration.forging.secret = secrets.slice(
						index * secretsMaxLength,
						(index + 1) * secretsMaxLength
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

					scenarios.network.peers(params);

					describe('when functional tests are successfully executed against 127.0.0.1:5000', () => {
						before(done => {
							setup.shell.runMochaTests(
								[
									'test/functional/http/get/peers.js',
									'test/functional/http/get/blocks.js',
									'test/functional/http/get/transactions.js',
								],
								done
							);
						});

						scenarios.propagation.blocks(params);
						scenarios.propagation.transactions(params);
						scenarios.propagation.multisignature(params);
						scenarios.stress.transfer(params);
						scenarios.stress.transfer_with_data(params);
						scenarios.stress.register_multisignature(params);
						scenarios.stress.second_passphrase(params);
						scenarios.stress.register_dapp(params);
						scenarios.stress.register_delegate(params);
						scenarios.stress.cast_vote(params);

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
				});
			});
		});
	});
});
