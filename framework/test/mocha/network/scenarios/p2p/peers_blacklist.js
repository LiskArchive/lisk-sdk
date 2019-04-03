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
const util = require('util');
const Peer = require('../../../../../src/modules/chain/logic/peer');
const utils = require('../../utils');

const fs_writeFile = util.promisify(fs.writeFile);

module.exports = function(
	configurations,
	network,
	WSPORTS,
	TOTAL_PEERS,
	EXPECTED_TOTAL_CONNECTIONS,
	NUMBER_OF_MONITORING_CONNECTIONS
) {
	// One of the bi-directional monitoring connections should be down so
	// we need to subtract 2.
	const EXPECTED_MONITORING_CONNECTIONS_AFTER_BLACKLISTING =
		NUMBER_OF_MONITORING_CONNECTIONS - 2;

	// Full mesh network with 2 connection for bi-directional communication without the blacklisted peer
	const EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING =
		(TOTAL_PEERS - 2) * (TOTAL_PEERS - 1) * 2;

	// TODO: Unskip this test once we have transitioned to the new config format.
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('@p2p : peer Blacklisted', () => {
		describe('when a node blacklists an ip', () => {
			before(() => {
				// Blacklisting ip on the node number 9 which is not producing any blocks
				configurations[9].peers.access.blackList.push('127.0.0.1');
				return fs_writeFile(
					`${__dirname}/../../configs/config.node-9.json`,
					JSON.stringify(configurations[9], null, 4)
				)
					.then(() => {
						// Restart the node to load the just changed configuration
						return network.restartNode('node_9', true);
					})
					.then(() => {
						// Make sure that there is enough time for monitoring connection
						// to be re-established after restart.
						return network.waitForBlocksOnNode('node_0', 4);
					});
			});

			it(`there should be ${TOTAL_PEERS - 1} peers holding ${TOTAL_PEERS -
				2} or less active connections each one`, async () => {
				return network.getAllPeersLists().then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS - 1);
					return peers.map(peer => {
						expect(peer.peers.length).to.be.below(TOTAL_PEERS - 1);
						return peer.peers.map(peerFromPeer => {
							return expect(peerFromPeer.state).to.equal(Peer.STATE.CONNECTED);
						});
					});
				});
			});

			it(`there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING} established connections from 500[0-9] ports`, async () => {
				return utils
					.getEstablishedConnections(WSPORTS)
					.then(establishedConnections => {
						return expect(
							establishedConnections -
								EXPECTED_MONITORING_CONNECTIONS_AFTER_BLACKLISTING
						).to.equal(EXPECTED_TOTAL_CONNECTIONS_AFTER_BLACKLISTING);
					});
			});

			it(`node_9 should have ${TOTAL_PEERS} peers banned`, async () => {
				return utils.http.getPeers(4009).then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS);
					return peers.map(peer => {
						return expect(peer.state).to.equal(Peer.STATE.BANNED);
					});
				});
			});

			it('node_0 should have only himself and node_9 disconnected', async () => {
				return utils.http.getPeers(4000).then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS);
					return peers.map(peer => {
						if (peer.wsPort === 5000 || peer.wsPort === 5009) {
							return expect(peer.state).to.equal(Peer.STATE.DISCONNECTED);
						}
						return expect(peer.state).to.equal(Peer.STATE.CONNECTED);
					});
				});
			});
		});

		describe('when the node remove the just blacklisted ip', () => {
			before(() => {
				configurations[9].peers.access.blackList = [];
				return fs_writeFile(
					`${__dirname}/../../configs/config.node-9.json`,
					JSON.stringify(configurations[9], null, 4)
				)
					.then(() => {
						// Restart the node to load the just changed configuration
						return network.restartNode('node_9', true);
					})
					.then(() => {
						// Make sure that there is enough time for monitoring connection
						// to be re-established after restart.
						return network.waitForBlocksOnNode('node_0', 4);
					});
			});

			it(`there should be ${TOTAL_PEERS} peers holding above ${TOTAL_PEERS -
				3} active connections each one`, async () => {
				return network.getAllPeersLists().then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS);
					return peers.map(peer => {
						expect(peer.peers.length).to.be.above(TOTAL_PEERS - 3);
						return peer.peers.map(peerFromPeer => {
							return expect(peerFromPeer.state).to.equal(Peer.STATE.CONNECTED);
						});
					});
				});
			});

			it(`there should be ${EXPECTED_TOTAL_CONNECTIONS} established connections from 500[0-9] ports`, async () => {
				return utils
					.getEstablishedConnections(WSPORTS)
					.then(establishedConnections => {
						return expect(
							establishedConnections - NUMBER_OF_MONITORING_CONNECTIONS
						).to.equal(EXPECTED_TOTAL_CONNECTIONS);
					});
			});

			it('node_9 should have every peer connected but himself', async () => {
				return utils.http.getPeers(4009).then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS);
					return peers.map(peer => {
						if (peer.wsPort === 5009) {
							return expect(peer.state).to.not.equal(Peer.STATE.CONNECTED);
						}
						return expect(peer.state).to.equal(Peer.STATE.CONNECTED);
					});
				});
			});

			it('node_0 should have every peer connected but himself', async () => {
				return utils.http.getPeers(4000).then(peers => {
					expect(peers.length).to.equal(TOTAL_PEERS);
					return peers.map(peer => {
						if (peer.wsPort === 5000) {
							return expect(peer.state).to.not.equal(Peer.STATE.CONNECTED);
						}
						return expect(peer.state).to.equal(Peer.STATE.CONNECTED);
					});
				});
			});
		});
	});
};
