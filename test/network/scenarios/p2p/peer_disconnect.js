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

const Peer = require('../../../../logic/peer');
const utils = require('../../utils');

module.exports = function(
	configurations,
	network,
	TOTAL_PEERS,
	EXPECTED_TOTAL_CONNECTIONS,
	NUMBER_OF_TRANSACTIONS,
	NUMBER_OF_MONITORING_CONNECTIONS
) {
	const TOTAL_PEERS_LESS_ONE = TOTAL_PEERS - 1;
	const EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER =
		(TOTAL_PEERS_LESS_ONE - 1) * TOTAL_PEERS_LESS_ONE * 2;


	describe('@network : peer Disconnect', () => {
		const wsPorts = new Set();

		before(() => {
			return network.waitForAllNodesToBeReady();
		});

		describe('when peers are mutually connected in the network', () => {
			before(() => {
				return network.getAllPeersLists().then(mutualPeers => {
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
					network
						.stopNode('node_1')
						.then(done)
						.catch(done);
				});

				it(`peer manager should remove peer from the list and there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (
								numOfConnections - NUMBER_OF_MONITORING_CONNECTIONS <=
								EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER
							) {
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
					network
						.startNode('node_1', true)
						.then(done)
						.catch(done);
				});

				it(`there should be ${EXPECTED_TOTAL_CONNECTIONS} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (numOfConnections <= EXPECTED_TOTAL_CONNECTIONS) {
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

			describe('node restart', () => {
				// To validate peers holding socket connection
				// Need to keep one peer so that we can validate
				// Duplicate socket connection exists or not
				before('restart all nodes in the network except node_0', () => {
					const peersPromises = [];
					for (let i = 1; i < TOTAL_PEERS; i++) {
						const nodeName = `node_${i}`;
						peersPromises.push(
							network.restartNode(nodeName, true)
						);
					}
					console.info('Wait for nodes to be started');
					return Promise.all(peersPromises)
						.then(() => {
							return network.enableForgingForDelegates();
						})
						.then(() => {
							return network.waitForBlocksOnAllNodes(1);
						});
				});

				describe('after all the nodes restart', () => {
					// The expected connection becomes EXPECTED_TOTAL_CONNECTIONS + 18 previously held connections
					it(`there should be ${EXPECTED_TOTAL_CONNECTIONS +
						18} established connections from 500[0-9] ports`, done => {
						utils.getEstablishedConnections(
							Array.from(wsPorts),
							(err, numOfConnections) => {
								if (err) {
									return done(err);
								}

								if (
									numOfConnections - NUMBER_OF_MONITORING_CONNECTIONS <=
									EXPECTED_TOTAL_CONNECTIONS
								) {
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
