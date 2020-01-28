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
import { P2P, events, constants } from '../../src/index';
import { wait } from '../utils/helpers';
import cloneDeep = require('lodash.clonedeep');
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import { createNetwork, destroyNetwork } from '../utils/network_setup';

const { EVENT_CLOSE_OUTBOUND } = events;

const {
	INTENTIONAL_DISCONNECT_CODE,
	SEED_PEER_DISCONNECTION_REASON,
} = constants;

describe('Blacklisted/fixed/whitelisted peers', () => {
	const FIVE_CONNECTIONS = 5;
	const NETWORK_START_PORT = 5000;
	const previousPeers = [
		{
			ipAddress: '127.0.0.15',
			wsPort: NETWORK_START_PORT + 5,
			height: 10,
			version: '1.0',
			protocolVersion: '1.0',
			number: undefined,
		},
	];
	const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);

	beforeAll(async () => {
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

	afterAll(() => {
		SCServerSocket.prototype = serverSocketPrototypeBackup;
	});

	describe('blacklisting', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const blacklistedPeers = [
			{
				ipAddress: '127.0.0.15',
				wsPort: NETWORK_START_PORT + 5,
			},
		];
		const previousPeersBlacklisted = [
			{
				ipAddress: '127.0.0.15',
				wsPort: NETWORK_START_PORT + 5,
				height: 10,
				version: '1.0',
				protocolVersion: '1.0',
				number: undefined,
			},
		];

		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					wsPort: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				seedPeers: customSeedPeers(index, startPort, networkSize),
				blacklistedIPs: blacklistedPeers.map(p => p.ipAddress),
				fixedPeers: blacklistedPeers,
				whitelistedPeers: blacklistedPeers,
				previousPeers: previousPeersBlacklisted,
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should not add any blacklisted peer to newPeers', async () => {
			for (let p2p of p2pNodeList) {
				const newPeers = p2p['_peerBook'].newPeers;
				const newPeersIPWS = newPeers.map(peer => {
					return {
						ipAddress: peer.ipAddress,
						wsPort: peer.wsPort,
					};
				});
				expect(newPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should not add any blacklisted peer to triedPeers', async () => {
			for (let p2p of p2pNodeList) {
				const triedPeers = p2p['_peerBook'].triedPeers;
				const triedPeersIPWS = triedPeers.map(peer => {
					return {
						ipAddress: peer.ipAddress,
						wsPort: peer.wsPort,
					};
				});
				expect(triedPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should not connect to any blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
					return {
						ipAddress: peer.ipAddress,
						wsPort: peer.wsPort,
					};
				});
				expect(connectedPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should isolate the blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				if (
					(p2p as any)._nodeInfo.wsPort === blacklistedPeers[0].wsPort &&
					(p2p as any)._config.hostIp === blacklistedPeers[0].ipAddress
				) {
					const connectedPeers = (p2p as any)._peerPool.getConnectedPeers();
					expect(connectedPeers.length).toBe(0);
				}
			}
		});
	});

	describe('fixed', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents = new Array();

		const fixedPeers = [
			{
				ipAddress: '127.0.0.10',
				wsPort: NETWORK_START_PORT,
			},
		];
		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					wsPort: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
				maxOutboundConnections: FIVE_CONNECTIONS,
				maxInboundConnections: FIVE_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				fixedPeers: [
					...customSeedPeers(index, startPort, networkSize),
					...fixedPeers,
				],
				previousPeers,
			});

			p2pNodeList = await createNetwork({
				networkDiscoveryWaitTime: 1,
				customConfig,
			});

			p2pNodeList.forEach(p2p => {
				p2p.on(EVENT_CLOSE_OUTBOUND, msg => {
					if (
						msg.code === INTENTIONAL_DISCONNECT_CODE &&
						msg.reason === SEED_PEER_DISCONNECTION_REASON
					) {
						collectedEvents.push(msg.reason);
					}
				});
			});

			await wait(1000);
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('everyone but itself should have a permanent connection to the fixed peer', async () => {
			p2pNodeList.forEach((p2p, index) => {
				if (index != 0) {
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						};
					});
					expect(connectedPeersIPWS).toIncludeAllMembers(fixedPeers);
				}
			});
		});

		it('should not disconnect from fixed seed peers', async () => {
			expect(Object.keys(collectedEvents)).toHaveLength(0);
		});
	});

	describe('whitelisting', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];

		const whitelistedPeers = [
			{
				ipAddress: '127.0.0.10',
				wsPort: NETWORK_START_PORT,
			},
		];
		beforeEach(async () => {
			const customSeedPeers = (
				index: number,
				startPort: number,
				networkSize: number,
			) => [
				{
					ipAddress: '127.0.0.' + (((index + 1) % networkSize) + 10),
					wsPort: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			) => ({
				hostIp: '127.0.0.' + (index + 10),
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
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						};
					});
					expect(triedPeersIPWS).toIncludeAllMembers(whitelistedPeers);
				}
			});
		});

		it('should not be possible to ban them', async () => {
			const peerPenalty = {
				peerId: `${whitelistedPeers[0].ipAddress}:${whitelistedPeers[0].wsPort}`,
				penalty: 100,
			};

			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					p2p.applyPenalty(peerPenalty);
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						};
					});
					expect(connectedPeersIPWS).toIncludeAllMembers(whitelistedPeers);
				}
			});
		});
	});
});
