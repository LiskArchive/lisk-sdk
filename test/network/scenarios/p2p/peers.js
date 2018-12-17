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

module.exports = function(configurations, network, WSPORTS, TOTAL_PEERS) {
	describe('@network : peers', () => {
		before(() => {
			return network.waitForBlocksOnAllNodes(2);
		});

		describe('when there are mutual connections among peers', () => {
			it(`there should be ${TOTAL_PEERS} active peers`, () => {
				return network.getAllPeersLists().then(peers => {
					return expect(peers.length).to.equal(TOTAL_PEERS);
				});
			});

			it('should return a list of peers mutually interconnected', () => {
				return network.getAllPeersLists().then(peers => {
					return peers.forEach(mutualPeer => {
						expect(mutualPeer).to.have.property('success').to.be.true;
						expect(mutualPeer)
							.to.have.property('peers')
							.to.be.an('array');
						const peerPorts = mutualPeer.peers.map(peer => {
							return peer.wsPort;
						});
						const allPorts = configurations.map(configuration => {
							return configuration.wsPort;
						});
						return expect(_.intersection(allPorts, peerPorts)).to.be.an('array')
							.and.not.to.be.empty;
					});
				});
			});

			it('should have all the required peer properties', () => {
				const peerProps = [
					'ip',
					'wsPort',
					'state',
					'os',
					'version',
					'broadhash',
					'httpPort',
					'height',
					'nonce',
				];
				return network.getAllPeersLists().then(peers => {
					return peers.forEach(mutualPeer => {
						return mutualPeer.peers.every(peer => {
							// delete the not required properties from ws peer list call
							// to keep consistency with api/controllers/peers.js/getPeers
							delete peer.updated;
							delete peer.clock;
							return expect(peer).to.have.all.keys(peerProps);
						});
					});
				});
			});
		});

		describe('after 2 blocks are created in the network', () => {
			before(() => {
				return network.waitForBlocksOnAllNodes(2);
			});

			it('should have height > 1', () => {
				return network
					.getAllNodesStatus()
					.then(status =>
						expect(status.networkMaxAvgHeight.maxHeight).to.be.above(1)
					);
			});

			it('should have average height above 1', () => {
				return network
					.getAllNodesStatus()
					.then(status =>
						expect(status.networkMaxAvgHeight.averageHeight).to.be.above(1)
					);
			});

			it('should have valid values matching specification', () => {
				return network.getAllPeersLists().then(results => {
					return results.map(peersList => {
						return peersList.peers.map(peer => {
							expect(peer.ip).to.not.empty;
							expect(peer.wsPort).to.be.gte(5000);
							expect(peer.wsPort).to.be.lt(5010);
							expect(peer.version).to.not.empty;
							return expect(peer.nonce).to.not.empty;
						});
					});
				});
			});

			it('should have different peers heights propagated correctly on peers lists', () => {
				return network.getAllPeersLists().then(results => {
					return results.some(peersList => {
						return peersList.peers.some(peer => {
							return expect(peer.height).to.gt(1);
						});
					});
				});
			});

			it('should have matching height across all nodes', () => {
				return network.getAllNodesStatus().then(result => {
					const heights = Object.keys(
						_.groupBy(result.peerStatusList, 'height')
					);
					return expect(heights).to.have.lengthOf(1);
				});
			});

			describe('network height', () => {
				it('should have networkHeight > 1 for all peers', () => {
					return network.getAllNodesStatus().then(status => {
						expect(status.peerStatusList)
							.to.be.an('Array')
							.to.have.lengthOf(status.peersCount);
						return status.peerStatusList.map(peer => {
							return expect(peer.networkHeight).to.be.above(1);
						});
					});
				});

				it('should be same for all the peers', () => {
					return network.getAllNodesStatus().then(status => {
						const networkHeights = _.groupBy(
							status.peerStatusList,
							'networkHeight'
						);
						const heights = Object.keys(networkHeights);
						return expect(heights).to.have.lengthOf(1);
					});
				});
			});
		});
	});
};
