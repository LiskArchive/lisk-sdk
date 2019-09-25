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
import { Peer, PeerConfig } from '../../../src/peer';
import {
	DEFAULT_REPUTATION_SCORE,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_PRODUCTIVITY_RESET_INTERVAL,
} from '../../../src/constants';
import {
	EVENT_BAN_PEER,
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
	EVENT_FAILED_TO_FETCH_PEERS,
	REMOTE_EVENT_RPC_GET_PEERS_LIST,
	EVENT_DISCOVERED_PEER,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	REMOTE_EVENT_RPC_UPDATE_PEER_INFO,
} from '../../../src/events';
import { RPCResponseError } from '../../../src/errors';
import { SCServerSocket } from 'socketcluster-server';
import {
	sanitizeNodeInfoToLegacyFormat,
	getNetgroup,
	constructPeerIdFromPeerInfo,
} from '../../../src/utils';
import { P2PDiscoveredPeerInfo, P2PNodeInfo, P2PPeerInfo } from '../../../src';
import * as sinon from 'sinon';

describe('peer/base', () => {
	let defaultPeerInfo: P2PPeerInfo;
	let peerConfig: PeerConfig;
	let nodeInfo: P2PNodeInfo;
	let p2pDiscoveredPeerInfo: P2PDiscoveredPeerInfo;
	let defaultPeer: Peer;
	let clock: sinon.SinonFakeTimers;

	beforeEach(() => {
		clock = sinon.useFakeTimers();
		defaultPeerInfo = {
			ipAddress: '12.12.12.12',
			wsPort: 5001,
			height: 545776,
			isDiscoveredPeer: true,
			version: '1.1.1',
			protocolVersion: '1.1',
		};
		peerConfig = {
			rateCalculationInterval: 1000,
			wsMaxMessageRate: 1000,
			wsMaxMessageRatePenalty: 10,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
		};
		nodeInfo = {
			os: 'os',
			version: '1.2.0',
			protocolVersion: '1.2',
			nethash: 'nethash',
			wsPort: 6001,
			height: 100,
		};
		p2pDiscoveredPeerInfo = {
			ipAddress: defaultPeerInfo.ipAddress,
			wsPort: defaultPeerInfo.wsPort,
			height: 1000,
			updatedAt: new Date(),
			os: 'MYOS',
			version: '1.3.0',
			protocolVersion: '1.3',
		};
		defaultPeer = new Peer(defaultPeerInfo, peerConfig);
	});

	afterEach(() => {
		clock.restore();
		defaultPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of Peer class', () =>
			expect(defaultPeer).to.be.instanceof(Peer));

		it('should should have a function named _handleRawRPC ', () => {
			expect((defaultPeer as any)._handleRawRPC).to.be.a('function');
		});

		it('should should have a function named _handleWSMessage', () => {
			expect((defaultPeer as any)._handleWSMessage).to.be.a('function');
		});

		it('should should have a function named _handleRawMessage', () => {
			expect((defaultPeer as any)._handleRawMessage).to.be.a('function');
		});

		it('should should have a function named _handleRawLegacyMessagePostBlock', () => {
			expect((defaultPeer as any)._handleRawLegacyMessagePostBlock).to.be.a(
				'function',
			);
		});

		it('should should have a function named _handleRawLegacyMessagePostTransactions', () => {
			expect(
				(defaultPeer as any)._handleRawLegacyMessagePostTransactions,
			).to.be.a('function');
		});

		it('should should have a function named _handleRawLegacyMessagePostSignatures', () => {
			expect(
				(defaultPeer as any)._handleRawLegacyMessagePostSignatures,
			).to.be.a('function');
		});
	});

	describe('#height', () =>
		it('should get height property', () =>
			expect(defaultPeer.height).to.be.eql(defaultPeerInfo.height)));

	describe('#id', () =>
		it('should get id property', () =>
			expect(defaultPeer.id).to.be.eql(
				constructPeerIdFromPeerInfo({
					ipAddress: defaultPeerInfo.ipAddress,
					wsPort: defaultPeerInfo.wsPort,
				}),
			)));

	describe('#ipAddress', () =>
		it('should get ipAddress property', () =>
			expect(defaultPeer.ipAddress).to.be.eql(defaultPeerInfo.ipAddress)));

	describe('#wsPort', () =>
		it('should get wsPort property', () =>
			expect(defaultPeer.wsPort).to.be.eql(defaultPeerInfo.wsPort)));

	describe('#netgroup', () =>
		it('should get netgroup property', () =>
			expect(defaultPeer.netgroup).to.be.eql(
				getNetgroup(defaultPeerInfo.ipAddress, peerConfig.secret),
			)));

	describe('#reputation', () =>
		it('should get reputation property', () =>
			expect(defaultPeer.reputation).to.be.eql(DEFAULT_REPUTATION_SCORE)));

	describe('#latency', () =>
		it('should get latency property', () =>
			expect(defaultPeer.latency).to.be.eql(0)));

	describe('#connectTime', () =>
		it('should get connectTime property', () =>
			expect(defaultPeer.connectTime).to.be.at.least(0)));

	describe('#responseRate', () =>
		it('should get responseRate property', () =>
			expect(defaultPeer.responseRate).to.be.eql(0)));

	describe('#productivity', () =>
		it('should get productivity property', () => {
			const productivity = {
				requestCounter: 0,
				responseCounter: 0,
				responseRate: 0,
				lastResponded: 0,
			};

			expect(defaultPeer.productivity).to.eql(productivity);
		}));

	describe('#wsMessageRate', () =>
		it('should get wsMessageRate property', () =>
			expect(defaultPeer.wsMessageRate).to.be.eql(0)));

	describe('#state', () =>
		it('should get state property', () =>
			expect(defaultPeer.state).to.be.eql('closed')));

	describe('#peerInfo', () =>
		it('should get peerInfo property', () =>
			expect(defaultPeer.peerInfo).to.be.eql(defaultPeerInfo)));

	describe('#nodeInfo', () => {
		beforeEach(() => {
			sandbox.stub(defaultPeer, 'request').resolves();
		});

		it('should get node info', async () => {
			await defaultPeer.applyNodeInfo(nodeInfo);

			expect(defaultPeer.nodeInfo).to.be.eql(nodeInfo);
		});
	});

	describe('#updatePeerInfo', () =>
		it('should update peer info', () => {
			defaultPeer.updatePeerInfo(p2pDiscoveredPeerInfo);

			expect(defaultPeer.peerInfo).to.be.eql(p2pDiscoveredPeerInfo);
		}));

	describe('#applyNodeInfo', () => {
		beforeEach(() => {
			sandbox.stub(defaultPeer, 'request').resolves();
		});

		it('should apply node info', async () => {
			await defaultPeer.applyNodeInfo(nodeInfo);

			expect(defaultPeer.nodeInfo).to.be.eql(nodeInfo);
		});

		it('should call request with exact arguments', async () => {
			await defaultPeer.applyNodeInfo(nodeInfo);

			expect(defaultPeer.request).to.be.calledOnceWithExactly({
				procedure: REMOTE_EVENT_RPC_UPDATE_PEER_INFO,
				data: sanitizeNodeInfoToLegacyFormat(nodeInfo),
			});
		});
	});

	describe('#connect', () => {
		it('should throw error if socket does not exist', async () => {
			defaultPeer.disconnect();
			try {
				defaultPeer.connect();
			} catch (e) {
				expect(e).to.be.an('Error');
				expect(e.message).to.be.eql('Peer socket does not exist');
			}
		});

		it('should not throw error if socket exists', () => {
			const socket = <SCServerSocket>({
				destroy: sandbox.stub(),
			} as any);

			try {
				(defaultPeer as any)._socket = socket;
				defaultPeer.connect();
				expect((defaultPeer as any)._socket).to.be.not.undefined;
			} catch (e) {
				expect(e).to.be.undefined;
			}
		});
	});

	describe('#disconnect', () => {
		it('should clear _counterResetInterval', () => {
			sandbox.spy(defaultPeer as any, '_resetCounters');
			defaultPeer.disconnect();
			clock.tick(peerConfig.rateCalculationInterval + 1);
			expect((defaultPeer as any)._resetCounters).to.not.be.called;
		});

		it('should clear _productivityResetInterval', () => {
			sandbox.spy(defaultPeer as any, '_resetProductivity');
			defaultPeer.disconnect();
			clock.tick(DEFAULT_PRODUCTIVITY_RESET_INTERVAL + 1);
			expect((defaultPeer as any)._resetProductivity).to.not.be.called;
		});

		it('should destroy socket if it exists', async () => {
			const socket = <SCServerSocket>({
				destroy: sandbox.stub(),
			} as any);
			(defaultPeer as any)._socket = socket;
			defaultPeer.disconnect();
			expect(socket.destroy).to.be.calledOnceWithExactly(1000, undefined);
		});
	});

	describe('#send', () => {
		it('should throw error if socket does not exists', () => {
			const p2pPacket = {
				data: 'myData',
				event: 'myEvent',
			};
			try {
				defaultPeer.send(p2pPacket);
			} catch (e) {
				expect(e).to.be.an('Error');
				expect(e.message).to.be.eql('Peer socket does not exist');
			}
		});

		describe('when events are legacy', () => {
			const legacyEvents = ['postBlock', 'postTransactions', 'postSignatures'];

			legacyEvents.forEach(event => {
				it(`should emit legacy remote events if '${event}' event`, () => {
					const p2pPacket = {
						data: 'myData',
						event,
					};
					const socket = <SCServerSocket>({
						emit: sandbox.stub(),
						destroy: sandbox.stub(),
					} as any);
					(defaultPeer as any)._socket = socket;
					defaultPeer.send(p2pPacket);
					expect(socket.emit).to.be.calledOnceWithExactly(
						p2pPacket.event,
						p2pPacket.data,
					);
				});
			});
		});

		describe('when events are not legacy', () => {
			it(`should emit with ${REMOTE_SC_EVENT_MESSAGE} event`, () => {
				const p2pPacket = {
					data: 'myData',
					event: 'myEvent',
				};
				const socket = <SCServerSocket>({
					emit: sandbox.stub(),
					destroy: sandbox.stub(),
				} as any);
				(defaultPeer as any)._socket = socket;
				defaultPeer.send(p2pPacket);
				expect(socket.emit).to.be.calledOnceWithExactly(
					REMOTE_SC_EVENT_MESSAGE,
					{
						event: p2pPacket.event,
						data: p2pPacket.data,
					},
				);
			});
		});
	});

	describe('#request', () => {
		it('should throw error if socket does not exists', async () => {
			const p2pPacket = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			try {
				await defaultPeer.request(p2pPacket);
			} catch (e) {
				expect(e).to.be.an('Error');
				expect(e.message).to.be.eql('Peer socket does not exist');
			}
		});

		it('should emit if socket exists', () => {
			const p2pPacket = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			const socket = <SCServerSocket>({
				emit: sandbox.stub(),
				destroy: sandbox.stub(),
			} as any);
			(defaultPeer as any)._socket = socket;
			defaultPeer.request(p2pPacket);
			expect(socket.emit).to.be.calledOnceWith(REMOTE_SC_EVENT_RPC_REQUEST, {
				type: '/RPCRequest',
				procedure: p2pPacket.procedure,
				data: p2pPacket.data,
			});
		});
	});

	describe('#fetchPeers', () => {
		it('should call request', async () => {
			sandbox.stub(defaultPeer, 'request').resolves({
				data: {
					peers: [],
					success: true,
				},
			});
			await defaultPeer.fetchPeers();
			expect(defaultPeer.request).to.be.calledOnceWith({
				procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
			});
		});

		describe('when request() fails', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer, 'emit');
				sandbox.stub(defaultPeer, 'request').throws('Error');
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEERS} event`, async () => {
				try {
					await defaultPeer.fetchPeers();
				} catch (e) {
					expect(defaultPeer.emit).to.be.calledOnceWith(
						EVENT_FAILED_TO_FETCH_PEERS,
					);
				}
			});

			it('should throw an error', async () => {
				try {
					await defaultPeer.fetchPeers();
				} catch (e) {
					expect(e).to.be.an.instanceOf(RPCResponseError);
					expect(e.message).to.be.eql('Failed to fetch peer list of peer');
					expect(e.peerId).to.be.eql(defaultPeerInfo.ipAddress);
				}
			});
		});

		describe('when request() succeeds', () => {
			it('should return a sanitized peer list', async () => {
				const peers = [
					{
						ip: '1.1.1.1',
						wsPort: 1111,
						version: '1.1.1',
					},
					{
						ip: '2.2.2.2',
						wsPort: 2222,
						version: '2.2.2',
					},
				];
				const sanitizedPeers = [
					{
						ipAddress: '1.1.1.1',
						wsPort: 1111,
						version: '1.1.1',
						height: 0,
						protocolVersion: undefined,
						os: '',
					},
					{
						ipAddress: '2.2.2.2',
						wsPort: 2222,
						version: '2.2.2',
						height: 0,
						protocolVersion: undefined,
						os: '',
					},
				];
				sandbox.stub(defaultPeer, 'request').resolves({
					data: {
						peers,
						success: true,
					},
				});
				const response = await defaultPeer.fetchPeers();
				expect(response).to.be.eql(sanitizedPeers);
			});
		});
	});

	describe('#discoverPeers', () => {
		let discoveredPeers: ReadonlyArray<P2PPeerInfo>;

		beforeEach(() => {
			discoveredPeers = [
				{
					ipAddress: '1.1.1.1',
					wsPort: 1111,
					version: '1.1.1',
					height: 0,
					protocolVersion: undefined,
					os: '',
				},
				{
					ipAddress: '2.2.2.2',
					wsPort: 2222,
					version: '2.2.2',
					height: 0,
					protocolVersion: undefined,
					os: '',
				},
			];
			sandbox.stub(defaultPeer, 'fetchPeers').resolves(discoveredPeers);
			sandbox.stub(defaultPeer, 'emit');
		});

		it('should call fetchPeers', async () => {
			await defaultPeer.discoverPeers();
			expect(defaultPeer.fetchPeers).to.be.calledOnce;
		});

		it(`should emit ${EVENT_DISCOVERED_PEER} event 2 times`, async () => {
			await defaultPeer.discoverPeers();
			expect(defaultPeer.emit).to.be.calledTwice;
		});

		it(`should emit ${EVENT_DISCOVERED_PEER} event with every peer info`, async () => {
			await defaultPeer.discoverPeers();
			expect(discoveredPeers).to.be.not.empty;
			discoveredPeers.forEach(discoveredPeer => {
				expect(defaultPeer.emit).to.be.calledWith(
					EVENT_DISCOVERED_PEER,
					discoveredPeer,
				);
			});
		});

		it(`should return discoveredPeerInfoList`, async () => {
			const discoveredPeerInfoList = await defaultPeer.discoverPeers();
			expect(discoveredPeerInfoList).to.be.eql(discoveredPeers);
		});
	});

	describe('#fetchStatus', () => {
		describe('when request() fails', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer, 'request').rejects();
				sandbox.stub(defaultPeer, 'emit');
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEER_INFO} event with error`, async () => {
				try {
					await defaultPeer.fetchStatus();
				} catch (e) {
					expect(defaultPeer.emit).to.be.calledOnceWith(
						EVENT_FAILED_TO_FETCH_PEER_INFO,
					);
				}
			});

			it('should throw error', async () => {
				try {
					await defaultPeer.fetchStatus();
				} catch (e) {
					expect(e).to.be.an.instanceOf(RPCResponseError);
					expect(e.message).to.be.eql('Failed to fetch peer info of peer');
					expect(e.peerId).to.be.eql(
						`${defaultPeerInfo.ipAddress}:${defaultPeerInfo.wsPort}`,
					);
				}
			});
		});

		describe('when request() succeeds', () => {
			describe('when _updateFromProtocolPeerInfo() fails', () => {
				beforeEach(() => {
					sandbox.stub(defaultPeer, 'request').resolves({
						data: {},
					});
					sandbox.stub(defaultPeer, 'emit');
				});

				it(`should emit ${EVENT_FAILED_PEER_INFO_UPDATE} event with error`, async () => {
					try {
						await defaultPeer.fetchStatus();
					} catch (e) {
						expect(defaultPeer.emit).to.be.calledOnceWith(
							EVENT_FAILED_PEER_INFO_UPDATE,
						);
					}
				});

				it('should throw error', async () => {
					try {
						await defaultPeer.fetchStatus();
					} catch (e) {
						expect(e).to.be.an.instanceOf(RPCResponseError);
						expect(e.message).to.be.eql(
							'Failed to update peer info of peer as part of fetch operation',
						);
						expect(e.peerId).to.be.eql(
							`${defaultPeerInfo.ipAddress}:${defaultPeerInfo.wsPort}`,
						);
					}
				});
			});

			describe('when _updateFromProtocolPeerInfo() succeeds', () => {
				const peer = {
					ip: '1.1.1.1',
					wsPort: 1111,
					version: '1.1.1',
				};

				beforeEach(() => {
					sandbox.stub(defaultPeer, 'request').resolves({
						data: peer,
					});
					sandbox.stub(defaultPeer, 'updatePeerInfo');
					sandbox.stub(defaultPeer, 'emit');
				});

				it(`should call updatePeerInfo()`, async () => {
					const newPeer = {
						wsPort: peer.wsPort,
						version: peer.version,
						ipAddress: defaultPeerInfo.ipAddress,
						height: 0,
						protocolVersion: undefined,
						os: '',
					};
					await defaultPeer.fetchStatus();
					expect(defaultPeer.updatePeerInfo).to.be.calledOnceWithExactly(
						newPeer,
					);
				});

				it(`should emit ${EVENT_UPDATED_PEER_INFO} event with fetched peer info`, async () => {
					const peerInfo = await defaultPeer.fetchStatus();
					expect(defaultPeer.emit).to.be.calledOnceWithExactly(
						EVENT_UPDATED_PEER_INFO,
						peerInfo,
					);
				});

				it('should return fetched peer info', async () => {
					const peerInfo = await defaultPeer.fetchStatus();
					expect(peerInfo).to.be.eql(defaultPeerInfo);
				});
			});
		});
	});

	describe('#applyPenalty', () => {
		describe('when reputation does not go below 0', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer as any, '_banPeer');
			});

			it('should apply penalty', () => {
				const reputation = defaultPeer.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.reputation).to.be.eql(reputation - penalty);
			});

			it('should not ban peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect((defaultPeer as any)._banPeer).to.be.not.called;
			});
		});

		describe('when reputation goes below 0', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer, 'emit');
				sandbox.stub(defaultPeer, 'disconnect');
			});

			it('should apply penalty', () => {
				const reputation = defaultPeer.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.reputation).to.be.eql(reputation - penalty);
			});

			it(`should emit ${EVENT_BAN_PEER} event`, () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.emit).to.be.calledOnceWithExactly(
					EVENT_BAN_PEER,
					defaultPeer.id,
				);
			});

			it('should disconnect peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.disconnect).to.be.calledOnceWithExactly(
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);
			});
		});
	});
});
