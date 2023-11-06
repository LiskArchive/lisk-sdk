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
	constructPeerId,
} from '../../src/utils';
// For stubbing
import { P2PPeerInfo, P2PNodeInfo } from '../../src/types';
import { initPeerList } from '../utils/peers';
import { Peer, ConnectionState, InboundPeer, OutboundPeer } from '../../src/peer';
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
	DEFAULT_PEER_STATUS_MESSAGE_RATE,
} from '../../src/constants';

import { errors } from '../../src';
import { PeerBookConfig, PeerBook } from '../../src/peer_book/peer_book';
import { defaultRPCSchemas } from '../../src/schema';

const { RequestFailError, SendFailError } = errors;

describe('peerPool', () => {
	jest.useFakeTimers();

	const peerBookConfig: PeerBookConfig = {
		sanitizedPeerLists: {
			blacklistedIPs: [],
			seedPeers: [],
			fixedPeers: [],
			whitelisted: [],
			previousPeers: [],
		},
		secret: DEFAULT_RANDOM_SECRET,
	};

	const peerPoolConfig = {
		hostPort: 5000,
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
		peerStatusMessageRate: DEFAULT_PEER_STATUS_MESSAGE_RATE,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
		secret: DEFAULT_RANDOM_SECRET,
		peerBook: new PeerBook(peerBookConfig),
		rpcSchemas: {
			...defaultRPCSchemas,
		},
	};
	let peerPool: PeerPool;
	let peerInfo: P2PPeerInfo;
	let nodeInfo: P2PNodeInfo;
	let peerId: string;
	let peerObject: any;
	let messagePacket: any;
	let requestPacket: any;

	beforeEach(() => {
		peerPool = new PeerPool(peerPoolConfig);
		peerId = '127.0.0.1:5000';
		peerInfo = {
			ipAddress: '127.0.0.1',
			port: 5000,
			peerId: constructPeerId('127.0.0.1', 5000),
			sharedState: {
				networkVersion: '1.0.1',
				chainID: Buffer.from('abc', 'hex'),
				nonce: 'nonce',
				options: {},
			},
		};
		nodeInfo = {
			networkVersion: '1.0.1',
			chainID: Buffer.from('abc', 'hex'),
			nonce: 'nonce',
			advertiseAddress: true,
			options: {},
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
			_rpcSchemas: {
				...defaultRPCSchemas,
			},
		} as any;
		peerPool.emit = jest.fn();
	});

	afterEach(() => {
		peerPool.removeAllPeers();
		jest.clearAllTimers();
	});

	describe('#constructor', () => {
		it('should be an object and instance of PeerPool', () => {
			expect(peerPool).toBeInstanceOf(PeerPool);
		});

		it('should have a _peerMap property which is a Map and _peerPoolConfig property which is set to the value specified in the constructor', () => {
			expect(peerPool).toMatchObject({
				_peerMap: expect.any(Map),
				_peerPoolConfig: peerPoolConfig,
			});
		});

		it('should have a _peerConfig property which is set to the value specified in the constructor', () => {
			const actualConfig = { ...(peerPool as any)._peerConfig };
			const expectedConfig = {
				hostPort: 5000,
				connectTimeout: peerPoolConfig.connectTimeout,
				ackTimeout: peerPoolConfig.ackTimeout,
				wsMaxMessageRate: peerPoolConfig.wsMaxMessageRate,
				wsMaxMessageRatePenalty: peerPoolConfig.wsMaxMessageRatePenalty,
				maxPeerDiscoveryResponseLength: peerPoolConfig.maxPeerDiscoveryResponseLength,
				rateCalculationInterval: peerPoolConfig.rateCalculationInterval,
				wsMaxPayload: peerPoolConfig.wsMaxPayload,
				maxPeerInfoSize: peerPoolConfig.maxPeerInfoSize,
				peerStatusMessageRate: 4,
				secret: peerPoolConfig.secret,
				rpcSchemas: {
					...defaultRPCSchemas,
				},
			};

			expect(actualConfig).toEqual(expectedConfig);
		});

		it('should have all Config properties', () => {
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
		it('should set _nodeInfo', () => {
			peerPool.applyNodeInfo(nodeInfo);

			expect(peerPool.nodeInfo).toBe(nodeInfo);
		});

		it('should call getPeers', () => {
			const getPeersStub = jest.spyOn(peerPool, 'getPeers');
			peerPool.applyNodeInfo(nodeInfo);

			expect(getPeersStub).toHaveBeenCalled();
		});

		it('should call _applyNodeInfoOnPeer for each peer in peerMap', () => {
			jest.spyOn(peerPool as any, '_applyNodeInfoOnPeer');

			expect((peerPool as any)._applyNodeInfoOnPeer).toHaveBeenCalledTimes(
				peerPool.getPeers().length,
			);
		});
	});

	describe('#request', () => {
		it('should call getAllConnectedPeerInfos(OutboundPeer)', async () => {
			jest.spyOn(peerPool, 'requestFromPeer');

			jest.spyOn(peerPool, 'getAllConnectedPeerInfos').mockReturnValue([peerInfo]);

			try {
				await peerPool.request(requestPacket);
			} catch (e) {
				expect(peerPool.getAllConnectedPeerInfos).toHaveBeenCalled();
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

			return expect(peerPool.request(requestPacket)).rejects.toThrow(RequestFailError);
		});

		it('should call requestFromPeer', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);

			const requestFromPeerStub = jest.spyOn(peerPool, 'requestFromPeer');

			jest.spyOn(peerPool as any, '_peerSelectForRequest').mockReturnValue([peerInfo]);

			await peerPool.request(requestPacket);

			expect(requestFromPeerStub).toHaveBeenCalled();
		});
	});

	describe('#send', () => {
		let _peerSelectForSendStub: any;
		let sendToPeer: any;

		beforeEach(() => {
			_peerSelectForSendStub = jest
				.spyOn(peerPool as any, '_peerSelectForSend')
				.mockReturnValue([peerInfo]);
			sendToPeer = jest.spyOn(peerPool, 'sendToPeer');
		});

		it('should call _peerSelectForSend', () => {
			peerPool.send(messagePacket);

			expect(_peerSelectForSendStub).toHaveBeenCalled();
		});

		it('should call sendToPeer for each selected peer', () => {
			peerPool.send(messagePacket);

			expect(sendToPeer).toHaveBeenCalledWith(
				messagePacket,
				constructPeerId(peerInfo.ipAddress, peerInfo.port),
			);
		});

		it('should emit event if sendToPeer fails', () => {
			sendToPeer = jest.spyOn(peerPool, 'sendToPeer').mockImplementation(() => {
				throw new Error();
			});

			try {
				peerPool.send(1 as any);
			} catch (error) {
				expect(peerPool.emit).toHaveBeenCalled();
			}
		});
	});

	describe('#requestFromPeer', () => {
		it('should throw error if no peers in peerPool', async () => {
			(peerPool as any)._peerMap = new Map();

			return expect(peerPool.requestFromPeer(requestPacket, peerId)).rejects.toThrow(
				RequestFailError,
			);
		});

		it('should call peer request with packet', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);
			await peerPool.requestFromPeer(requestPacket, peerId);

			expect(peerObject.request).toHaveBeenCalledWith(requestPacket);
		});
	});

	describe('#sendToPeer', () => {
		it('should throw error if no peers in peerPool', () => {
			(peerPool as any)._peerMap = new Map();

			expect(() => peerPool.sendToPeer(messagePacket, peerId)).toThrow(SendFailError);
		});

		it('should call peer send with message packet', () => {
			const peerStub = {
				send: jest.fn(),
			};
			(peerPool as any)._peerMap = new Map([[peerId, peerStub]]);
			peerPool.sendToPeer(messagePacket, peerId);

			expect(peerStub.send).toHaveBeenCalledWith(messagePacket);
		});
	});

	// TODO: Outdated it requires update
	// eslint-disable-next-line jest/no-disabled-tests
	describe.skip('#discoverFromSeedPeers', () => {
		beforeEach(() => {
			jest.spyOn(peerPool, '_addOutboundPeer' as any).mockReturnValue(true);
			jest.spyOn(peerPool, 'getPeersCountPerKind').mockReturnValue({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.discoverFromSeedPeers();
		});

		it('should call _addOutboundPeer with Seed Peer', () => {
			expect(peerPool['_addOutboundPeer']).toHaveBeenCalled();
		});
	});

	describe('#triggerNewConnections', () => {
		beforeEach(() => {
			(peerPool['_peerSelectForConnection'] as any) = jest
				.fn()
				.mockReturnValue([] as ReadonlyArray<P2PPeerInfo>);
			jest.spyOn(peerPool, 'getPeersCountPerKind').mockReturnValue({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.triggerNewConnections([], []);
		});

		it('should call _peerSelectForConnection with all the necessary options', () => {
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

		beforeEach(() => {
			getPeersStub = jest.spyOn(peerPool, 'getPeers').mockReturnValue([peerObject]);
		});

		it('should call getPeers with InboundPeer class', () => {
			peerPool.addInboundPeer(peerInfo, peerObject);

			expect(getPeersStub).toHaveBeenCalledWith(InboundPeer);
		});

		it('should call _evictPeer if max inbound connections reached', () => {
			(peerPool as any)._maxInboundConnections = 0;
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			jest.spyOn(peerPool as any, '_evictPeer').mockImplementation(() => {});
			peerPool.addInboundPeer(peerInfo, peerObject);

			expect((peerPool as any)._evictPeer).toHaveBeenCalledWith(InboundPeer);
		});

		it('should add peer to peerMap', () => {
			(peerPool as any)._peerMap = new Map([]);
			peerPool.addInboundPeer(peerInfo, peerObject);

			expect((peerPool as any)._peerMap.has(peerId)).toBeDefined();
		});

		it('should call _bindHandlersToPeer', () => {
			const _bindHandlersToPeerStub = jest.spyOn(peerPool as any, '_bindHandlersToPeer');
			peerPool.addInboundPeer(peerInfo, peerObject);

			expect(_bindHandlersToPeerStub).toHaveBeenCalled();
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', () => {
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				networkVersion: '1.0.1',
				version: '1.1',
			};
			const _applyNodeInfoOnPeerStub = jest.spyOn(peerPool as any, '_applyNodeInfoOnPeer');
			peerPool.addInboundPeer(peerInfo, peerObject);

			expect(_applyNodeInfoOnPeerStub).toHaveBeenCalled();
		});

		it('should return peer object', () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject);

			expect(peer).toBeDefined();
		});
	});

	describe('#_addOutboundPeer', () => {
		let hasPeerStub: any;
		let getPeersStub: any;
		let _bindHandlersToPeerStub: any;

		beforeEach(() => {
			hasPeerStub = jest.spyOn(peerPool, 'hasPeer').mockReturnValue(true);

			getPeersStub = jest.spyOn(peerPool, 'getPeers').mockReturnValue([] as Peer[]);
		});

		it('should call hasPeer with peerId', () => {
			(peerPool as any)._addOutboundPeer(peerObject);

			expect(hasPeerStub).toHaveBeenCalledWith(peerId);
		});

		it('should call getAllConnectedPeerInfos with OutboundPeer', () => {
			hasPeerStub.mockReturnValue(false);
			(peerPool as any)._addOutboundPeer(peerObject);

			expect(getPeersStub).toHaveBeenCalled();
		});

		it('should add peer to peerMap', () => {
			(peerPool as any)._peerMap = new Map([]);
			(peerPool as any)._addOutboundPeer(peerObject);

			expect((peerPool as any)._peerMap.has(peerId)).toBeDefined();
		});

		it('should call _bindHandlersToPeer', () => {
			hasPeerStub.mockReturnValue(false);
			getPeersStub.mockReturnValue([]);
			_bindHandlersToPeerStub = jest.spyOn(peerPool as any, '_bindHandlersToPeer');
			(peerPool as any)._addOutboundPeer(peerObject);

			expect(_bindHandlersToPeerStub).toHaveBeenCalled();
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', () => {
			hasPeerStub.mockReturnValue(false);
			getPeersStub.mockReturnValue([]);
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				networkVersion: '1.0.1',
				version: '1.1',
			};
			const _applyNodeInfoOnPeerStub = jest.spyOn(peerPool as any, '_applyNodeInfoOnPeer');
			(peerPool as any)._addOutboundPeer(peerObject);

			expect(_applyNodeInfoOnPeerStub).toHaveBeenCalled();
		});

		it('should return peer object', () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject);

			expect(peer).toBeDefined();
		});
	});

	describe('#getPeersCountPerKind', () => {
		beforeEach(() => {
			(peerPool as any)._addOutboundPeer(peerObject);
		});

		it('should return an object with outboundCount and inboundCount', () => {
			const peerCount = peerPool.getPeersCountPerKind();
			expect(peerCount).toHaveProperty('outboundCount', 1);
			expect(peerCount).toHaveProperty('inboundCount', 0);
		});
	});

	describe('#removeAllPeers', () => {
		let removePeerStub: any;

		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
			removePeerStub = jest.spyOn(peerPool, 'removePeer');
		});

		it('should call removePeer for all peers in peerMap', () => {
			peerPool.removeAllPeers();

			expect(removePeerStub).toHaveBeenCalledWith(
				peerId,
				INTENTIONAL_DISCONNECT_CODE,
				`Intentionally removed peer ${peerId}`,
			);
		});
	});

	describe('#getPeers', () => {
		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should return peers by kind', () => {
			const inboundPeers = peerPool.getPeers(Object as any);

			expect(inboundPeers).toHaveLength(1);
		});
	});

	describe('#getAllConnectedPeerInfos', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(() => {
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
					.mockReturnValue(peerList.filter(peer => peer.state === ConnectionState.OPEN));

				activePeersInfoList = [peerList[0], peerList[1]].map(peer => peer.peerInfo);
			});

			it('should returns list of peerInfos of active peers', () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(activePeersInfoList);
			});
		});

		describe('when there are some active peers in inbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(() => {
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
					.mockReturnValue(peerList.filter(peer => peer.state === ConnectionState.OPEN));

				activePeersInfoList = [peerList[0], peerList[1]].map(peer => peer.peerInfo);
			});

			it('should returns list of peerInfos of active peers only in inbound', () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(activePeersInfoList);
			});
		});

		describe('when there are some active peers in outbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(() => {
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
					.mockReturnValue(peerList.filter(peer => peer.state === ConnectionState.OPEN));

				activePeersInfoList = [peerList[0], peerList[1]].map(peer => peer.peerInfo);
			});

			it('should returns list of peerInfos of active peers only in outbound', () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual(activePeersInfoList);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();

			beforeEach(() => {
				peerList.forEach(peer => {
					Object.defineProperty(peer as any, 'state', {
						get: jest.fn(() => ConnectionState.CLOSED),
						set: jest.fn(),
					});
				});

				jest
					.spyOn(peerPool, 'getConnectedPeers')
					.mockReturnValue(peerList.filter(peer => peer.state === ConnectionState.OPEN));
			});

			it('should return an empty array', () => {
				expect(peerPool.getAllConnectedPeerInfos()).toEqual([]);
			});
		});
	});

	describe('#getConnectedPeers', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(() => {
				peerList.forEach((peer, i) => {
					(peerPool as any)._peerMap.set(`${peer.peerInfo.ipAddress}:${peer.peerInfo.port}`, {
						peerInfo: { ...peer.peerInfo },
						state: i % 2 ? ConnectionState.OPEN : ConnectionState.CLOSED,
					});
				});
				activePeersInfoList = [peerList[1], peerList[3]].map(peer => peer.peerInfo);
			});

			it('should return active peers', () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).toEqual(
					activePeersInfoList,
				);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();

			beforeEach(() => {
				peerList.forEach(peer => {
					(peerPool as any)._peerMap.set(`${peer.peerInfo.ipAddress}:${peer.peerInfo.port}`, {
						peerInfo: { ...peer.peerInfo },
						state: ConnectionState.CLOSED,
					});
				});
			});

			it('should return an empty array', () => {
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).toEqual([]);
			});
		});
	});

	describe('#getPeer', () => {
		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should return a peer based on peerId', () => {
			const peer = peerPool.getPeer(peerId);

			expect(peer).toBeDefined();
		});
	});

	describe('#hasPeer', () => {
		it('should return true if peer exists in pool', () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);

			expect(peerPool.hasPeer(peerId)).toBe(true);
		});

		it('should return false if peer does not exist in pool', () => {
			(peerPool as any)._peerMap = new Map([]);

			expect(peerPool.hasPeer(peerId)).toBe(false);
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should disconnect peer', () => {
			peerPool.removePeer(peerId, INTENTIONAL_DISCONNECT_CODE, 'Disconnect peer');

			expect(peerObject.disconnect).toHaveBeenCalled();
		});

		it('should remove peer from peerMap', () => {
			peerPool.removePeer(peerId, INTENTIONAL_DISCONNECT_CODE, 'Disconnect peer');

			expect((peerPool as any)._peerMap.has(peerId)).toBe(false);
		});
	});

	describe('#applyPenalty', () => {
		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should call applyPenalty on peer', () => {
			const penalty = 50;
			peerPool.applyPenalty({ peerId, penalty });

			expect(peerObject.applyPenalty).toHaveBeenCalled();
		});
	});

	// TODO: Outdated it requires update
	// eslint-disable-next-line jest/no-disabled-tests
	describe.skip('#Ban Peer', () => {
		beforeEach(() => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should call _banPeer on peer', () => {
			const penalty = 100;
			peerPool.applyPenalty({ peerId, penalty });

			expect(peerObject._banPeer).toHaveBeenCalled();
		});

		it('should re-emit _handleBanPeer on PeerPool', () => {
			const penalty = 100;
			peerPool.applyPenalty({ peerId, penalty });

			expect((peerPool as any)._handleBanPeer).toHaveBeenCalled();
		});
	});

	describe('#getFreeOutboundSlots', () => {
		beforeEach(() => {
			(peerPool as any)._addOutboundPeer(peerObject);
		});

		it('should return available Outbound connection slot value', () => {
			const peerCount = peerPool.getFreeOutboundSlots();
			expect(peerCount).toEqual((peerPool as any)._maxOutboundConnections - 1);
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	describe('#_applyNodeInfoOnPeer', () => {});

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

		it('should protect peers with highest netgroup value when sorted by ascending', () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.NET_GROUP,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.internalState.netgroup).toBeGreaterThan(1);
			});
		});

		it('should protect peers with lowest latency value when sorted by descending', () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.LATENCY,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect(peer.internalState.latency).toBeLessThan(3);
			});
		});

		it('should protect 2 peers with responseRate value of 1 when sorted by ascending', () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.RESPONSE_RATE,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			expect(filteredPeers.filter((p: any) => p.internalState.responseRate === 1)).toHaveLength(2);
		});

		it('should protect peers with lowest connectTime value when sorted by descending', () => {
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

		beforeEach(() => {
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
			(peerPool as any)._peerPoolConfig.netgroupProtectionRatio =
				DEFAULT_PEER_PROTECTION_FOR_NETGROUP;
			(peerPool as any)._peerPoolConfig.latencyProtectionRatio =
				DEFAULT_PEER_PROTECTION_FOR_LATENCY;
			(peerPool as any)._peerPoolConfig.productivityProtectionRatio =
				DEFAULT_PEER_PROTECTION_FOR_USEFULNESS;
			(peerPool as any)._peerPoolConfig.longevityProtectionRatio =
				DEFAULT_PEER_PROTECTION_FOR_LONGEVITY;

			getPeersStub = jest.spyOn(peerPool, 'getPeers').mockReturnValue(originalPeers as Peer[]);
		});

		describe('when node using default protection ratio values has 100 inbound peers', () => {
			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(43);
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

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(4);
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

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(1);
			});
		});

		describe('when node using default protection ratio values has 0 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [];
				getPeersStub.mockReturnValue(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(0);
			});
		});

		describe('when node with netgroup protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(45);
			});
		});

		describe('when node with latency protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(45);
			});
		});

		describe('when node with usefulness protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(44);
			});
		});

		describe('when node with longevity protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(86);
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

			it('should not evict any candidates', () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction).toHaveLength(originalPeers.length);
			});
		});
	});

	describe('#_evictPeer', () => {
		const whitelistedPeers = [{ peerId: '1.2.3.4:5000', ipAddress: '1.2.3.4', port: 5000 }];
		const fixedPeers = [{ peerId: '5.6.7.8:5000', ipAddress: '5.6.7.8', port: 5000 }];
		const defaultPeers = [
			{
				id: '69.123.456.78:5000',
				peerId: '69.123.456.78:5000',
				ipAddress: '69.123.456.78',
				port: 5000,
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

		beforeEach(() => {
			(peerPool as any)._peerPoolConfig = {
				netgroupProtectionRatio: 0,
				latencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
			};
			jest.spyOn(peerPool as any, 'getPeers').mockReturnValue(defaultPeers);
			jest.spyOn(peerPool, 'removePeer');
		});

		it('should not evict whitelisted peer', () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.toHaveBeenCalledWith(
				whitelistedPeers[0].ipAddress,
				expect.any(Number),
				expect.any(String),
			);
		});

		it('should not evict fixed peer', () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.toHaveBeenCalledWith(
				fixedPeers[0].ipAddress,
				expect.any(Number),
				expect.any(String),
			);
		});

		it('should evict a peer', () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).toHaveBeenCalledWith(
				defaultPeers[0].peerId,
				expect.any(Number),
				expect.any(String),
			);
		});
	});

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	describe('#_bindHandlersToPeer', () => {});
});
