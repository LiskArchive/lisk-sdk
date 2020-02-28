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
import {
	initPeerInfoList,
	initPeerInfoListWithSuffix,
} from '../../utils/peers';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from '../../../src/utils/select';
import { P2PNodeInfo, P2PPeerInfo } from '../../../src/types';
import { DEFAULT_SEND_PEER_LIMIT } from '../../../src/constants';

describe('peer selector', () => {
	const nodeInfo: P2PNodeInfo = {
		height: 545777,
		networkId: '73458irc3yb7rg37r7326dbt7236',
		os: 'linux',
		version: '1.1.1',
		protocolVersion: '1.1',
		wsPort: 5000,
		nonce: 'nonce',
		advertiseAddress: true,
	};

	describe('#selectPeersForRequest', () => {
		let peerList = initPeerInfoList();

		describe('get a list of n number of good peers', () => {
			beforeEach(async () => {
				peerList = initPeerInfoList();
			});

			it('should return an array without optional arguments', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toEqual(expect.any(Array)));

			it('should return an array', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toEqual(expect.any(Array)));

			it('returned array should contain good peers according to algorithm', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 5,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(5));

			it('return empty peer list for no peers as an argument', () =>
				expect(
					selectPeersForRequest({
						peers: [],
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toEqual([]));

			it('should return an array having one good peer', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 1,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(1));

			it('should return an array having 2 good peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 2,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(2));

			it('should return an array having all good peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 5,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(5));

			it('should return an array of equal length equal to requested number of peers', () =>
				expect(
					selectPeersForRequest({
						peers: peerList,
						nodeInfo,
						peerLimit: 3,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(3));
		});

		describe('peers with lower blockheight', () => {
			beforeEach(async () => {
				peerList = initPeerInfoList();
			});
			const lowHeightPeers = peerList.filter(
				peer =>
					peer.sharedState &&
					(peer.sharedState.height as number) < (nodeInfo.height as number),
			);

			it('should return an array with 1 good peer', () => {
				return expect(
					selectPeersForRequest({
						peers: lowHeightPeers,
						nodeInfo,
						peerLimit: 2,
						requestPacket: { procedure: 'foo', data: {} },
					}),
				).toHaveLength(1);
			});
		});
	});

	describe('#selectPeersForSend', () => {
		let peerList = initPeerInfoListWithSuffix('111.112.113', 120);

		it('should return an array containing an even number of inbound and outbound peers', () => {
			const selectedPeers = selectPeersForSend({
				peers: peerList,
				nodeInfo,
				peerLimit: DEFAULT_SEND_PEER_LIMIT,
				messagePacket: { event: 'foo', data: {} },
			});

			let peerKindCounts = selectedPeers.reduce(
				(peerKindTracker: any, peerInfo: P2PPeerInfo) => {
					const kind = peerInfo.internalState
						? (peerInfo.internalState.connectionKind as string)
						: '';
					if (!peerKindTracker[kind]) {
						peerKindTracker[kind] = 0;
					}
					peerKindTracker[kind]++;
					return peerKindTracker;
				},
				{},
			);

			// Assert
			expect(peerKindCounts.inbound).toEqual(peerKindCounts.outbound);
			expect(peerKindCounts.inbound).toBe(DEFAULT_SEND_PEER_LIMIT / 2);
		});
	});

	describe('#selectPeersForConnection', () => {
		const peerList = initPeerInfoList();
		const numberOfPeers = peerList.length;

		describe('when there are no peers', () => {
			it('should return empty array', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: [],
					newPeers: [],
					peerLimit: 20,
				});
				expect(selectedPeers).toBeEmpty;
			});
		});

		describe('when peerLimit is undefined', () => {
			it('should return all peers given as argument for connection', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 20,
				});
				expect(selectedPeers).toHaveLength(numberOfPeers);
				return expect(peerList).toEqual(selectedPeers);
			});
		});

		describe('when peerLimit is zero', () => {
			it('should not return any peer', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 0,
				});
				expect(selectedPeers).toBeEmpty;
			});
		});

		describe('when peerLimit is one', () => {
			it('should return a single peer', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 1,
				});
				expect(selectedPeers).toHaveLength(1);
			});
		});

		describe('when peerLimit is more than one', () => {
			it('should return more than one', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 3,
				});
				expect(selectedPeers).toHaveLength(3);
			});
		});

		describe('when peerLimit is larger than the number of existing peers', () => {
			it('should return all peers given as argument for connection', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: peerList.length + 1,
				});
				expect(selectedPeers).toHaveLength(peerList.length);
				expect(peerList).toEqual(selectedPeers);
			});
		});

		describe('when there are only newPeers', () => {
			it('should not return undefined peers', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: [],
					newPeers: peerList,
					peerLimit: 3,
				});
				expect(selectedPeers).toHaveLength(3);
				expect(peerList).toIncludeAllMembers(selectedPeers as any);
			});
		});

		describe('when there are only triedPeers', () => {
			it('should return no duplicates', () => {
				const selectedPeers = selectPeersForConnection({
					triedPeers: peerList,
					newPeers: [],
					peerLimit: 4,
				});
				expect(selectedPeers).toHaveLength(4);
				expect(peerList).toIncludeAllMembers(selectedPeers as any);
				for (const peer of selectedPeers) {
					const foundPeers = selectedPeers.filter(x => x === peer);
					expect(foundPeers).toHaveLength(1);
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
				expect(selectedPeers).toHaveLength(peerList.length);
				expect(peerList).toIncludeAllMembers(selectedPeers as any);
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
				expect(selectedPeers).toHaveLength(4);
				expect(peerList).toIncludeAllMembers(selectedPeers as any);
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
				expect(selectedPeers).toHaveLength(3);
				expect(peerList).toIncludeAllMembers(selectedPeers as any);
			});
		});

		describe('when there are less than 100 peers', () => {
			it('should return peers uniformly from both lists', () => {
				jest.spyOn(Math, 'random').mockReturnValue(0.499);

				const triedPeers = initPeerInfoListWithSuffix('111.112.113', 25);
				const newPeers = initPeerInfoListWithSuffix('111.112.114', 75);

				const selectedPeers = selectPeersForConnection({
					triedPeers,
					newPeers,
					peerLimit: 50,
				});

				expect(selectedPeers).toHaveLength(50);

				expect([...triedPeers, ...newPeers]).toIncludeAllMembers(
					selectedPeers as any,
				);

				let triedCount = 0;
				let newCount = 0;

				for (const peer of selectedPeers) {
					if (triedPeers.find(triedPeer => peer.peerId === triedPeer.peerId)) {
						triedCount++;
					} else {
						newCount++;
					}
				}

				expect(triedCount).toEqual(25);
				expect(newCount).toEqual(25);
			});

			it('should return only new peer list', () => {
				jest.spyOn(Math, 'random').mockReturnValue(0.5);
				const triedPeers = initPeerInfoListWithSuffix('111.112.113', 25);
				const newPeers = initPeerInfoListWithSuffix('111.112.114', 75);

				const selectedPeers = selectPeersForConnection({
					triedPeers,
					newPeers,
					peerLimit: 50,
				});

				expect(selectedPeers).toHaveLength(50);

				expect([...triedPeers, ...newPeers]).toIncludeAllMembers(
					selectedPeers as any,
				);

				let triedCount = 0;
				let newCount = 0;

				for (const peer of selectedPeers) {
					if (triedPeers.find(triedPeer => peer.peerId === triedPeer.peerId)) {
						triedCount++;
					} else {
						newCount++;
					}
				}

				expect(triedCount).toEqual(0);
				expect(newCount).toEqual(50);
			});
		});

		describe('when there are multiple peer from same IP with different height', () => {
			it('should return only unique IPs', () => {
				let uniqIpAddresses: Array<string> = [];

				const triedPeers: Array<P2PPeerInfo> = [...Array(10)].map((_e, i) => ({
					peerId: `205.120.0.20:${10001 + i}`,
					ipAddress: '205.120.0.20',
					wsPort: 10001 + i,
					sharedState: {
						height: 10001 + i,
						isDiscoveredPeer: false,
						version: '1.1.1',
						protocolVersion: '1.1',
					},
				}));

				const newPeers: Array<P2PPeerInfo> = [...Array(10)].map((_e, i) => ({
					peerId: `205.120.0.20:${5000 + i}`,
					ipAddress: '205.120.0.20',
					wsPort: 5000 + i,
					sharedState: {
						height: 5000 + i,
						isDiscoveredPeer: false,
						version: '1.1.1',
						protocolVersion: '1.1',
					},
				}));

				triedPeers.push(peerList[0]);
				newPeers.push(peerList[2]);

				const selectedPeers = selectPeersForConnection({
					triedPeers,
					newPeers,
					peerLimit: 5,
				});

				selectedPeers.map(peer => uniqIpAddresses.push(peer.ipAddress));

				expect(Object.keys(selectedPeers)).not.toHaveLength(0);
				expect(selectedPeers.length).toBe([...new Set(uniqIpAddresses)].length);
			});
		});
	});
});
