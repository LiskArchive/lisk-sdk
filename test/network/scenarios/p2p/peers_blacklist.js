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

const fs = require('fs');
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
	// One of the bi-directional monitoring connections should be down so
	// we need to subtract 2.
	const EXPECTED_MONITORING_CONNECTIONS_AFTER_BLACKLISTING =
		NUMBER_OF_MONITORING_CONNECTIONS - 2;

	// Full mesh network with 2 connection for bi-directional communication without the blacklisted peer
	const EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING =
		(TOTAL_PEERS - 2) * (TOTAL_PEERS - 1) * 2;

	describe('@network : peer Blacklisted', () => {
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
								wsPorts.add(peer.wsPort);
								expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
							});
						}
					});
				});
			});

			it(`there should be ${EXPECTED_TOTAL_CONNECTIONS} established connections from 500[0-9] ports`, done => {
				utils.getEstablishedConnections(
					Array.from(wsPorts),
					(err, numOfConnections) => {
						if (err) {
							return done(err);
						}

						if (
							numOfConnections - NUMBER_OF_MONITORING_CONNECTIONS ===
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

			describe('when a node blacklists an ip', () => {
				before(done => {
					configurations[0].peers.access.blackList.push('127.0.0.1');
					fs.writeFileSync(
						`${__dirname}/../../configs/config.node-0.json`,
						JSON.stringify(configurations[0], null, 4)
					);
					// Restart the node to load the just changed configuration
					network
						.restartNode('node_0', true)
						.then(done)
						.catch(err => {
							done(err.message);
						});
				});

				it(`there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (
								numOfConnections -
									EXPECTED_MONITORING_CONNECTIONS_AFTER_BLACKLISTING ===
								EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING
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

				it(`peers manager should contain ${TOTAL_PEERS -
					2} active connections`, () => {
					return network.getAllPeersLists().then(mutualPeers => {
						mutualPeers.forEach(mutualPeer => {
							if (mutualPeer) {
								expect(mutualPeer.peers.length).to.be.eql(TOTAL_PEERS - 2);
								mutualPeer.peers.map(peer => {
									expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
								});
							}
						});
					});
				});

				it('node_0 should have every peer banned', () => {
					return utils.http.getPeers().then(peers => {
						peers.map(peer => {
							expect(peer.state).to.be.eql(Peer.STATE.BANNED);
						});
					});
				});

				it('node_1 should have only himself and node_0 disconnected', () => {
					return utils.http.getPeers(4001).then(peers => {
						peers.map(peer => {
							if (peer.wsPort == 5000 || peer.wsPort == 5001) {
								expect(peer.state).to.be.eql(Peer.STATE.DISCONNECTED);
							} else {
								expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
							}
						});
					});
				});
			});

			describe('when a node remove the just blacklisted ip', () => {
				before(done => {
					configurations[0].peers.access.blackList = [];
					fs.writeFileSync(
						`${__dirname}/../../configs/config.node-0.json`,
						JSON.stringify(configurations[0], null, 4)
					);
					// Restart the node to load the just changed configuration
					network
						.restartNode('node_0', true)
						.then(() => {
							// Make sure that there is enough time for monitoring connection
							// to be re-established after restart.
							return network.waitForBlocksOnNode('node_0', 1);
						})
						.then(done)
						.catch(err => {
							done(err.message);
						});
				});

				it(`there should be ${EXPECTED_TOTAL_CONNECTIONS} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, numOfConnections) => {
							if (err) {
								return done(err);
							}

							if (
								numOfConnections - NUMBER_OF_MONITORING_CONNECTIONS ===
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

				it('node_0 should have every peer connected but himself', () => {
					return utils.http.getPeers().then(peers => {
						peers.map(peer => {
							if (peer.wsPort == 5000) {
								expect(peer.state).to.be.not.eql(Peer.STATE.CONNECTED);
							} else {
								expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
							}
						});
					});
				});
			});
		});
	});
};
