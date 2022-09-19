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
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';
import { P2P, events, constants } from '../../src/index';
import { wait } from '../utils/helpers';
import { createNetwork, destroyNetwork } from '../utils/network_setup';
import { P2PConfig } from '../../src/types';
import { InboundPeer } from '../../src/peer';
// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

const { EVENT_CLOSE_OUTBOUND } = events;

const { INTENTIONAL_DISCONNECT_CODE, SEED_PEER_DISCONNECTION_REASON } = constants;

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Blacklisted/fixed/whitelisted peers', () => {
	const FIVE_CONNECTIONS = 5;
	const NETWORK_START_PORT = 5000;
	const previousPeers = [
		{
			ipAddress: '127.0.0.15',
			port: NETWORK_START_PORT + 5,
			networkVersion: '1.0',
			number: undefined,
		},
	];
	const serverSocketPrototypeBackup = cloneDeep(SCServerSocket.prototype);

	beforeAll(() => {
		const serverSocketPrototype = SCServerSocket.prototype as any;
		const realResetPongTimeoutFunction = serverSocketPrototype._resetPongTimeout;
		// eslint-disable-next-line func-names
		serverSocketPrototype._resetPongTimeout = function () {
			const queryObject = url.parse(this.request.url, true).query as any;
			const ipSuffix = queryObject.port - 5000 + 10;
			this.remoteAddress = `127.0.0.${ipSuffix}`;
			// eslint-disable-next-line prefer-rest-params
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
				port: NETWORK_START_PORT + 5,
			},
		];
		const previousPeersBlacklisted = [
			{
				ipAddress: '127.0.0.15',
				port: NETWORK_START_PORT + 5,
				height: 10,
				version: '1.0',
				networkVersion: '1.0',
				number: undefined,
			},
		];

		beforeEach(async () => {
			const customSeedPeers = (index: number, startPort: number, networkSize: number) => [
				{
					ipAddress: `127.0.0.${((index + 1) % networkSize) + 10}`,
					port: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (index: number, startPort: number, networkSize: number) => ({
				hostIp: `127.0.0.${index + 10}`,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				blacklistedIPs: blacklistedPeers.map(p => p.ipAddress),
				fixedPeers: blacklistedPeers,
				whitelistedPeers: blacklistedPeers,
				previousPeers: previousPeersBlacklisted,
			});

			p2pNodeList = await createNetwork({ customConfig, networkSize: 4 });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
		});

		it('should not add any blacklisted peer to newPeers', () => {
			for (const p2p of p2pNodeList) {
				const { newPeers } = p2p['_peerBook'];
				const newPeersIPWS = newPeers.map(peer => {
					return {
						ipAddress: peer.ipAddress,
						port: peer.port,
					};
				});
				expect(newPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should not add any blacklisted peer to triedPeers', () => {
			for (const p2p of p2pNodeList) {
				const { triedPeers } = p2p['_peerBook'];
				const triedPeersIPWS = triedPeers.map(peer => {
					return {
						ipAddress: peer.ipAddress,
						port: peer.port,
					};
				});
				expect(triedPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should not connect to any blacklisted peer', () => {
			for (const p2p of p2pNodeList) {
				const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
					return {
						ipAddress: peer.ipAddress,
						port: peer.port,
					};
				});
				expect(connectedPeersIPWS).not.toEqual(blacklistedPeers);
			}
		});

		it('should isolate the blacklisted peer', () => {
			for (const p2p of p2pNodeList) {
				if (
					(p2p as any)._nodeInfo.port === blacklistedPeers[0].port &&
					(p2p as any)._config.hostIp === blacklistedPeers[0].ipAddress
				) {
					const connectedPeers = (p2p as any)._peerPool.getConnectedPeers();
					expect(connectedPeers).toHaveLength(0);
				}
			}
		});
	});

	describe('fixed', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		const collectedEvents: any[] = [];

		const fixedPeers = [
			{
				ipAddress: '127.0.0.10',
				port: NETWORK_START_PORT,
			},
		];
		beforeEach(async () => {
			const customSeedPeers = (index: number, startPort: number, networkSize: number) => [
				{
					ipAddress: `127.0.0.${((index + 1) % networkSize) + 10}`,
					port: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (index: number, startPort: number, networkSize: number) => ({
				hostIp: `127.0.0.${index + 10}`,
				maxOutboundConnections: FIVE_CONNECTIONS,
				maxInboundConnections: FIVE_CONNECTIONS,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				fixedPeers: [...customSeedPeers(index, startPort, networkSize), ...fixedPeers],
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

		it('everyone but itself should have a permanent connection to the fixed peer', () => {
			p2pNodeList.forEach((p2p, index) => {
				if (index !== 0) {
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							ipAddress: peer.ipAddress,
							port: peer.port,
						};
					});
					expect(connectedPeersIPWS).toIncludeAllMembers(fixedPeers);
				}
			});
		});

		it('should not disconnect from fixed seed peers', () => {
			expect(Object.keys(collectedEvents)).toHaveLength(0);
		});
	});

	describe('whitelisting', () => {
		let p2pNodeList: ReadonlyArray<P2P> = [];
		let testPeer: P2P;

		const whitelistedPeers = [
			{
				ipAddress: '127.0.0.10',
				port: NETWORK_START_PORT,
			},
		];

		beforeEach(async () => {
			const customSeedPeers = (index: number, startPort: number, networkSize: number) => [
				{
					ipAddress: `127.0.0.${((index + 1) % networkSize) + 10}`,
					port: startPort + ((index + 1) % networkSize),
				},
			];

			const customConfig = (
				index: number,
				startPort: number,
				networkSize: number,
			): Partial<P2PConfig> => ({
				hostIp: `127.0.0.${index + 10}`,
				seedPeers: customSeedPeers(index, startPort, networkSize),
				whitelistedPeers,
				previousPeers,
				maxInboundConnections: index === 1 ? 1 : 20, // Second node only accepts one incoming connection
			});

			p2pNodeList = await createNetwork({ customConfig });
		});

		afterEach(async () => {
			await destroyNetwork(p2pNodeList);
			if (testPeer?.isActive) {
				await testPeer.stop();
			}
		});

		it('should add every whitelisted peer to triedPeers', () => {
			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					const { triedPeers } = p2p['_peerBook'];
					const triedPeersIPWS = triedPeers.map(peer => {
						return {
							ipAddress: peer.ipAddress,
							port: peer.port,
						};
					});
					expect(triedPeersIPWS).toIncludeAllMembers(whitelistedPeers);
				}
			});
		});

		it('should not be possible to ban them', () => {
			const peerPenalty = {
				peerId: `${whitelistedPeers[0].ipAddress}:${whitelistedPeers[0].port}`,
				penalty: 100,
			};

			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					p2p.applyPenalty(peerPenalty);
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return {
							ipAddress: peer.ipAddress,
							port: peer.port,
						};
					});
					expect(connectedPeersIPWS).toIncludeAllMembers(whitelistedPeers);
				}
			});
		});

		it('should allow connection from whitelisted peer even when incoming slots are full', async () => {
			const firstWhitelistNode = p2pNodeList[0];
			const secondNode = p2pNodeList[1];
			expect(secondNode.getConnectedPeers().map(p => p.ipAddress)).toContain(
				firstWhitelistNode.config.hostIp,
			);

			// Stop the node
			await firstWhitelistNode.stop();
			await wait(100);

			expect(secondNode['_peerPool'].getPeers(InboundPeer).map(p => p.ipAddress)).not.toContain(
				firstWhitelistNode.config.hostIp,
			);
			expect(secondNode.getConnectedPeers().map(p => p.ipAddress)).not.toContain(
				firstWhitelistNode.config.hostIp,
			);

			const nodeInfoConstants = {
				chainID: Buffer.from('10000000', 'hex'),
				version: '1.0.1',
				networkVersion: '1.1',
				minVersion: '1.0.0',
				os: 'darwin',
				height: 0,
				nonce: 'O2wTkjqplHII',
			};

			testPeer = new P2P({
				fixedPeers: [
					{
						ipAddress: secondNode.config.hostIp as string,
						port: secondNode.config.port,
					},
				],
				port: 5015,
				nodeInfo: {
					...nodeInfoConstants,
					advertiseAddress: true,
					options: {},
				},
			});

			// Start a new node to connect to the second node to full the slot
			await testPeer.start();
			await wait(100);
			expect(testPeer.getConnectedPeers().map(p => p.ipAddress)).toContain(
				secondNode.config.hostIp,
			);

			// Start the first node again that is whitelisted in the second node
			firstWhitelistNode['_populatorIntervalId'] = undefined;
			await firstWhitelistNode.start();

			await wait(100);

			// Whitelisted first node should be able to connect back to second node even when the slot is full
			expect(secondNode.getConnectedPeers().map(p => p.ipAddress)).toContain(
				firstWhitelistNode.config.hostIp,
			);
		});
	});
});
