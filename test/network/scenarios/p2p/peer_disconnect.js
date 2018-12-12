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
	NUMBER_OF_MONITORING_CONNECTIONS
) {
	const TOTAL_PEERS_LESS_ONE = TOTAL_PEERS - 1;
	const EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER =
		(TOTAL_PEERS_LESS_ONE - 1) * TOTAL_PEERS_LESS_ONE * 2;
	// One of the bi-directional monitoring connections should be down so
	// we need to subtract 2.
	const EXPECTED_MONITORING_CONNECTIONS_AFTER_STOPPING_A_NODE =
		NUMBER_OF_MONITORING_CONNECTIONS - 2;

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
								return expect(peer.state).to.be.eql(Peer.STATE.CONNECTED);
							});
						}
					});
				});
			});

			describe('when a node is stopped', () => {
				before(() => {
					return network.stopNode('node_0');
				});

				it(`there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, establishedConnections) => {
							expect(err).to.be.null;
							expect(
								establishedConnections -
									EXPECTED_MONITORING_CONNECTIONS_AFTER_STOPPING_A_NODE
							).to.equal(EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER);
							done();
						}
					);
				});
			});

			describe('when a stopped node is started', () => {
				before(() => {
					return network
						.startNode('node_0', true)
						.then(() => {
							return network.enableForgingForDelegates();
						})
						.then(() => {
							// Make sure that there is enough time for monitoring connection
							// to be re-established after restart.
							return network.waitForBlocksOnNode('node_0', 2);
						});
				});

				it(`there should be ${EXPECTED_TOTAL_CONNECTIONS} established connections from 500[0-9] ports`, done => {
					utils.getEstablishedConnections(
						Array.from(wsPorts),
						(err, establishedConnections) => {
							expect(err).to.be.null;
							expect(establishedConnections).to.equal(
								EXPECTED_TOTAL_CONNECTIONS
							);
							done();
						}
					);
				});
			});
		});
	});
};
