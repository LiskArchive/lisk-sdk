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

const utils = require('../../utils');

module.exports = function(
	configurations,
	network,
	WSPORTS,
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

	// TODO: Unskip this test once we have transitioned to the new config format.
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('@p2p : peer Disconnect', () => {
		describe('when a node is stopped', () => {
			before(() => {
				// Disconnecting the node number 9 which is not producing any blocks
				return network.stopNode('node_9').then(() => {
					// Make sure that there is enough time for monitoring connection
					// to be re-established after restart.
					return network.waitForBlocksOnNode('node_0', 4);
				});
			});

			it(`there should be ${TOTAL_PEERS - 1} active peers`, async () => {
				return network.getAllPeersLists().then(peers => {
					return expect(peers.length).to.equal(TOTAL_PEERS - 1);
				});
			});

			it(`there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER} established connections from 500[0-9] ports`, async () => {
				return utils
					.getEstablishedConnections(WSPORTS)
					.then(establishedConnections => {
						return expect(
							establishedConnections -
								EXPECTED_MONITORING_CONNECTIONS_AFTER_STOPPING_A_NODE
						).to.equal(EXPECTED_TOTAL_CONNECTIONS_AFTER_REMOVING_PEER);
					});
			});
		});

		describe('when a stopped node is started', () => {
			before(() => {
				return network.startNode('node_9', true).then(() => {
					// Make sure that there is enough time for monitoring connection
					// to be re-established after restart.
					return network.waitForBlocksOnNode('node_0', 4);
				});
			});

			it(`there should be ${TOTAL_PEERS} active peers again`, async () => {
				return network.getAllPeersLists().then(peers => {
					return expect(peers.length).to.equal(TOTAL_PEERS);
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
		});
	});
};
