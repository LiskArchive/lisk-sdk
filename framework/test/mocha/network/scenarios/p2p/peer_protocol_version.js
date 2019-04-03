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
	const TOTAL_PEERS_LESS_ONE = TOTAL_PEERS - 1;
	const EXPECTED_TOTAL_CONNECTIONS_AFTER_STARTING_INCOMPATIBLE_PEER =
		(TOTAL_PEERS_LESS_ONE - 1) * TOTAL_PEERS_LESS_ONE * 2;
	const EXPECTED_MONITORING_CONNECTIONS_AFTER_STOPPING_A_NODE =
		NUMBER_OF_MONITORING_CONNECTIONS - 2;
	// One of the bi-directional monitoring connections should be down so
	// we need to subtract 2.

	// TODO: Unskip this test once we have transitioned to the new config format.
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('@p2p : peer Protocol Version', () => {
		const { protocolVersion: originalProtocolVersion } = __testContext.config;
		let pm2NetworkConfig;

		describe('when a node with protocol = 0.0 (invalid) tries to join the network', () => {
			before(async () => {
				// lisk-core linter ci task complains because it doesn't find the file, which is
				// okay as the file is only present on lisk-core-network tests.
				// eslint-disable-next-line import/no-dynamic-require, import/no-unresolved
				pm2NetworkConfig = require('../../pm2.network.json');
				pm2NetworkConfig.apps[9].env.PROTOCOL_VERSION = '0.0';
				await fs_writeFile(
					`${__dirname}/../../pm2.network.json`,
					JSON.stringify(pm2NetworkConfig, null, 4)
				);

				await network.reloadNode('node_9', true, true);
				await network.waitForBlocksOnNode('node_1', 4);
			});

			it(`there should still be ${TOTAL_PEERS - 1} active peers`, async () => {
				const currentActivePeers = await network.getAllPeersLists();
				return expect(currentActivePeers.length).to.equal(TOTAL_PEERS - 1);
			});

			it(`there should be ${EXPECTED_TOTAL_CONNECTIONS_AFTER_STARTING_INCOMPATIBLE_PEER} established connections from 500[0-9] ports`, async () => {
				return utils
					.getEstablishedConnections(WSPORTS)
					.then(establishedConnections => {
						return expect(
							establishedConnections -
								EXPECTED_MONITORING_CONNECTIONS_AFTER_STOPPING_A_NODE
						).to.equal(
							EXPECTED_TOTAL_CONNECTIONS_AFTER_STARTING_INCOMPATIBLE_PEER
						);
					});
			});
		});

		describe('when this node with protocol = 1.0 (valid) tries to join the network again', () => {
			before(async () => {
				pm2NetworkConfig.apps[9].env.PROTOCOL_VERSION = originalProtocolVersion; // '1.0'
				await fs_writeFile(
					`${__dirname}/../../pm2.network.json`,
					JSON.stringify(pm2NetworkConfig, null, 4)
				);

				await network.reloadNode('node_9', true, true);
				await network.waitForBlocksOnNode('node_1', 4);
			});

			it(`there should still be ${TOTAL_PEERS} active peers`, async () => {
				const currentActivePeers = await network.getAllPeersLists();
				return expect(currentActivePeers.length).to.equal(TOTAL_PEERS);
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
