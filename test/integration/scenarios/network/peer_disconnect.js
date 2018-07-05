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

const childProcess = require('child_process');
const Peer = require('../../../../logic/peer');
const utils = require('../../utils');
const network = require('../../setup/network');
const common = require('../common');

const totalPeers = 10;
// Each peer connected to 9 other pairs and have 2 connection for bi-directional communication
var expectedOutgoingConnections = (totalPeers - 1) * totalPeers * 2;

module.exports = configurations => {
	describe('Peer Disconnect', () => {
		var params = {};
		common.setMonitoringSocketsConnections(params, configurations);

		const getAllPeers = sockets => {
			return Promise.all(
				sockets.map(socket => {
					if (socket.state === 'open') {
						return socket.call('list', {});
					}
				})
			);
		};

		const stopNode = nodeName => {
			return childProcess.execSync(`pm2 stop ${nodeName}`);
		};

		const startNode = nodeName => {
			childProcess.execSync(`pm2 start ${nodeName}`);
		};

		const wsPorts = new Set();

		describe('when peers are mutually connected in the network', () => {
			before(() => {
				return getAllPeers(params.sockets).then(mutualPeers => {
					mutualPeers.forEach(mutualPeer => {
						if (mutualPeer) {
							mutualPeer.peers.map(peer => {
								if (peer.wsPort > 5000 && peer.wsPort <= 5009) {
									wsPorts.add(peer.wsPort);
								}
								expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
							});
						}
					});
				});
			});

			describe('when a node is stopped', () => {
				before(done => {
					stopNode('node_1');
					setTimeout(() => {
						done();
					}, 2000);
				});

				it(`peer manager should remove peer from the list and there should be ${expectedOutgoingConnections -
					20} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (numOfConnections <= expectedOutgoingConnections - 20) {
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

			describe('when a stopped node is started', () => {
				before(done => {
					startNode('node_1');
					setTimeout(() => {
						done();
					}, 2000);
				});

				it(`there should be ${expectedOutgoingConnections} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (numOfConnections <= expectedOutgoingConnections) {
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

			describe('node stop and start', () => {
				// To validate peers holding socket connection
				// Need to keep one peer so that we can validate
				// Duplicate socket connection exists or not
				it('stop all the nodes in the network except node_0', done => {
					for (let i = 1; i < totalPeers; i++) {
						stopNode(`node_${i}`);
					}
					setTimeout(() => {
						console.info('Wait for nodes to be stopped');
						done();
					}, 10000);
				});

				it('start all nodes that were stopped', done => {
					for (let i = 1; i < totalPeers; i++) {
						startNode(`node_${i}`);
					}
					setTimeout(() => {
						console.info('Wait for nodes to be started');
						done();
					}, 10000);
				});

				describe('after all the node restarts', () => {
					before(done => {
						network.enableForgingOnDelegates(params.configurations, done);
					});

					// The expected connection becomes 180(new connection) + 18 (previously held connections)
					it(`should be ${expectedOutgoingConnections +
						18} established connections from 500[0-9] ports`, done => {
						utils.getEstablishedConnections(
							Array.from(wsPorts),
							(err, numOfConnections) => {
								if (err) {
									return done(err);
								}

								if (numOfConnections <= expectedOutgoingConnections + 18) {
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
};
