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
} from '../../src/peer_selection';
import { P2PNodeInfo } from '../../src/p2p_types';

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
				return expect(selectPeersForConnection({ peers: peerList }))
					.be.an('array')
					.and.is.eql(peerList)
					.of.length(numberOfPeers);
			});
		});
	});
});
