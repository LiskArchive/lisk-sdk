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
import { wait } from '../utils/helpers';
import { platform } from 'os';
import cloneDeep = require('lodash.clonedeep');
import { SCServerSocket } from 'socketcluster-server';
import * as url from 'url';

describe('Blacklisted/fixed/whitelisted peers', () => {
	let p2pNodeList: ReadonlyArray<P2P> = [];
	const FIVE_CONNECTIONS = 5;
	const POPULATOR_INTERVAL_WITH_LIMIT = 10;
	const NETWORK_START_PORT = 5000;
	const NETWORK_PEER_COUNT = 10;
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

	before(async () => {
		sandbox.restore();
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

	describe('blacklisting', () => {
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
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = [
					{
						ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
					},
				];
				const nodePort = NETWORK_START_PORT + index;
				return new P2P({
					hostIp: '127.0.0.' + (index + 10),
					connectTimeout: 100,
					ackTimeout: 200,
					blacklistedPeers: blacklistedPeers,
					seedPeers,
					fixedPeers: blacklistedPeers,
					whitelistedPeers: blacklistedPeers,
					previousPeers: previousPeersBlacklisted,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
					maxOutboundConnections: FIVE_CONNECTIONS,
					maxInboundConnections: FIVE_CONNECTIONS,
					nodeInfo: {
						wsPort: nodePort,
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.1',
						protocolVersion: '1.0.1',
						minVersion: '1.0.0',
						os: platform(),
						height: 0,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
					},
				});
			});
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1000);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(1000);
		});

		it('should not add any blacklisted peer to newPeers', async () => {
			for (let p2p of p2pNodeList) {
				const newPeers = p2p['_peerBook'].newPeers;
				const newPeersIPWS = newPeers.map(peer => {
					return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
				});
				expect(newPeersIPWS).not.to.deep.include.members(blacklistedPeers);
			}
		});

		it('should not add any blacklisted peer to triedPeers', async () => {
			for (let p2p of p2pNodeList) {
				const triedPeers = p2p['_peerBook'].triedPeers;
				const triedPeersIPWS = triedPeers.map(peer => {
					return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
				});
				expect(triedPeersIPWS).not.to.deep.include.members(blacklistedPeers);
			}
		});

		it('should not connect to any blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
					return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
				});
				expect(connectedPeersIPWS).not.to.deep.include.members(
					blacklistedPeers,
				);
			}
		});

		it('should isolate the blacklisted peer', async () => {
			for (let p2p of p2pNodeList) {
				if (
					p2p['_nodeInfo'].wsPort === blacklistedPeers[0].wsPort &&
					p2p['_config'].hostIp === blacklistedPeers[0].ipAddress
				) {
					const connectedPeers = p2p['_peerPool'].getConnectedPeers();
					expect(connectedPeers.length).to.equal(0);
				}
			}
		});
	});

	describe('fixed', () => {
		const fixedPeers = [
			{
				ipAddress: '127.0.0.10',
				wsPort: NETWORK_START_PORT,
			},
		];
		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = [
					{
						ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
					},
				];
				const nodePort = NETWORK_START_PORT + index;
				return new P2P({
					hostIp: '127.0.0.' + (index + 10),
					connectTimeout: 100,
					ackTimeout: 200,
					seedPeers,
					fixedPeers,
					previousPeers,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
					maxOutboundConnections: FIVE_CONNECTIONS,
					maxInboundConnections: FIVE_CONNECTIONS,
					nodeInfo: {
						wsPort: nodePort,
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.1',
						protocolVersion: '1.0.1',
						minVersion: '1.0.0',
						os: platform(),
						height: 0,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
					},
				});
			});
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1000);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(1000);
		});

		it('everyone but itself should have a permanent connection to the fixed peer', async () => {
			p2pNodeList.forEach((p2p, index) => {
				if (index != 0) {
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(connectedPeersIPWS).to.deep.include.members(fixedPeers);
				}
			});
		});
	});

	describe('whitelisting', () => {
		const whitelistedPeers = [
			{
				ipAddress: '127.0.0.10',
				wsPort: NETWORK_START_PORT,
			},
		];
		beforeEach(async () => {
			p2pNodeList = [...new Array(NETWORK_PEER_COUNT).keys()].map(index => {
				// Each node will have the previous node in the sequence as a seed peer except the first node.
				const seedPeers = [
					{
						ipAddress: '127.0.0.' + (((index + 1) % NETWORK_PEER_COUNT) + 10),
						wsPort: NETWORK_START_PORT + ((index + 1) % NETWORK_PEER_COUNT),
					},
				];
				const nodePort = NETWORK_START_PORT + index;
				return new P2P({
					hostIp: '127.0.0.' + (index + 10),
					connectTimeout: 100,
					ackTimeout: 200,
					seedPeers,
					whitelistedPeers,
					wsEngine: 'ws',
					populatorInterval: POPULATOR_INTERVAL_WITH_LIMIT,
					maxOutboundConnections: FIVE_CONNECTIONS,
					maxInboundConnections: FIVE_CONNECTIONS,
					nodeInfo: {
						wsPort: nodePort,
						nethash:
							'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
						version: '1.0.1',
						protocolVersion: '1.0.1',
						minVersion: '1.0.0',
						os: platform(),
						height: 0,
						broadhash:
							'2768b267ae621a9ed3b3034e2e8a1bed40895c621bbb1bbd613d92b9d24e54b5',
						nonce: `O2wTkjqplHII${nodePort}`,
					},
				});
			});
			await Promise.all(p2pNodeList.map(async p2p => await p2p.start()));
			await wait(1000);
		});

		afterEach(async () => {
			await Promise.all(
				p2pNodeList
					.filter(p2p => p2p.isActive)
					.map(async p2p => await p2p.stop()),
			);
			await wait(1000);
		});

		it('should add every whitelisted peer to triedPeers', async () => {
			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					const triedPeers = p2p['_peerBook'].triedPeers;
					const triedPeersIPWS = triedPeers.map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(triedPeersIPWS).to.deep.include.members(whitelistedPeers);
				}
			});
		});

		it('should not be possible to ban them', async () => {
			const peerPenalty = {
				peerId: `${whitelistedPeers[0].ipAddress}:${
					whitelistedPeers[0].wsPort
				}`,
				penalty: 100,
			};

			p2pNodeList.forEach((p2p, index) => {
				if (![0, 9].includes(index)) {
					p2p.applyPenalty(peerPenalty);
					const connectedPeersIPWS = p2p.getConnectedPeers().map(peer => {
						return { ipAddress: peer.ipAddress, wsPort: peer.wsPort };
					});
					expect(connectedPeersIPWS).to.deep.include.members(whitelistedPeers);
				}
			});
		});
	});
});
