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

const totalPeers = 10;
// Each peer connected to 9 other pairs and have 2 connection for bi-directional communication
var expectedOutgoingConnections = (totalPeers - 1) * totalPeers * 2;

module.exports = params => {
	describe('Peer Disconnect', () => {
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
					stopNode('node_5');
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
					startNode('node_5');
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
				it('stop all the nodes in the network', done => {
					for (let i = 0; i < totalPeers; i++) {
						stopNode(`node_${i}`);
					}
					done();
				});

				it('start all nodes that were stopped', done => {
					for (let i = 0; i < totalPeers; i++) {
						startNode(`node_${i}`);
					}
					done();
				});

				describe('after all the node restarts', () => {
					before(done => {
						utils.ws.establishWSConnectionsToNodes(
							params.configurations,
							(err, socketsResult) => {
								if (err) {
									return done(err);
								}
								params.sockets = socketsResult;
								network.enableForgingOnDelegates(params.configurations, () => {
									done();
								});
							}
						);
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

					it(`peers manager should have only ${expectedOutgoingConnections}`, () => {
						return utils.ws.establishWSConnectionsToNodes(
							params.configurations,
							(err, socketsResult) => {
								params.sockets = socketsResult;
								getAllPeers(socketsResult).then(mutualPeers => {
									mutualPeers.forEach(mutualPeer => {
										if (mutualPeer) {
											mutualPeer.peers.map(peer => {
												if (peer.wsPort >= 5000 && peer.wsPort <= 5009) {
													wsPorts.add(peer.wsPort);
												}
												expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
											});
										}
									});
								});
							}
						);
					});
				});
			});
		});
	});
};
