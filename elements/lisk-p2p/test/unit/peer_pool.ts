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
	PeerPool,
	PROTECT_BY,
	PROTECTION_CATEGORY,
	filterPeersByCategory,
} from '../../src/peer_pool';
import {
	selectPeersForConnection,
	selectPeersForRequest,
	selectPeersForSend,
} from '../../src/utils';
// For stubbing
import { P2PPeerInfo, P2PNodeInfo } from '../../src/p2p_types';
import { initPeerList } from '../utils/peers';
import {
	Peer,
	ConnectionState,
	InboundPeer,
	OutboundPeer,
} from '../../src/peer';
import {
	DEFAULT_CONNECT_TIMEOUT,
	DEFAULT_ACK_TIMEOUT,
	DEFAULT_WS_MAX_PAYLOAD,
	DEFAULT_BAN_TIME,
	DEFAULT_MAX_OUTBOUND_CONNECTIONS,
	DEFAULT_MAX_INBOUND_CONNECTIONS,
	DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
	DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
	DEFAULT_PEER_PROTECTION_FOR_LATENCY,
	DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
	DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
	DEFAULT_RANDOM_SECRET,
	INTENTIONAL_DISCONNECT_CODE,
	DEFAULT_SEND_PEER_LIMIT,
	PeerKind,
	DEFAULT_WS_MAX_MESSAGE_RATE,
} from '../../src/constants';
import { constructPeerId } from '../../src/utils';
import { errors } from '../../src';

const { RequestFailError, SendFailError } = errors;

