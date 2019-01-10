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
	describe('@p2p : peers', () => {
		describe('after 4 blocks are created in the network', () => {
			before(() => {
				return network.waitForBlocksOnAllNodes(4);
			});

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

			describe('network height', () => {
				it('should be at most 4 in one peer (maxHeight)', () => {
					return network
						.getAllNodesStatus()
						.then(status =>
							expect(status.networkMaxAvgHeight.maxHeight).to.be.at.least(4)
						);
				});

				it('should be on average above 2', () => {
					return network
						.getAllNodesStatus()
						.then(status =>
							expect(status.networkMaxAvgHeight.averageHeight).to.be.above(2)
						);
				});

				it('should be above 1 for all peers', () => {
					return network.getAllNodesStatus().then(status => {
						expect(status.peerStatusList)
							.to.be.an('Array')
							.to.have.lengthOf(status.peersCount);
						return status.peerStatusList.map(peer => {
							return expect(peer.networkHeight).to.be.above(2);
						});
					});
				});

				it('should be similar among all peers (max 2 blocks of difference)', () => {
					return network.getAllNodesStatus().then(status => {
						const networkHeights = _.groupBy(
							status.peerStatusList,
							'networkHeight'
						);
						const heights = Object.keys(networkHeights);
						if (heights.length !== 1) {
							expect(heights).to.have.lengthOf(2);
							return expect(Math.abs(heights[0] - heights[1])).to.be.at.most(2);
						}
						return expect(heights).to.have.lengthOf(1);
					});
				});
			});
		});
	});
};
