/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */

import { expect } from 'chai';
import { initializePeerInfoList } from '../utils/peers';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	getUniquePeersbyIp,
} from '../../src/peer_selection';
import { P2PNodeInfo, P2PDiscoveredPeerInfo } from '../../src/p2p_types';

describe('peer selector', () => {
	describe('#selectPeersForRequest', () => {
		let peerList = initializePeerInfoList();
		const nodeInfo: P2PNodeInfo = {
			height: 545777,
			nethash: '73458irc3yb7rg37r7326dbt7236',
			os: 'linux',
			version: '1.1.1',
			protocolVersion: '1.1',
			wsPort: 5000,
		};

		describe('get a list of n number of good peers', () => {
			beforeEach(async () => {
				peerList = initializePeerInfoList();
			});

			it('should return an array without optional arguments', () => {
				return expect(selectPeersForRequest({ peers: peerList })).to.be.an(
					'array',
				);
			});

			it('should return an array', () => {
				return expect(
					selectPeersForRequest({ peers: peerList, nodeInfo }),
				).to.be.an('array');
			});

			it('returned array should contain good peers according to algorithm', () => {
				return expect(selectPeersForRequest({ peers: peerList, nodeInfo }))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('return empty peer list for no peers as an argument', () => {
				return expect(selectPeersForRequest({ peers: [], nodeInfo }))
					.and.be.an('array')
					.and.to.be.eql([]);
			});

			it('should return an array having one good peer', () => {
				return expect(
					selectPeersForRequest({ peers: peerList, nodeInfo, peerLimit: 1 }),
				)
					.and.be.an('array')
					.and.of.length(1);
			});

			it('should return an array having 2 good peers', () => {
				return expect(
					selectPeersForRequest({ peers: peerList, nodeInfo, peerLimit: 2 }),
				)
					.and.be.an('array')
					.and.of.length(2);
			});

			it('should return an array having all good peers', () => {
				return expect(selectPeersForRequest({ peers: peerList, nodeInfo }))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should return an array of equal length equal to requested number of peers', () => {
				return expect(
					selectPeersForRequest({ peers: peerList, nodeInfo, peerLimit: 3 }),
				)
					.and.be.an('array')
					.and.of.length(3);
			});
		});

		describe('peers with lower blockheight', () => {
			beforeEach(async () => {
				peerList = initializePeerInfoList();
			});
			const lowHeightPeers = peerList.filter(
				peer => peer.height < nodeInfo.height,
			);

			it('should return an array with 0 good peers', () => {
				return expect(
					selectPeersForRequest({
						peers: lowHeightPeers,
						nodeInfo,
						peerLimit: 2,
					}),
				)
					.and.be.an('array')
					.and.of.length(0);
			});
		});
	});

	describe('#selectPeersForConnection', () => {
		const peerList = initializePeerInfoList();
		const numberOfPeers = peerList.length;

		describe('get all the peers for selection', () => {
			it('should return all the peers given as argument for connection', () => {
				const selectedPeers = selectPeersForConnection({ peers: peerList });
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(numberOfPeers);
				return expect(peerList).to.have.members(selectedPeers);
			});
		});
	});

	describe('#getUniquePeersbyIp', () => {
		const samplePeers = initializePeerInfoList();

		describe('when two peers have same peer infos', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const duplicatesList = [...samplePeers, samplePeers[0], samplePeers[1]];
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate peers with the same ips', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort and height', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const peer1 = {
					...samplePeers[0],
					height: 1212,
					wsPort: samplePeers[0].wsPort + 1,
				};

				const peer2 = {
					...samplePeers[1],
					height: 1200,
					wsPort: samplePeers[1].wsPort + 1,
				};

				const duplicatesList = [...samplePeers, peer1, peer2];
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate ip and choose the one with higher height', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});

		describe('when two peers have same IP and different wsPort but same height', () => {
			let uniquePeerListByIp: ReadonlyArray<P2PDiscoveredPeerInfo>;

			beforeEach(async () => {
				const peer1 = {
					...samplePeers[0],
					height: samplePeers[0].height,
					wsPort: samplePeers[0].wsPort + 1,
				};

				const peer2 = {
					...samplePeers[1],
					height: samplePeers[1].height,
					wsPort: samplePeers[1].wsPort + 1,
				};

				const duplicatesList = [...samplePeers, peer1, peer2];
				uniquePeerListByIp = getUniquePeersbyIp(duplicatesList);
			});

			it('should remove the duplicate ip and choose one of the peer with same ip in sequence', async () => {
				expect(uniquePeerListByIp).eql(samplePeers);
			});
		});
	});
});
