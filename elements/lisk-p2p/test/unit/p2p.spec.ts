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
import { P2P } from '../../src/p2p';
import { constructPeerId } from '../../src/utils';
import { wait } from '../utils/helpers';
import { customNodeInfoSchema } from '../utils/schema';

describe('p2p', () => {
	let p2pNode: P2P;

	const generatedPeers = [...Array(10).keys()].map(i => ({
		ipAddress: `120.0.0.${i}`,
		port: 5000 + i,
	}));
	const previousPeers = generatedPeers.slice(4, 5);

	beforeEach(async () => {
		p2pNode = new P2P({
			port: 5000,
			seedPeers: [],
			blacklistedIPs: generatedPeers.slice(6).map(peer => peer.ipAddress),
			fixedPeers: generatedPeers.slice(0, 6),
			whitelistedPeers: generatedPeers.slice(2, 3),
			previousPeers,
			connectTimeout: 5000,
			maxOutboundConnections: 20,
			maxInboundConnections: 100,
			nodeInfo: {
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				options: {},
				nonce: 'nonce',
				advertiseAddress: true,
			},
		});

		await p2pNode.start();
	});

	afterEach(async () => {
		try {
			await p2pNode.stop();
			// eslint-disable-next-line no-empty
		} catch (e) {}
	});

	describe('#constructor', () => {
		it('should be an object', () => {
			return expect(p2pNode).toEqual(expect.any(Object));
		});

		it('should be an instance of P2P', () => {
			return expect(p2pNode).toBeInstanceOf(P2P);
		});

		it('should load PeerBook with correct fixedPeer hierarchy', () => {
			const expectedFixedPeers = generatedPeers
				.slice(0, 6)
				.map(peer => constructPeerId(peer.ipAddress, peer.port));

			expect(expectedFixedPeers).toIncludeSameMembers(
				p2pNode['_peerBook'].allPeers
					.filter(peer => peer.internalState?.peerKind === 'fixedPeer')
					.map(peer => peer.peerId),
			);
		});

		it('should have previous peers passed from the config', () => {
			expect(
				[...p2pNode.getDisconnectedPeers(), ...p2pNode.getConnectedPeers()].map(p => p.ipAddress),
			).toContain(previousPeers[0].ipAddress);
		});

		it('should reject at multiple start attempt', async () => {
			await expect(p2pNode.start()).rejects.toThrow();
		});

		it('should reject at multiple stop attempt', async () => {
			await p2pNode.stop();
			await expect(p2pNode.stop()).rejects.toThrow();
		});
	});

	describe('p2p without peers', () => {
		let p2pNodeWithoutPeers: P2P;

		beforeEach(async () => {
			p2pNodeWithoutPeers = new P2P({
				port: 5001,
				nodeInfo: {
					chainID: Buffer.from('10000000', 'hex'),
					networkVersion: '1.1',
					options: {},
					nonce: 'nonce',
					advertiseAddress: true,
				},
			});

			await p2pNodeWithoutPeers.start();
		});

		afterEach(async () => {
			await p2pNodeWithoutPeers.stop();
		});

		it('should return no peers', () => {
			expect(p2pNodeWithoutPeers.getConnectedPeers()).toEqual([]);
			expect(p2pNodeWithoutPeers.getDisconnectedPeers()).toEqual([]);
			expect(p2pNodeWithoutPeers.getTriedPeers()).toEqual([]);
		});

		it('should fail on request', async () => {
			await expect(p2pNodeWithoutPeers.request({ procedure: 'getlastBlock' })).rejects.toThrow(
				'Request failed due to no peers found in peer selection',
			);
		});

		it('should fail on requestFromPeer', async () => {
			await expect(
				p2pNodeWithoutPeers.requestFromPeer({ procedure: 'getlastBlock' }, '127.0.0.1:5000'),
			).rejects.toThrow('Request failed because a peer with id 127.0.0.1:5000 could not be found');
		});

		it('should return network stats', () => {
			const connectStats = {
				count: 0,
				connects: 0,
				disconnects: 0,
			};

			const banningStats = {
				count: 0,
				bannedPeers: {},
			};

			expect(p2pNodeWithoutPeers.getNetworkStats().incoming).toEqual(connectStats);
			expect(p2pNodeWithoutPeers.getNetworkStats().outgoing).toEqual(connectStats);
			expect(p2pNodeWithoutPeers.getNetworkStats().banning).toEqual(banningStats);
			expect(p2pNodeWithoutPeers.getNetworkStats().totalConnectedPeers).toBe(0);
			expect(p2pNodeWithoutPeers.getNetworkStats().totalDisconnectedPeers).toBe(0);
			expect(p2pNodeWithoutPeers.getNetworkStats().totalMessagesReceived).toEqual({});
			expect(p2pNodeWithoutPeers.getNetworkStats().totalRequestsReceived).toEqual({});
			expect(p2pNodeWithoutPeers.getNetworkStats().totalErrors).toBe(0);
			expect(p2pNodeWithoutPeers.getNetworkStats().totalPeersDiscovered).toBe(0);
			expect(p2pNodeWithoutPeers.getNetworkStats().totalRemovedPeers).toBe(0);
		});
	});

	describe('when custom schema is passed', () => {
		let firstNode: P2P;

		beforeEach(async () => {
			firstNode = new P2P({
				port: 5001,
				seedPeers: [],
				connectTimeout: 500,
				ackTimeout: 500,
				maxOutboundConnections: 20,
				maxInboundConnections: 100,
				fixedPeers: [
					{
						ipAddress: '127.0.0.2',
						port: 5001,
					},
				],
				customNodeInfoSchema,
				nodeInfo: {
					chainID: Buffer.from('10000000', 'hex'),
					networkVersion: '1.1',
					nonce: 'nonce',
					advertiseAddress: true,
					options: {
						maxHeightPrevoted: '11',
						maxHeightPreviouslyForged: '1',
					},
				},
			});

			await firstNode.start();
		});

		afterEach(async () => {
			try {
				await firstNode.stop();
				// eslint-disable-next-line no-empty
			} catch (e) {}
		});

		it('should also include custom properties coming from the schema', () => {
			expect(Object.keys(firstNode.nodeInfo.options as any)).toIncludeAllMembers([
				'maxHeightPrevoted',
				'maxHeightPreviouslyForged',
			]);
		});

		it.skip('should get node status and peerInfo from another node including custom properties', async () => {
			const testNode = new P2P({
				port: 5002,
				seedPeers: [],
				connectTimeout: 500,
				ackTimeout: 500,
				fixedPeers: [
					{
						ipAddress: '127.0.0.1',
						port: 5001,
					},
				],
				maxOutboundConnections: 20,
				maxInboundConnections: 100,
				customNodeInfoSchema,
				nodeInfo: {
					chainID: Buffer.from('10000000', 'hex'),
					networkVersion: '1.1',
					nonce: 'nonce1',
					advertiseAddress: true,
					options: {
						maxHeightPrevoted: '11',
						maxHeightPreviouslyForged: '1',
					},
				},
			});

			await testNode.start();
			await wait(300);

			expect(Object.keys(firstNode.nodeInfo.options as any)).toIncludeAllMembers([
				'maxHeightPrevoted',
				'maxHeightPreviouslyForged',
			]);
			expect(Object.keys(testNode.nodeInfo.options as any)).toIncludeAllMembers([
				'maxHeightPrevoted',
				'maxHeightPreviouslyForged',
			]);
			// Test to check if nodeInfo received from the first node includes custom properties
			expect(Object.keys((testNode.getConnectedPeers()[0] as any).options)).toIncludeAllMembers([
				'maxHeightPrevoted',
				'maxHeightPreviouslyForged',
			]);
			// Test to check if peerInfo received from the first node includes custom properties
			expect(Object.keys((testNode.getConnectedPeers()[0] as any).options)).toIncludeAllMembers([
				'maxHeightPrevoted',
				'maxHeightPreviouslyForged',
			]);
			await testNode.stop();
		});
	});
});
