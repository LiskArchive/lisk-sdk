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
import * as sinon from 'sinon';
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
} from '../../src/constants';
import { constructPeerId } from '../../src/utils';
import { RequestFailError, SendFailError } from '../../src';

describe('peerPool', () => {
	const peerPoolConfig = {
		connectTimeout: DEFAULT_CONNECT_TIMEOUT,
		ackTimeout: DEFAULT_ACK_TIMEOUT,
		peerSelectionForConnection: selectPeersForConnection,
		peerSelectionForRequest: selectPeersForRequest,
		peerSelectionForSend: selectPeersForSend,
		sendPeerLimit: DEFAULT_SEND_PEER_LIMIT,
		wsMaxPayload: DEFAULT_WS_MAX_PAYLOAD,
		wsMaxMessageRate: 100,
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
			blacklistedPeers: [],
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
	let clock: sinon.SinonFakeTimers;

	beforeEach(async () => {
		clock = sandbox.useFakeTimers();
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
			nethash: 'abc',
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
			send: sandbox.stub(),
			request: sandbox.stub(),
			connect: sandbox.stub(),
			applyPenalty: sandbox.stub(),
			disconnect: sandbox.stub(),
			removeListener: sandbox.stub(),
			on: sandbox.stub(),
			off: sandbox.stub(),
			emit: sandbox.stub(),
			destroy: sandbox.stub(),
		} as any;
		peerPool.emit = sandbox.stub().resolves();
	});

	afterEach(async () => {
		clock.restore();
	});

	describe('#constructor', () => {
		it('should be an object and instance of PeerPool', async () => {
			expect(peerPool).to.be.instanceof(PeerPool);
		});

		it('should have a _peerMap property which is a Map', async () => {
			expect(peerPool)
				.to.have.property('_peerMap')
				.which.is.instanceOf(Map);
		});

		it('should have a _peerPoolConfig property which is set to the value specified in the constructor', async () => {
			expect(peerPool)
				.to.have.property('_peerPoolConfig')
				.which.equals(peerPoolConfig);
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

			expect(actualConfig).to.eql(expectedConfig);
		});

		it('should set _peerLists property', async () => {
			expect(peerPool)
				.to.have.property('_peerLists')
				.which.equals(peerPoolConfig.peerLists);
		});

		it('should set _peerSelectForSend property', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForSend')
				.which.equals(peerPoolConfig.peerSelectionForSend);
		});

		it('should set _peerSelectForRequest property', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForRequest')
				.which.equals(peerPoolConfig.peerSelectionForRequest);
		});

		it('should set _peerSelectForConnection property', async () => {
			expect(peerPool)
				.to.have.property('_peerSelectForConnection')
				.which.equals(peerPoolConfig.peerSelectionForConnection);
		});

		it('should set _maxOutboundConnections property', async () => {
			expect(peerPool)
				.to.have.property('_maxOutboundConnections')
				.which.equals(peerPoolConfig.maxOutboundConnections);
		});

		it('should set _maxInboundConnections property', async () => {
			expect(peerPool)
				.to.have.property('_maxInboundConnections')
				.which.equals(peerPoolConfig.maxInboundConnections);
		});

		it('should set _sendPeerLimit property', async () => {
			expect(peerPool)
				.to.have.property('_sendPeerLimit')
				.which.equals(peerPoolConfig.sendPeerLimit);
		});

		it('should have a _outboundShuffleIntervalId property', async () => {
			expect(peerPool).to.have.property('_outboundShuffleIntervalId');
		});
	});

	describe('#applyNodeInfo', () => {
		it('should set _nodeInfo', async () => {
			peerPool.applyNodeInfo(nodeInfo);

			expect(peerPool.nodeInfo).to.equal(nodeInfo);
		});

		it('should call getPeers', async () => {
			const getPeersStub = sandbox.stub(peerPool, 'getPeers').callThrough();
			peerPool.applyNodeInfo(nodeInfo);

			expect(getPeersStub).to.be.calledOnce;
		});

		it('should call _applyNodeInfoOnPeer for each peer in peerMap', async () => {
			const applyNodeInfoOnPeerStub = sandbox
				.stub(peerPool as any, '_applyNodeInfoOnPeer')
				.callThrough();
			const applyNodeInfoOnPeerCalls = applyNodeInfoOnPeerStub.getCalls()
				.length;

			expect(applyNodeInfoOnPeerCalls).eql(peerPool.getPeers().length);
		});
	});

	describe('#request', () => {
		it('should call getAllConnectedPeerInfos(OutboundPeer)', async () => {
			sandbox.stub(peerPool, 'requestFromPeer').resolves();
			const getAllConnectedPeerInfosStub = sandbox
				.stub(peerPool, 'getAllConnectedPeerInfos')
				.returns([peerInfo]);
			await peerPool.request(requestPacket);

			expect(getAllConnectedPeerInfosStub).to.be.calledOnce;
		});

		it('should call _peerSelectForRequest', async () => {
			sandbox.stub(peerPool, 'requestFromPeer').resolves();
			const peers = peerPool.getAllConnectedPeerInfos(OutboundPeer);
			const _peerSelectForRequestStub = sandbox
				.stub(peerPool as any, '_peerSelectForRequest')
				.returns([peerInfo]);

			await peerPool.request(requestPacket);

			expect(_peerSelectForRequestStub).to.be.calledWith({
				peers,
				nodeInfo: peerPool.nodeInfo,
				peerLimit: 1,
				requestPacket,
			});
		});

		it('should throw error if no peers selected', async () => {
			sandbox.stub(peerPool as any, '_peerSelectForRequest').returns([]);

			return expect(
				peerPool.request(requestPacket),
			).to.eventually.be.rejectedWith(
				RequestFailError,
				'Request failed due to no peers found in peer selection',
			);
		});

		it('should call requestFromPeer', async () => {
			const requestFromPeerStub = sandbox
				.stub(peerPool, 'requestFromPeer')
				.resolves();
			sandbox
				.stub(peerPool as any, '_peerSelectForRequest')
				.returns([peerInfo]);
			await peerPool.request(requestPacket);

			expect(requestFromPeerStub).to.be.calledOnce;
		});
	});

	describe('#send', () => {
		let _peerSelectForSendStub: any;
		let sendToPeer: any;

		beforeEach(async () => {
			_peerSelectForSendStub = sandbox
				.stub(peerPool as any, '_peerSelectForSend')
				.returns([peerInfo]);
			sendToPeer = sandbox.stub(peerPool, 'sendToPeer').resolves();
		});

		it('should call _peerSelectForSend', async () => {
			await peerPool.send(messagePacket);

			expect(_peerSelectForSendStub).to.be.calledOnce;
		});

		it('should call sendToPeer for each selected peer', async () => {
			await peerPool.send(messagePacket);

			expect(sendToPeer).to.be.calledOnceWithExactly(
				messagePacket,
				constructPeerId(peerInfo.ipAddress, peerInfo.wsPort),
			);
		});

		it(`should emit event if sendToPeer fails`, async () => {
			sendToPeer.throws();
			await peerPool.send(1 as any);

			expect(peerPool.emit).to.be.calledOnce;
		});
	});

	describe('#requestFromPeer', () => {
		it('should throw error if no peers in peerPool', async () => {
			(peerPool as any)._peerMap = new Map();

			return expect(
				peerPool.requestFromPeer(requestPacket, peerId),
			).to.eventually.be.rejectedWith(
				RequestFailError,
				`Request failed because a peer with id ${peerId} could not be found`,
			);
		});

		it('should call peer request with packet', async () => {
			(peerPool as any)._peerMap = new Map([['127.0.0.1:5000', peerObject]]);
			await peerPool.requestFromPeer(requestPacket, peerId);

			expect(peerObject.request).to.be.calledWithExactly(requestPacket);
		});
	});

	describe('#sendToPeer', () => {
		it('should throw error if no peers in peerPool', async () => {
			(peerPool as any)._peerMap = new Map();

			expect(() => peerPool.sendToPeer(messagePacket, peerId)).to.throw(
				SendFailError,
			);
		});

		it('should call peer send with message packet', async () => {
			const peerStub = {
				send: sandbox.stub(),
			};
			(peerPool as any)._peerMap = new Map([[peerId, peerStub]]);
			await peerPool.sendToPeer(messagePacket, peerId);

			expect(peerStub.send).to.be.calledWithExactly(messagePacket);
		});
	});

	describe('#discoverSeedPeers', () => {
		beforeEach(async () => {
			(peerPool['_addOutboundPeer'] as any) = sandbox
				.stub()
				.returns(true as boolean);

			sandbox.stub(peerPool, 'getPeersCountPerKind').returns({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.discoverSeedPeers();
		});

		it('should call _addOutboundPeer with Seed Peer', async () => {
			expect(peerPool['_addOutboundPeer']).to.be.called;
		});
	});

	describe('#triggerNewConnections', () => {
		beforeEach(async () => {
			(peerPool['_peerSelectForConnection'] as any) = sandbox
				.stub()
				.returns([] as ReadonlyArray<P2PPeerInfo>);
			sandbox.stub(peerPool, 'getPeersCountPerKind').returns({
				outboundCount: 0,
				inboundCount: 0,
			});
			peerPool.triggerNewConnections([], []);
		});

		it('should call _peerSelectForConnection with all the necessary options', async () => {
			expect(peerPool['_peerSelectForConnection']).to.be.calledWith({
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
			getPeersStub = sandbox.stub(peerPool, 'getPeers').returns([peerObject]);
		});

		it('should call getPeers with InboundPeer class', async () => {
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(getPeersStub).to.be.calledWithExactly(InboundPeer);
		});

		it('should call _evictPeer if max inbound connections reached', async () => {
			(peerPool as any)._maxInboundConnections = 0;
			sandbox.stub(peerPool as any, '_evictPeer');
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect((peerPool as any)._evictPeer).to.be.calledWithExactly(InboundPeer);
		});

		it('should add peer to peerMap', async () => {
			(peerPool as any)._peerMap = new Map([]);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect((peerPool as any)._peerMap.has(peerId)).to.exist;
		});

		it('should call _bindHandlersToPeer', async () => {
			let _bindHandlersToPeerStub = sandbox.stub(
				peerPool as any,
				'_bindHandlersToPeer',
			);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(_bindHandlersToPeerStub).to.be.calledOnce;
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', async () => {
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				protocolVersion: '1.0.1',
				version: '1.1',
			};
			let _applyNodeInfoOnPeerStub = sandbox.stub(
				peerPool as any,
				'_applyNodeInfoOnPeer',
			);
			peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(_applyNodeInfoOnPeerStub).to.have.been.calledOnce;
		});

		it('should return peer object', async () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(peer).to.exist;
		});
	});

	describe('#_addOutboundPeer', () => {
		let hasPeerStub: any;
		let getPeersStub: any;
		let _bindHandlersToPeerStub: any;

		beforeEach(async () => {
			hasPeerStub = sandbox.stub(peerPool, 'hasPeer').returns(true);

			getPeersStub = sandbox.stub(peerPool, 'getPeers').returns([] as Peer[]);
		});

		it('should call hasPeer with peerId', async () => {
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(hasPeerStub).to.be.calledWithExactly(peerId);
		});

		it('should call getAllConnectedPeerInfos with OutboundPeer', async () => {
			hasPeerStub.returns(false);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(getPeersStub).to.be.calledOnce;
		});

		it('should add peer to peerMap', async () => {
			(peerPool as any)._peerMap = new Map([]);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect((peerPool as any)._peerMap.has(peerId)).to.exist;
		});

		it('should call _bindHandlersToPeer', async () => {
			hasPeerStub.returns(false);
			getPeersStub.returns([]);
			_bindHandlersToPeerStub = sandbox.stub(
				peerPool as any,
				'_bindHandlersToPeer',
			);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(_bindHandlersToPeerStub).to.be.calledOnce;
		});

		it('should call _applyNodeInfoOnPeer if _nodeInfo exists', async () => {
			hasPeerStub.returns(false);
			getPeersStub.returns([]);
			(peerPool as any)._nodeInfo = {
				os: 'darwin',
				protocolVersion: '1.0.1',
				version: '1.1',
			};
			let _applyNodeInfoOnPeerStub = sandbox.stub(
				peerPool as any,
				'_applyNodeInfoOnPeer',
			);
			(peerPool as any)._addOutboundPeer(peerObject as any);

			expect(_applyNodeInfoOnPeerStub).to.have.been.calledOnce;
		});

		it('should return peer object', async () => {
			const peer = peerPool.addInboundPeer(peerInfo, peerObject as any);

			expect(peer).to.exist;
		});
	});

	describe('#getPeersCountPerKind', () => {
		beforeEach(async () => {
			(peerPool as any)._addOutboundPeer(peerObject as any);
		});

		it('should return an object with outboundCount and inboundCount', async () => {
			const peerCount = peerPool.getPeersCountPerKind();
			expect(peerCount).to.have.property('outboundCount', 1);
			expect(peerCount).to.have.property('inboundCount', 0);
		});
	});

	describe('#removeAllPeers', () => {
		let removePeerStub: any;

		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
			removePeerStub = sandbox.stub(peerPool, 'removePeer');
		});

		it('should call removePeer for all peers in peerMap', async () => {
			peerPool.removeAllPeers();

			expect(removePeerStub).to.be.calledWithExactly(
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

			expect(inboundPeers).to.have.length(1);
		});
	});

	describe('#getAllConnectedPeerInfos', () => {
		describe('when there are some active peers in inbound and outbound', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are some active peers in inbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in inbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are some active peers in outbound only', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();
			let activePeersInfoList: ReadonlyArray<P2PPeerInfo>;

			beforeEach(async () => {
				sandbox.stub(peerList[0], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[1], 'state').get(() => ConnectionState.OPEN);
				sandbox.stub(peerList[2], 'state').get(() => ConnectionState.CLOSED);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
				activePeersInfoList = [peerList[0], peerList[1]].map(
					peer => peer.peerInfo,
				);
			});

			it('should returns list of peerInfos of active peers only in outbound', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql(activePeersInfoList);
			});
		});

		describe('when there are no active peers', () => {
			const peerList: ReadonlyArray<Peer> = initPeerList();

			beforeEach(async () => {
				peerList.forEach(peer =>
					sandbox.stub(peer, 'state').get(() => ConnectionState.CLOSED),
				);

				sandbox
					.stub(peerPool, 'getConnectedPeers')
					.returns(
						peerList.filter(peer => peer.state === ConnectionState.OPEN),
					);
			});

			it('should return an empty array', async () => {
				expect(peerPool.getAllConnectedPeerInfos()).eql([]);
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
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql(
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
				expect(peerPool.getConnectedPeers().map(peer => peer.peerInfo)).eql([]);
			});
		});
	});

	describe('#getPeer', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should return a peer based on peerId', async () => {
			const peer = peerPool.getPeer(peerId);

			expect(peer).to.exist;
		});
	});

	describe('#hasPeer', () => {
		it('should return true if peer exists in pool', async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);

			expect(peerPool.hasPeer(peerId)).to.be.true;
		});

		it('should return false if peer does not exist in pool', async () => {
			(peerPool as any)._peerMap = new Map([]);

			expect(peerPool.hasPeer(peerId)).to.be.false;
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

			expect(peerObject.disconnect).to.be.calledOnce;
		});

		it('should remove peer from peerMap', async () => {
			peerPool.removePeer(
				peerId,
				INTENTIONAL_DISCONNECT_CODE,
				'Disconnect peer',
			);

			expect((peerPool as any)._peerMap.has(peerId)).to.be.false;
		});
	});

	describe('#applyPenalty', () => {
		beforeEach(async () => {
			(peerPool as any)._peerMap = new Map([[peerId, peerObject]]);
		});

		it('should call applyPenalty on peer', async () => {
			const penalty = 50;
			peerPool.applyPenalty({ peerId, penalty });

			expect(peerObject.applyPenalty).to.be.calledOnce;
		});
	});

	describe.skip('#_applyNodeInfoOnPeer', () => {});

	describe('#filterPeersByCategory', () => {
		const originalPeers = [...new Array(10).keys()].map(i => ({
			id: i,
			netgroup: i,
			latency: i,
			responseRate: i % 2 ? 0 : 1,
			connectTime: i,
		}));

		it('should protect peers with highest netgroup value when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.NET_GROUP,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			filteredPeers.forEach(peer => {
				expect((peer as any).netgroup).to.be.greaterThan(1);
			});
		});

		it('should protect peers with lowest latency value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.LATENCY,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect((peer as any).latency).to.be.lessThan(3);
			});
		});

		it('should protect 2 peers with responseRate value of 1 when sorted by ascending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.RESPONSE_RATE,
				percentage: 0.2,
				protectBy: PROTECT_BY.HIGHEST,
			});

			expect(
				filteredPeers.filter((p: any) => p.responseRate === 1).length,
			).to.eql(2);
		});

		it('should protect peers with lowest connectTime value when sorted by descending', async () => {
			const filteredPeers = filterPeersByCategory(originalPeers as any, {
				category: PROTECTION_CATEGORY.CONNECT_TIME,
				percentage: 0.2,
				protectBy: PROTECT_BY.LOWEST,
			});

			filteredPeers.forEach(peer => {
				expect((peer as any).connectTime).to.be.lessThan(2);
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
				netgroup: i,
				latency: i,
				responseRate: i % 2 ? 0 : 1,
				connectTime: i,
			}));
			(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_NETGROUP;
			(peerPool as any)._peerPoolConfig.latencyProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LATENCY;
			(peerPool as any)._peerPoolConfig.productivityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_USEFULNESS;
			(peerPool as any)._peerPoolConfig.longevityProtectionRatio = DEFAULT_PEER_PROTECTION_FOR_LONGEVITY;

			getPeersStub = sandbox
				.stub(peerPool, 'getPeers')
				.returns(originalPeers as Peer[]);
		});

		describe('when node using default protection ratio values has 100 inbound peers', () => {
			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(43);
			});
		});

		describe('when node using default protection ratio values has 10 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(10).keys()].map(i => ({
					id: i,
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				getPeersStub.returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(4);
			});
		});

		describe('when node using default protection ratio values has 5 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [...new Array(5).keys()].map(i => ({
					id: i,
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				getPeersStub.returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(1);
			});
		});

		describe('when node using default protection ratio values has 0 inbound peers', () => {
			beforeEach(() => {
				originalPeers = [];
				getPeersStub.returns(originalPeers as Peer[]);
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(0);
			});
		});

		describe('when node with netgroup protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.netgroupProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(45);
			});
		});

		describe('when node with latency protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.latencyProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(45);
			});
		});

		describe('when node with usefulness protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.productivityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(44);
			});
		});

		describe('when node with longevity protection disabled has 100 inbound peers', () => {
			beforeEach(() => {
				(peerPool as any)._peerPoolConfig.longevityProtectionRatio = 0;
			});

			it('should return expected amount of eviction candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(86);
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
					netgroup: i,
					latency: i,
					responseRate: i % 2 ? 0 : 1,
					connectTime: i,
				}));
				getPeersStub.returns(originalPeers as Peer[]);
			});

			it('should not evict any candidates', async () => {
				const selectedPeersForEviction = (peerPool as any)._selectPeersForEviction();

				expect(selectedPeersForEviction.length).to.eql(10);
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
			},
			...whitelistedPeers.map(peer => ({ ...peer, id: peer.peerId })),
			...fixedPeers.map(peer => ({ ...peer, id: peer.peerId })),
		];

		beforeEach(async () => {
			(peerPool as any)._peerLists.whitelisted = whitelistedPeers;
			(peerPool as any)._peerLists.fixedPeers = fixedPeers;
			(peerPool as any)._peerPoolConfig = {
				netgroupProtectionRatio: 0,
				latencyProtectionRatio: 0,
				productivityProtectionRatio: 0,
			};
			sandbox.stub(peerPool as any, 'getPeers').returns(defaultPeers);
			sandbox.stub(peerPool, 'removePeer');
		});

		it('should not evict whitelisted peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.to.be.calledWithExactly(
				whitelistedPeers[0].ipAddress,
				sinon.match.any,
				sinon.match.any,
			);
		});

		it('should not evict fixed peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).not.to.be.calledWithExactly(
				fixedPeers[0].ipAddress,
				sinon.match.any,
				sinon.match.any,
			);
		});

		it('should evict a peer', async () => {
			(peerPool as any)._evictPeer(InboundPeer);
			expect(peerPool.removePeer).to.be.calledWithExactly(
				defaultPeers[0].peerId,
				sinon.match.any,
				sinon.match.any,
			);
		});
	});

	describe.skip('#_bindHandlersToPeer', () => {});
});
