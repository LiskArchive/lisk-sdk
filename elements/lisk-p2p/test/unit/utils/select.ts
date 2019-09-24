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
import {
	initializePeerInfoList,
	initializeLongPeerInfoList,
} from '../../utils/peers';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from '../../../src/utils/select';
import { P2PNodeInfo, P2PPeerInfo } from '../../../src/p2p_types';

describe('peer selector', () => {
	describe('#selectPeersForSend', () => {
		let peerList = initializeLongPeerInfoList();

		const nodeInfo: P2PNodeInfo = {
			height: 545777,
			nethash: '73458irc3yb7rg37r7326dbt7236',
			os: 'linux',
			version: '1.1.1',
			protocolVersion: '1.1',
			wsPort: 5000,
		};

		it('should return an array containing an even number of inbound and outbound peers', () => {
			const selectedPeers = selectPeersForSend({
				peers: peerList,
				nodeInfo,
				peerLimit: 24,
				messagePacket: { event: 'foo', data: {} },
			});

			let peerKindCounts = selectedPeers.reduce(
				(peerKindTracker: any, peerInfo: P2PPeerInfo) => {
					const kind = peerInfo.kind as string;
					if (!peerKindTracker[kind]) {
						peerKindTracker[kind] = 0;
					}
					peerKindTracker[kind]++;
					return peerKindTracker;
				},
				{},
			);

			expect(peerKindCounts.inbound)
				.to.equal(peerKindCounts.outbound)
				.to.equal(12);
		});
	});
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

			it('should return an array without optional arguments', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).to.be.an('array'));

			it('should return an array', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).to.be.an('array'));

			it('returned array should contain good peers according to algorithm', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 5,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(5));

			it('return empty peer list for no peers as an argument', () =>
				expect(
					selectPeersForRequest({
						peers: [],
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.to.be.eql([]));

			it('should return an array having one good peer', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(1));

			it('should return an array having 2 good peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 2,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(2));

			it('should return an array having all good peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 5,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(5));

			it('should return an array of equal length equal to requested number of peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 3,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(3));
		});

		describe('peers with lower blockheight', () => {
			beforeEach(async () => {
				peerList = initializePeerInfoList();
			});
			const lowHeightPeers = peerList.filter(
				peer => peer.height < nodeInfo.height,
			);

			it('should return an array with 1 good peer', () => {
				return expect(
					selectPeersForRequest({
						peers: lowHeightPeers,
						nodeInfo,
						peerLimit: 2,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				)
					.and.be.an('array')
					.and.of.length(1);
			});
		});
	});

	describe('#selectPeersForSend', () => {
		it('should check all cases');
	});

	describe('#selectPeersForConnection', () => {
		const peerList = initializePeerInfoList();
		const numberOfPeers = peerList.length;

		describe('when there are no peers', () => {
			it('should return empty array', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: [],
					newPeers: [],
					peerLimit: 20,
				});
				expect(selectedPeers).to.be.an('array').empty;
			});
		});

		describe('when peerLimit is undefined', () => {
			it('should return all peers given as argument for connection', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 20,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(numberOfPeers);
				return expect(peerList).to.deep.eq(selectedPeers);
			});
		});

		describe('when peerLimit is zero', () => {
			it('should not return any peer', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 0,
				});
				expect(selectedPeers).to.be.an('array').empty;
			});
		});

		describe('when peerLimit is one', () => {
			it('should return a single peer', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 1,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(1);
			});
		});

		describe('when peerLimit is more than one', () => {
			it('should return more than one', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 3,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(3);
			});
		});

		describe('when peerLimit is larger than the number of existing peers', () => {
			it('should return all peers given as argument for connection', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: peerList.length + 1,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(peerList.length);
				expect(peerList).to.include.members(selectedPeers);
			});
		});

		describe('when there are only newPeers', () => {
			it('should not return undefined peers', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: [],
					newPeers: peerList,
					peerLimit: 3,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(3);
				expect(peerList).to.include.members(selectedPeers);
			});
		});

		describe('when there are only triedPeers', () => {
			it('should return no duplicates', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 4,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(4);
				expect(peerList).to.contain.members(selectedPeers);
				for (const peer of selectedPeers) {
					const foundPeers = selectedPeers.filter(x => x === peer);
					expect(foundPeers).to.have.length(1);
				}
			});
		});

		describe('when there are same number of peers as the limit', () => {
			it('should return all peers', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: [peerList[0]],
					newPeers: [peerList[1], peerList[2], peerList[3], peerList[4]],
					peerLimit: peerList.length,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(peerList.length);
				expect(peerList).to.include.members(selectedPeers);
			});
		});

		describe('when there are more new peers than tried', () => {
			it('should return both kind of peers', () => {
				const triedPeers = [peerList[0], peerList[1]];
				const newPeers = [peerList[2], peerList[3], peerList[4]];
				const selectedPeers = selectPeersForConnection({
					triedPeers,
					newPeers,
					peerLimit: 4,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(4);
				expect(peerList).to.contain.members(selectedPeers);
			});
		});

		describe('when there are same number of new and tried peers', () => {
			it('should not return undefined peers', () => {
				const triedPeers = [peerList[0], peerList[1]];
				const newPeers = [peerList[2], peerList[3]];
				const selectedPeers = selectPeersForConnection({
					triedPeers,
					newPeers,
					peerLimit: 3,
				});
				expect(selectedPeers)
					.to.be.an('array')
					.of.length(3);
				expect(peerList).to.include.members(selectedPeers);
			});
		});
	});
});
