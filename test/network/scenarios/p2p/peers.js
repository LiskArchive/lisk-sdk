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

module.exports = function(configurations, network) {
	describe('@network : peers', () => {
		before(() => {
			return network.waitForAllNodesToBeReady();
		});

		describe('when there are mutual connections among peers', () => {
			let mutualPeers = [];

			before(done => {
				network
					.getAllPeersLists()
					.then(peers => {
						mutualPeers = peers;
						done();
					})
					.catch(done);
			});

			it('should return a list of peers mutually interconnected', () => {
				return mutualPeers.forEach(mutualPeer => {
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
					expect(_.intersection(allPorts, peerPorts)).to.be.an('array').and.not
						.to.be.empty;
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
				return mutualPeers.forEach(mutualPeer => {
					mutualPeer.peers.every(peer => {
						// delete the not required properties from ws peer list call
						// to keep consistency with api/controllers/peers.js/getPeers
						delete peer.updated;
						delete peer.clock;
						return expect(peer).to.have.all.keys(peerProps);
					});
				});
			});
		});

		describe('after 2 blocks are created in the network', () => {
			let status;

			before(done => {
				network
					.waitForBlocksOnAllNodes(2)
					.then(() => {
						return network.getAllNodesStatus();
					})
					.then(data => {
						status = data;
						done();
					});
			});

			it('should have height > 1', () => {
				return expect(status.networkMaxAvgHeight.maxHeight).to.be.above(1);
			});

			it('should have average height above 1', () => {
				return expect(status.networkMaxAvgHeight.averageHeight).to.be.above(1);
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
					expect(
						results.some(peersList => {
							return peersList.peers.some(peer => {
								return peer.height > 1;
							});
						})
					).to.be.true;
				});
			});

			it('should have matching height across all nodes', () => {
				return network.getAllNodesStatus().then(result => {
					const heights = Object.keys(
						_.groupBy(result.peerStatusList, 'height')
					);
					expect(heights).to.have.lengthOf(1);
				});
			});

			describe('network height', () => {
				it('should have networkHeight > 1 for all peers', () => {
					expect(status.peerStatusList)
						.to.be.an('Array')
						.to.have.lengthOf(status.peersCount);
					return expect(
						status.peerStatusList.forEach(peer => {
							expect(peer.networkHeight).to.be.above(1);
						})
					);
				});

				it('should be same for all the peers', () => {
					const networkHeights = _.groupBy(
						status.peerStatusList,
						'networkHeight'
					);
					const heights = Object.keys(networkHeights);
					return expect(heights).to.have.lengthOf(1); // TODO 2: This fails sometimes
				});
			});
		});
	});
};
