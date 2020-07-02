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
import { customPeerInfoSchema, customNodeInfoSchema } from '../utils/schema';

describe('p2p', () => {
	let p2pNode: P2P;

	const generatedPeers = [...Array(10).keys()].map(i => ({
		ipAddress: `120.0.0.${i}`,
		port: 5000 + i,
	}));

	beforeEach(async () => {
		p2pNode = new P2P({
			port: 5000,
			seedPeers: [],
			blacklistedIPs: generatedPeers.slice(6).map(peer => peer.ipAddress),
			fixedPeers: generatedPeers.slice(0, 6),
			whitelistedPeers: generatedPeers.slice(2, 3),
			previousPeers: generatedPeers.slice(4, 5),
			connectTimeout: 5000,
			maxOutboundConnections: 20,
			maxInboundConnections: 100,
			nodeInfo: {
				networkId:
					'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
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

		it('should reject at multiple start attempt', async () => {
			await expect(p2pNode.start()).rejects.toThrow();
		});

		it('should reject at multiple stop attempt', async () => {
			await p2pNode.stop();
			await expect(p2pNode.stop()).rejects.toThrow();
		});
	});

	describe('when custom schema is passed', () => {
		let firstNode: P2P;
		// console.log((mergeCustomSchema(peerInfoSchema, customPeerInfoSchema).properties as any).options)
		const customRPCSchemas = {
			peerInfo: customPeerInfoSchema,
			nodeInfo: customNodeInfoSchema,
		};

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
				customRPCSchemas,
				nodeInfo: {
					networkId:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
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
			expect(
				Object.keys(firstNode.nodeInfo.options as any),
			).toIncludeAllMembers(['maxHeightPrevoted', 'maxHeightPreviouslyForged']);
		});

		it('should get node status and peerInfo from another node including custom properties', async () => {
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
				customRPCSchemas,
				nodeInfo: {
					networkId:
						'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
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

			expect(
				Object.keys(firstNode.nodeInfo.options as any),
			).toIncludeAllMembers(['maxHeightPrevoted', 'maxHeightPreviouslyForged']);
			expect(
				Object.keys(testNode.nodeInfo.options as any),
			).toIncludeAllMembers(['maxHeightPrevoted', 'maxHeightPreviouslyForged']);
			// Test to check if nodeInfo received from the first node includes custom properties
			expect(
				Object.keys((testNode.getConnectedPeers()[0] as any).options),
			).toIncludeAllMembers(['maxHeightPrevoted', 'maxHeightPreviouslyForged']);
			// Test to check if peerInfo received from the first node includes custom properties
			expect(
				Object.keys((testNode.getConnectedPeers()[0] as any).options),
			).toIncludeAllMembers(['maxHeightPrevoted', 'maxHeightPreviouslyForged']);
			await testNode.stop();
		});
	});
});