describe('peerPool', () => {
	const peerPoolConfig = {
		connectTimeout: DEFAULT_CONNECT_TIMEOUT,
		ackTimeout: DEFAULT_ACK_TIMEOUT,
		peerSelectionForConnection: selectPeersForConnection,
		peerSelectionForRequest: selectPeersForRequest,
		peerSelectionForSend: selectPeersForSend,
		sendPeerLimit: DEFAULT_SEND_PEER_LIMIT,
		wsMaxPayload: DEFAULT_WS_MAX_PAYLOAD,
		wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
		wsMaxMessageRatePenalty: 10,
		rateCalculationInterval: 1000,
		peerBanTime: DEFAULT_BAN_TIME,
		maxOutboundConnections: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
		maxInboundConnections: DEFAULT_MAX_INBOUND_CONNECTIONS,
		outboundShuffleInterval: DEFAULT_OUTBOUND_SHUFFLE_INTERVAL,
		netgroupProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_NETGROUP,
		latencyProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_LATENCY,
		productivityProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_USEFULNESS,
		longevityProtectionRatio: DEFAULT_PEER_PROTECTION_FOR_LONGEVITY,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
		secret: DEFAULT_RANDOM_SECRET,
		peerLists: {
			blacklistedIPs: [],
			fixedPeers: [],
			previousPeers: [],
			seedPeers: [
				{
					ipAddress: '127.0.0.1',
					wsPort: 5000,
				},
			] as Array<P2PPeerInfo>,
			whitelisted: [],
		},
	};
	let peerPool: PeerPool;
	let peerInfo: P2PPeerInfo;
	let nodeInfo: P2PNodeInfo;
	let peerId: string;
	let peerObject: any;
	let messagePacket: any;
	let requestPacket: any;

	beforeEach(async () => {
		jest.useFakeTimers();
		peerPool = new PeerPool(peerPoolConfig);
		peerId = '127.0.0.1:5000';
		peerInfo = {
			ipAddress: '127.0.0.1',
			wsPort: 5000,
			peerId: constructPeerId('127.0.0.1', 5000),
			sharedState: {
				height: 1,
				updatedAt: new Date(),
				version: '1.0.1',
				protocolVersion: '1.0.1',
			},
		};
		nodeInfo = {
			os: 'darwin',
			version: '1.1',
			protocolVersion: '1.0.1',
			networkId: 'abc',
			wsPort: 5000,
			height: 1000,
			nonce: 'nonce',
			advertiseAddress: true,
		};
		requestPacket = { procedure: 'abc', data: 'abc' };
		messagePacket = { ...requestPacket, event: 'abc' };
		peerObject = {
			...peerInfo,
			id: peerId,
			send: jest.fn(),
			request: jest.fn(),
			connect: jest.fn(),
			applyPenalty: jest.fn(),
			disconnect: jest.fn(),
			removeListener: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
			emit: jest.fn(),
			destroy: jest.fn(),
		} as any;
		peerPool.emit = jest.fn();
	});

	afterEach(async () => {
		jest.clearAllTimers();
	});

	describe('#constructor', () => {
		it('should be an object and instance of PeerPool', async () => {
			expect(peerPool).toBeInstanceOf(PeerPool);
		});

		it('should have a _peerMap property which is a Map and _peerPoolConfig property which is set to the value specified in the constructor', async () => {
			expect(peerPool).toMatchObject({
				_peerMap: expect.any(Map),
				_peerPoolConfig: peerPoolConfig,
			});
		});

		it('should have a _peerConfig property which is set to the value specified in the constructor', async () => {
			const actualConfig = { ...(peerPool as any)._peerConfig };
			const expectedConfig = {
				connectTimeout: peerPoolConfig.connectTimeout,
				ackTimeout: peerPoolConfig.ackTimeout,
				wsMaxMessageRate: peerPoolConfig.wsMaxMessageRate,
				wsMaxMessageRatePenalty: peerPoolConfig.wsMaxMessageRatePenalty,
				maxPeerDiscoveryResponseLength:
					peerPoolConfig.maxPeerDiscoveryResponseLength,
				rateCalculationInterval: peerPoolConfig.rateCalculationInterval,
				wsMaxPayload: peerPoolConfig.wsMaxPayload,
				maxPeerInfoSize: peerPoolConfig.maxPeerInfoSize,
				secret: peerPoolConfig.secret,
			};

			expect(actualConfig).toEqual(expectedConfig);
		});

		it('should have all Config properties', async () => {
			expect(peerPool).toMatchObject({
				_peerSelectForSend: peerPoolConfig.peerSelectionForSend,
				_peerSelectForRequest: peerPoolConfig.peerSelectionForRequest,
				_peerSelectForConnection: peerPoolConfig.peerSelectionForConnection,
				_maxOutboundConnections: peerPoolConfig.maxOutboundConnections,
				_maxInboundConnections: peerPoolConfig.maxInboundConnections,
				_sendPeerLimit: peerPoolConfig.sendPeerLimit,
				_outboundShuffleIntervalId: expect.any(Object),
			});
		});
	});

	describe('#applyNodeInfo', () => {
		it('should set _nodeInfo', async () => {
			peerPool.applyNodeInfo(nodeInfo);

			expect(peerPool.nodeInfo).toBe(nodeInfo);
		});

		it('should call getPeers', async () => {
			const getPeersStub = jest.spyOn(peerPool, 'getPeers');
			peerPool.applyNodeInfo(nodeInfo);

			expect(getPeersStub).toBeCalled;
		});

		it('should call _applyNodeInfoOnPeer for each peer in peerMap', async () => {
			jest.spyOn(peerPool as any, '_applyNodeInfoOnPeer');

			expect((peerPool as any)._applyNodeInfoOnPeer).toBeCalledTimes(
				peerPool.getPeers().length,
			);
		});
	});

	describe('#request', () => {
		it('should call getAllConnectedPeerInfos(OutboundPeer)', async () => {
			jest.spyOn(peerPool, 'requestFromPeer');

			jest
				.spyOn(peerPool, 'getAllConnectedPeerInfos')
				.mockReturnValue([peerInfo]);

			try {
				await peerPool.request(requestPacket);
			} catch (e) {
				expect(peerPool.getAllConnectedPeerInfos).toBeCalled;
			}
		});

		it('should call _peerSelectForRequest', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);

			jest.spyOn(peerPool, 'requestFromPeer');

			const peers = peerPool.getAllConnectedPeerInfos(OutboundPeer);
			const _peerSelectForRequestStub = jest
				.spyOn(peerPool as any, '_peerSelectForRequest')
				.mockReturnValue([peerInfo]);

			await peerPool.request(requestPacket);

			expect(_peerSelectForRequestStub).toHaveBeenCalledWith({
				peers,
				nodeInfo: peerPool.nodeInfo,
				peerLimit: 1,
				requestPacket,
			});
		});

		it('should throw error if no peers selected', async () => {
			jest.spyOn(peerPool as any, '_peerSelectForRequest').mockReturnValue([]);

			return expect(peerPool.request(requestPacket)).rejects.toThrow(
				RequestFailError,
			);
		});

		it('should call requestFromPeer', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);

			const requestFromPeerStub = jest.spyOn(peerPool, 'requestFromPeer');

			jest
				.spyOn(peerPool as any, '_peerSelectForRequest')
				.mockReturnValue([peerInfo]);

			await peerPool.request(requestPacket);

			expect(requestFromPeerStub).toBeCalled;
		});
	});

	describe('#send', () => {
		let _peerSelectForSendStub: any;
		let sendToPeer: any;

		beforeEach(async () => {
			_peerSelectForSendStub = jest
				.spyOn(peerPool as any, '_peerSelectForSend')
				.mockReturnValue([peerInfo]);
			sendToPeer = jest.spyOn(peerPool, 'sendToPeer');
		});

		it('should call _peerSelectForSend', async () => {
			await peerPool.send(messagePacket);

			expect(_peerSelectForSendStub).toBeCalled;
		});

		it('should call sendToPeer for each selected peer', async () => {
			await peerPool.send(messagePacket);

			expect(sendToPeer).toHaveBeenCalledWith(
				messagePacket,
				constructPeerId(peerInfo.ipAddress, peerInfo.wsPort),
			);
		});

		it(`should emit event if sendToPeer fails`, async () => {
			sendToPeer = jest.spyOn(peerPool, 'sendToPeer').mockImplementation(() => {
				throw new Error();
			});

			try {
				await peerPool.send(1 as any);
			} catch (error) {
				expect(peerPool.emit).toBeCalled;
			}
		});
	});

	describe('#requestFromPeer', () => {
		it('should throw error if no peers in peerPool', async () => {
			(peerPool as any)._peerMap = new Map();

			return expect(
				peerPool.requestFromPeer(requestPacket, peerId),
			).rejects.toThrow(RequestFailError);
		});

		it('should call peer request with packet', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);
			await peerPool.requestFromPeer(requestPacket, peerId);

			expect(peerObject.request).toHaveBeenCalledWith(requestPacket);
		});
	});

	describe('#sendToPeer', () => {
		it('should throw error if no peers in peerPool', async () => {
			(peerPool as any)._peerMap = new Map();

			expect(() => peerPool.sendToPeer(messagePacket, peerId)).toThrowError(
				SendFailError,
			);
		});

		it('should call peer send with message packet', async () => {
			const peerStub = {
				send: jest.fn(),
			};
			(peerPool as any)._peerMap = new Map([[peerId, peerStub]]);
			await peerPool.sendToPeer(messagePacket, peerId);

			expect(peerStub.send).toHaveBeenCalledWith(messagePacket);
		});
	});

	describe('#discoverFromSeedPeers', () => {
		beforeEach(async () => {
			(peerPool['_addOutboundPeer'] as any) = jest
				.fn()
				.mockReturnValue(true as boolean);

			jest.spyOn(peerPool, 'getPeersCountPerKind').mockReturnValue({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.discoverFromSeedPeers();
		});

		it('should call _addOutboundPeer with Seed Peer', async () => {
			expect(peerPool['_addOutboundPeer']).toBeCalled;
		});
	});

	describe('#triggerNewConnections', () => {
		beforeEach(async () => {
			(peerPool['_peerSelectForConnection'] as any) = jest
				.fn()
				.mockReturnValue([] as ReadonlyArray<P2PPeerInfo>);
			jest.spyOn(peerPool, 'getPeersCountPerKind').mockReturnValue({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.triggerNewConnections([], []);
		});

		it('should call _peerSelectForConnection with all the necessary options', async () => {
			expect(peerPool['_peerSelectForConnection']).toHaveBeenCalledWith({
				newPeers: [],
				triedPeers: [],
				nodeInfo: peerPool.nodeInfo,
				peerLimit: DEFAULT_MAX_OUTBOUND_CONNECTIONS,
			});
		});
	});

	describe('#addInboundPeer', () => {
		let getPeersStub: any;

		beforeEach(async () => {
			getPeersStub = jest
				.spyOn(peerPool, 'getPeers')
				.mockReturnValue([peerObject]);
		});

		it('should call getPeers with InboundPeer class', async () => {
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(getPeersStub).toHaveBeenCalledWith(InboundPeer);
		});

		it('should call _evictPeer if max inbound connections reached', async () => {
			(peerPool as any)._maxInboundConnections = 0;
			jest.spyOn(peerPool as any, '_evictPeer').mockImplementation(() => {});
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect((peerPool as any)._evictPeer).toHaveBeenCalledWith(InboundPeer);
		});

		it('should add peer to peerMap', async () => {
			(peerPool as any)._peerMap = new Map([]);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect((peerPool as any)._peerMap.has(peerId)).toBeDefined();
		});

		it('should call _bindHandlersToPeer', async () => {
			let _bindHandlersToPeerStub = jest.spyOn(
				peerPool as any,
				'_bindHandlersToPeer',
			);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(_bindHandlersToPeerStub).toBeCalled;
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', async () => {
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				protocolVersion: '1.0.1',
				version: '1.1',
			};
			let _applyNodeInfoOnPeerStub = jest.spyOn(
				peerPool as any,
				'_applyNodeInfoOnPeer',
			);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(_applyNodeInfoOnPeerStub).toBeCalled;
		});

		it('should return peer object', async () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(peer).toBeDefined();
		});
	});

	describe('#_addOutboundPeer', () => {
		let hasPeerStub: any;
		let getPeersStub: any;
		let _bindHandlersToPeerStub: any;

		beforeEach(async () => {
			hasPeerStub = jest.spyOn(peerPool, 'hasPeer').mockReturnValue(true);

			getPeersStub = jest
				.spyOn(peerPool, 'getPeers')
				.mockReturnValue([] as Peer[]);
		});

		it('should call hasPeer with peerId', async () => {
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(hasPeerStub).toHaveBeenCalledWith(peerId);
		});

		it('should call getAllConnectedPeerInfos with OutboundPeer', async () => {
			hasPeerStub.mockReturnValue(false);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(getPeersStub).toBeCalled;
		});

		it('should add peer to peerMap', async () => {
			(peerPool as any)._peerMap = new Map([]);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect((peerPool as any)._peerMap.has(peerId)).toBeDefined();
		});

		it('should call _bindHandlersToPeer', async () => {
			hasPeerStub.mockReturnValue(false);
			getPeersStub.mockReturnValue([]);
			_bindHandlersToPeerStub = jest.spyOn(
				peerPool as any,
				'_bindHandlersToPeer',
			);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(_bindHandlersToPeerStub).toBeCalled;
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', async () => {
			hasPeerStub.mockReturnValue(false);
			getPeersStub.mockReturnValue([]);
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				protocolVersion: '1.0.1',
				version: '1.1',
			};
			let _applyNodeInfoOnPeerStub = jest.spyOn(
				peerPool as any,
				'_applyNodeInfoOnPeer',
			);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(_applyNodeInfoOnPeerStub).toBeCalled;
		});

		it('should return peer object', async () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(peer).toBeDefined();
		});
	});

	describe('#getPeersCountPerKind', () => {
		beforeEach(async () => {
			(peerPool as any)._addOutboundPeer(peerObject as any);
		});

		it('should return an object with outboundCount and inboundCount', async () => {
			const peerCount = peerPool.getPeersCountPerKind();
			expect(peerCount).toHaveProperty('outboundCount', 1);
			expect(peerCount).toHaveProperty('inboundCount', 0);
		});
	});

	describe('#removeAllPeers', () => {
		let removePeerStub: any;

		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
			removePeerStub = jest.spyOn(peerPool, 'removePeer');
		});

		it('should call removePeer for all peers in peerMap', async () => {
			peerPool.removeAllPeers();

			expect(removePeerStub).toHaveBeenCalledWith(
				peerId,
				INTENTIONAL_DISCONNECT_CODE,
				`Intentionally removed peer ${peerId}`,
			);
		});
	});

	describe('#getPeers', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should return peers by kind', async () => {
			const inboundPeers = peerPool.getPeers(Object as any);

			expect(inboundPeers).toHaveLength(1);
		});
	});

	describe('#getAllConnectedPeerInfos', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				Object.defineProperty(peerList[0] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[1] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[2] as any, 'state', {
					get: jest.fn(() => ConnectionState.CLOSED),
					set: jest.fn(),
				});

				jest
					.spyOn(peerPool, 'getConnectedPeers')
					.mockReturnValue(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);

				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(
					activePeersInfoList,
				);
			});
		});

		describe('when there are some active peers in inbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				Object.defineProperty(peerList[0] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[1] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[2] as any, 'state', {
					get: jest.fn(() => ConnectionState.CLOSED),
					set: jest.fn(),
				});

				jest
					.spyOn(peerPool, 'getConnectedPeers')
					.mockReturnValue(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);

				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in inbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(
					activePeersInfoList,
				);
			});
		});

		describe('when there are some active peers in outbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				Object.defineProperty(peerList[0] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[1] as any, 'state', {
					get: jest.fn(() => ConnectionState.OPEN),
					set: jest.fn(),
				});
				Object.defineProperty(peerList[2] as any, 'state', {
					get: jest.fn(() => ConnectionState.CLOSED),
					set: jest.fn(),
				});

				jest
					.spyOn(peerPool, 'getConnectedPeers')
					.mockReturnValue(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);

				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in outbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(
					activePeersInfoList,
				);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();

			beforeEach(async () => {
				peerList.forEach(peer => {
					Object.defineProperty(peer as any, 'state', {
						get: jest.fn(() => ConnectionState.CLOSED),
						set: jest.fn(),
					});
				});

				jest
					.spyOn(peerPool, 'getConnectedPeers')
					.mockReturnValue(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
			});

			it('should return an empty array', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual([]);
			});
		});
	});

	describe('#getConnectedPeers', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				peerList.forEach((peer, i) => {
					(peerPool as any)._peerMap.set(
						`${peer.peerInfo.ipAddress}:${peer.peerInfo.wsPort}`,
						{
							peerInfo: { ...peer.peerInfo },
							state: i % 2 ? ConnectionState.OPEN : ConnectionState.CLOSED,
						},
					);
				});
				activePeersInfoList = [peerList[1], peerList[3]].map(
					peer => peer.peerInfo,
				);
			});

			it('should return active peers', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).toEqual(
					activePeersInfoList,
				);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();

			beforeEach(async () => {
				peerList.forEach(peer => {
					(peerPool as any)._peerMap.set(
						`${peer.peerInfo.ipAddress}:${peer.peerInfo.wsPort}`,
						{ peerInfo: { ...peer.peerInfo }, state: ConnectionState.CLOSED },
					);
				});
			});

			it('should return an empty array', async () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).toEqual(
					[],
				);
			});
		});
	});

	describe('#getPeer', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should return a peer based on peerId', async () => {
			const peer = peerPool.getPeer(peerId);

			expect(peer).toBeDefined();
		});
	});

	describe('#hasPeer', () => {
		it('should return true if peer exists in pool', async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);

			expect(peerPool.hasPeer(peerId)).toBe(true);
		});

		it('should return false if peer does not exist in pool', async () => {
			(peerPool as any)._peerMap = new Map([]);

			expect(peerPool.hasPeer(peerId)).toBe(false);
		});
	});

	describe('#removePeer', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should disconnect peer', async () => {
			peerPool.removePeer(
				peerId,
				INTENTIONAL_DISCONNECT_CODE,
				'Disconnect peer',
			);

			expect(peerObject.disconnect).toBeCalled;
		});

		it('should remove peer from peerMap', async () => {
			peerPool.removePeer(
				peerId,
				INTENTIONAL_DISCONNECT_CODE,
				'Disconnect peer',
			);

			expect((peerPool as any)._peerMap.has(peerId)).toBe(false);
		});
	});

	describe('#applyPenalty', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should call applyPenalty on peer', async () => {
			const penalty = 50;
			peerPool.applyPenalty({ peerId, penalty });

			expect(peerObject.applyPenalty).toBeCalled;
		});
	});

	describe('#getFreeOutboundSlots', () => {
		beforeEach(async () => {
			(peerPool as any)._addOutboundPeer(peerObject as any);
		});

		it('should return available Outbound connection slot value', async () => {
			const peerCount = peerPool.getFreeOutboundSlots();
			expect(peerCount).toEqual((peerPool as any)._maxOutboundConnections - 1);
		});
	});

	describe.skip('#_applyNodeInfoOnPeer', () => {});

	describe('#filterPeersByCategory', () => {
		const originalPeers = [...new Array(10).keys()].map(i => ({
			id: i,
			internalState: {
				netgroup: i,
				latency: i,
				responseRate: i % 2 ? 0 : 1,
				connectTime: i,
			},
		}));

		it('should protect peers with highest netgroup value when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.NET_GROUP,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.internalState.netgroup).toBeGreaterThan(1);
			});
		});

		it('should protect peers with lowest latency value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.LATENCY,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.internalState.latency).toBeLessThan(3);
			});
		});

		it('should protect 2 peers with responseRate value of 1 when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.RESPONSE_RATE,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			expect(
				filteredPeers.filter((p: any) => p.internalState.responseRate === 1)
					.length,
			).toEqual(2);
		});

		it('should protect peers with lowest connectTime value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.CONNECT_TIME,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.internalState.connectTime).toBeLessThan(2);
			});
		});
	});

	// Expected protection candidates for 100 inbound peers using default ratios:
	// netgroup: 4 peers, latency: 7 peers, usefulness: 7 peers, longevity: 41 peers
	// Rounding up for +1 difference in some expectations
	describe('#_selectPeersForEviction', () => {
		let originalPeers: Array<any>;
		let getPeersStub: any;

		beforeEach(async () => {
			originalPeers = [...new Array(100).keys()].map(i => ({
				id: i,
				internalState: {
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
					peerKind: PeerKind.NONE,
				},
			}));
			(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_NETGROUP;
			(peerPool as any)._peerPoolConfig.latencyProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LATENCY;
			(peerPool as any)._peerPoolConfig.productivityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_USEFULNESS;
			(peerPool as any)._peerPoolConfig.longevityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LONGEVITY;

			getPeersStub = jest
				.spyOn(peerPool, 'getPeers')
				.mockReturnValue(originalPeers as Peer[]);
		});

		describe('when node using default protection ratio values has 100 inbound peers', () => {
			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(43);
			});
		});

		describe('when node using default protection ratio values has 10 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(10).keys()].map(i => ({
					id: i,
					internalState: {
						netgroup: i,
						latency: i,
						responseRate: i % 2 ? 0 : 1,
						connectTime: i,
						peerKind: PeerKind.NONE,
					},
				}));
				getPeersStub.mockReturnValue(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(4);
			});
		});

		describe('when node using default protection ratio values has 5 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(5).keys()].map(i => ({
					id: i,
					internalState: {
						netgroup: i,
						latency: i,
						responseRate: i % 2 ? 0 : 1,
						connectTime: i,
						peerKind: PeerKind.NONE,
					},
				}));
				getPeersStub.mockReturnValue(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(1);
			});
		});

		describe('when node using default protection ratio values has 0 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [];
				getPeersStub.mockReturnValue(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(0);
			});
		});

		describe('when node with netgroup protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(45);
			});
		});

		describe('when node with latency protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(45);
			});
		});

		describe('when node with usefulness protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(44);
			});
		});

		describe('when node with longevity protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(86);
			});
		});

		describe('when node has all inbound protection disabled has 10 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
				originalPeers = [...new Array(10).keys()].map(i => ({
					id: i,
					internalState: {
						netgroup: i,
						latency: i,
						responseRate: i % 2 ? 0 : 1,
						connectTime: i,
						peerKind: PeerKind.NONE,
					},
				}));
				getPeersStub.mockReturnValue(originalPeers as Peer[]);
			});

			it('should not evict any candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).toEqual(originalPeers.length);
			});
		});
	});

	describe('#_evictPeer', () => {
		const whitelistedPeers = [
			{ peerId: '1.2.3.4:5000', ipAddress: '1.2.3.4', wsPort: 5000 },
		];
		const fixedPeers = [
			{ peerId: '5.6.7.8:5000', ipAddress: '5.6.7.8', wsPort: 5000 },
		];
		const defaultPeers = [
			{
				id: '69.123.456.78:5000',
				peerId: '69.123.456.78:5000',
				ipAddress: '69.123.456.78',
				wsPort: 5000,
				internalState: {
					peerKind: PeerKind.NONE,
				},
			},
			...whitelistedPeers.map(peer => ({
				...peer,
				id: peer.peerId,
				internalState: { peerKind: PeerKind.WHITELISTED_PEER },
			})),
			...fixedPeers.map(peer => ({
				...peer,
				id: peer.peerId,
				internalState: { peerKind: PeerKind.FIXED_PEER },
			})),
		];

		beforeEach(async () => {
			(peerPool as any)._peerLists.whitelisted = whitelistedPeers;
			(peerPool as any)._peerLists.fixedPeers = fixedPeers;
			(peerPool as any)._peerPoolConfig = {
				netgroupProtectionRatio: 0,
				latencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
			};
			jest.spyOn(peerPool as any, 'getPeers').mockReturnValue(defaultPeers);
			jest.spyOn(peerPool, 'removePeer');
		});

		it('should not evict whitelisted peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.toHaveBeenCalledWith(
				whitelistedPeers[0].ipAddress,
				expect.any(Number),
				expect.any(String),
			);
		});

		it('should not evict fixed peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.toHaveBeenCalledWith(
				fixedPeers[0].ipAddress,
				expect.any(Number),
				expect.any(String),
			);
		});

		it('should evict a peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).toHaveBeenCalledWith(
				defaultPeers[0].peerId,
				expect.any(Number),
				expect.any(String),
			);
		});
	});

	describe.skip('#_bindHandlersToPeer', () => {});
});
