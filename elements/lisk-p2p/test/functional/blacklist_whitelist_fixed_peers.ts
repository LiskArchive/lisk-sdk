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
import { P2P } from '../../src/index';
import cloneDeep = require('lodash.clonedeep');
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import { createNetwork, destroyNetwork } from 'utils/network_setup';
import { constructPeerId } from '../../src/utils';

describe('blacklistedIPs/fixed/whitelisted peers', () => {
	const FIVE_CONNECTIONS = 5;
	const POPULATOR_INTERVAL_WITH_LIMIT = 10;
	const NETWORK_START_PORT = 5000;
	const previousPeers = [
		{
			id: `127.0.0.15:${NETWORK_START_PORT + 5}`,
			ipAddress: '127.0.0.15',
			sharedState: {
				wsPort: NETWORK_START_PORT + 5,
				advertiseAddress: true,
				height: 10,
				version: '1.0',
				protocolVersion: '1.0',
				number: undefined,
			},
		},
	];
	const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);

	before(async () => {
		const serverSocketPrototype = SCServerSocket.prototype as any;
		const realResetPongTimeoutFunction =
			serverSocketPrototype._resetPongTimeout;
		serverSocketPrototype._resetPongTimeout = function() {
			const queryObject = url.parse(this.request.url, true).query as any;
			let ipSuffix = queryObject.wsPort - 5000 + 10;
			this.remoteAddress = `127.0.0.${ipSuffix}`;
			return realResetPongTimeoutFunction.apply(this, arguments);
		};
	});

	after(async () => {
		SCServerSocket.prototype = serverSocketPrototypeBackup;
	});

	describe('blacklistedIPs', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const blacklistedIPs = ['127.0.0.15'];
		const previousPeersBlacklisted = [
			{
				id: `127.0.0.15:${NETWORK_START_PORT + 5}`,
				ipAddress: '127.0.0.15',
				sharedState: {
					wsPort: NETWORK_START_PORT + 5,
					advertiseAddress: true,
					height: 10,
					version: '1.0',
					protocolVersion: '1.0',
					number: undefined,
				},
			},
		];

		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					id: constructPeerId(
						'127.0.0.' + (((index + 1) % networkSize) + 10),
						startPort + ((index + 1) % networkSize),
					),
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					sharedState: {
						wsPort: startPort + ((index + 1) % networkSize),
						advertiseAddress: true,
						height: 10,
						version: '1.0',
						protocolVersion: '1.0',
						number: undefined,
					},
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
				maxOutboundConnections: FIVE_CONNECTIONS,
				maxInboundConnections: FIVE_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				blacklistedIPs,
				fixedPeers: previousPeersBlacklisted,
				whitelistedPeers: previousPeersBlacklisted,
				previousPeers: previousPeersBlacklisted,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should not add any blacklisted peer to newPeers', async () => {
			for (let p2p of p2pNodeList) {
				expect(
					(p2p as any)._peerBook.newPeers.map(
						(peer: { ipAddress: any }) => peer.ipAddress,
					),
				).not.to.include(blacklistedIPs);
			}
		});

		it('should not add any blacklisted peer to triedPeers', async () => {
			for (let p2p of p2pNodeList) {
				expect(p2p.getTriedPeers().map(peer => peer.ipAddress)).not.to.include(
					blacklistedIPs,
				);
			}
		});

		it('should not connect to any blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				expect(
					p2p.getConnectedPeers().map(peer => peer.ipAddress),
				).not.to.include(blacklistedIPs);
			}
		});

		it('should isolate the blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				if (p2p.sharedState.hostIp === blacklistedIPs[0]) {
					expect((p2p as any)._peerPool.getConnectedPeers().length).to.equal(0);
				}
			}
		});
	});

	describe('fixed', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];

		const fixedPeers = [
			{
				id: constructPeerId('127.0.0.10', NETWORK_START_PORT),
				ipAddress: '127.0.0.10',
				sharedState: {
					wsPort: NETWORK_START_PORT,
					advertiseAddress: true,
				},
			},
		];
		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					peerId: constructPeerId(
						'127.0.0.' + (((index + 1) % networkSize) + 10),
						startPort + ((index + 1) % networkSize),
					),
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					sharedState: {
						wsPort: startPort + ((index + 1) % networkSize),
						advertiseAddress: true,
					},
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
				maxOutboundConnections: FIVE_CONNECTIONS,
				maxInboundConnections: FIVE_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				fixedPeers,
				previousPeers,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('everyone but itself should have a permanent connection to the fixed peer', async () => {
			p2pNodeList.forEach((p2p, index) => {
				if (index != 0) {
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							id: peer.id,
							ipAddress: peer.ipAddress,
							sharedState: {
								wsPort: peer.sharedState.wsPort,
								advertiseAddress: true,
							},
						};
					});
					expect(connectedPeersIPWS).to.deep.include.members(fixedPeers);
				}
			});
		});
	});

	describe('whitelisting', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];

		const whitelistedPeers = [
			{
				id: `127.0.0.10:${NETWORK_START_PORT}`,
				ipAddress: '127.0.0.10',
				sharedState: {
					wsPort: NETWORK_START_PORT,
					advertiseAddress: true,
				},
			},
		];
		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					peerId: constructPeerId(
						'127.0.0.' + (((index + 1) % networkSize) + 10),
						startPort + ((index + 1) % networkSize),
					),
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					sharedState: {
						wsPort: startPort + ((index + 1) % networkSize),
						advertiseAddress: true,
					},
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
				maxOutboundConnections: FIVE_CONNECTIONS,
				maxInboundConnections: FIVE_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				whitelistedPeers,
				previousPeers,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should add every whitelisted peer to triedPeers', async () => {
			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					const triedPeers = p2p['_peerBook'].triedPeers;
					const triedPeersIPWS = triedPeers.map(peer => {
						return {
							id: peer.id,
							ipAddress: peer.ipAddress,
							sharedState: {
								wsPort: peer.sharedState.wsPort,
								advertiseAddress: true,
							},
						};
					});
					expect(triedPeersIPWS).to.deep.include.members(whitelistedPeers);
				}
			});
		});

		it('should not be possible to ban them', async () => {
			const peerPenalty = {
				peerId: `${whitelistedPeers[0].ipAddress}:${
					whitelistedPeers[0].sharedState.wsPort
				}`,
				penalty: 100,
			};

			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					p2p.applyPenalty(peerPenalty);
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							id: peer.id,
							ipAddress: peer.ipAddress,
							sharedState: {
								wsPort: peer.sharedState.wsPort,
								advertiseAddress: true,
							},
						};
					});
					expect(connectedPeersIPWS).to.deep.include.members(whitelistedPeers);
				}
			});
		});
	});
});
