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
import { Peer, PeerConfig } from '../../../src/peer';
import {
	DEFAULT_REPUTATION_SCORE,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_PRODUCTIVITY_RESET_INTERVAL,
	DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
	DEFAULT_WS_MAX_MESSAGE_RATE,
	DEFAULT_RATE_CALCULATION_INTERVAL,
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
	PROTOCOL_EVENTS_TO_RATE_LIMIT,
} from '../../../src/events';
import { RPCResponseError } from '../../../src/errors';
import { SCServerSocket } from 'socketcluster-server';
import { getNetgroup, constructPeerId } from '../../../src/utils';
import { P2PPeerInfo } from '../../../src';

const createSocketStubInstance = () => <SCServerSocket>({
		emit: jest.fn(),
		destroy: jest.fn(),
	} as any);

describe('peer/base', () => {
	let defaultPeerInfo: P2PPeerInfo;
	let peerConfig: PeerConfig;
	let p2pDiscoveredPeerInfo: P2PPeerInfo;
	let defaultPeer: Peer;

	beforeEach(() => {
		jest.useFakeTimers();
		defaultPeerInfo = {
			peerId: constructPeerId('12.12.12.12', 5001),
			ipAddress: '12.12.12.12',
			wsPort: 5001,
			sharedState: {
				height: 545776,
				isDiscoveredPeer: true,
				version: '1.1.1',
				protocolVersion: '1.1',
			},
		};
		peerConfig = {
			rateCalculationInterval: DEFAULT_RATE_CALCULATION_INTERVAL,
			wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
			wsMaxMessageRatePenalty: DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
			serverNodeInfo: {
				os: 'os',
				networkId: 'networkId',
				version: '1.2.0',
				protocolVersion: '1.2',
				wsPort: 6001,
				nonce: 'nonce',
				advertiseAddress: true,
			},
		};
		p2pDiscoveredPeerInfo = {
			peerId: constructPeerId(
				defaultPeerInfo.ipAddress,
				defaultPeerInfo.wsPort,
			),
			ipAddress: defaultPeerInfo.ipAddress,
			wsPort: defaultPeerInfo.wsPort,
			sharedState: {
				height: 1000,
				updatedAt: new Date(),
				os: 'MYOS',
				version: '1.3.0',
				protocolVersion: '1.3',
			},
			internalState: undefined,
		};

		defaultPeer = new Peer(defaultPeerInfo, peerConfig);
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.restoreAllMocks();
		defaultPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of Peer class', () =>
			expect(defaultPeer).toBeInstanceOf(Peer));

		it('should have a function named _handleRawRPC ', () => {
			expect((defaultPeer as any)._handleRawRPC).toEqual(expect.any(Function));
		});

		it('should have a function named _handleWSMessage', () => {
			expect((defaultPeer as any)._handleWSMessage).toEqual(
				expect.any(Function),
			);
		});

		it('should have a function named _handleRawMessage', () => {
			expect((defaultPeer as any)._handleRawMessage).toEqual(
				expect.any(Function),
			);
		});
	});

	describe('#id', () => {
		it('should get id property', () =>
			expect(defaultPeer.id).toEqual(defaultPeerInfo.peerId));
	});

	describe('#ipAddress', () => {
		it('should get ipAddress property', () =>
			expect(defaultPeer.ipAddress).toEqual(defaultPeerInfo.ipAddress));
	});

	describe('#wsPort', () => {
		it('should get wsPort property', () =>
			expect(defaultPeer.wsPort).toEqual(defaultPeerInfo.wsPort));
	});

	describe('#netgroup', () => {
		it('should get netgroup property', () =>
			expect(defaultPeer.internalState.netgroup).toEqual(
				getNetgroup(defaultPeerInfo.ipAddress, peerConfig.secret),
			));
	});

	describe('#reputation', () => {
		it('should get reputation property', () =>
			expect(defaultPeer.internalState.reputation).toEqual(
				DEFAULT_REPUTATION_SCORE,
			));
	});

	describe('#latency', () => {
		it('should get latency property', () =>
			expect(defaultPeer.internalState.latency).toEqual(0));
	});

	describe('#connectTime', () => {
		it('should get connectTime property', () =>
			expect(defaultPeer.internalState.connectTime).toBeGreaterThanOrEqual(0));
	});

	describe('#responseRate', () => {
		it('should get responseRate property', () =>
			expect(defaultPeer.internalState.productivity.responseRate).toEqual(0));
	});

	describe('#productivity', () => {
		it('should get productivity property', () => {
			const productivity = {
				requestCounter: 0,
				responseCounter: 0,
				responseRate: 0,
				lastResponded: 0,
			};

			expect(defaultPeer.internalState.productivity).toEqual(productivity);
		});
	});

	describe('#wsMessageRate', () => {
		it('should get wsMessageRate property', () =>
			expect(defaultPeer.internalState.wsMessageRate).toEqual(0));
	});

	describe('#state', () => {
		it('should get state property', () =>
			expect(defaultPeer.state).toEqual('closed'));
	});

	describe('#peerInfo', () => {
		it('should get peerInfo property', () =>
			expect(defaultPeer.peerInfo.sharedState).toEqual(
				defaultPeerInfo.sharedState,
			));
	});

	describe('#updatePeerInfo', () => {
		it('should update peer info', () => {
			defaultPeer.updatePeerInfo(p2pDiscoveredPeerInfo);

			expect(defaultPeer.peerInfo.sharedState).toEqual(
				p2pDiscoveredPeerInfo.sharedState,
			);
		});
	});

	describe('#connect', () => {
		it('should throw error if socket does not exist', () => {
			defaultPeer.disconnect();
			expect(() => {
				defaultPeer.connect();
			}).toThrowError('Peer socket does not exist');
		});

		it('should not throw error if socket exists', () => {
			(defaultPeer as any)._socket = createSocketStubInstance();
			defaultPeer.connect();
			expect((defaultPeer as any)._socket).toBeDefined();
		});
	});

	describe('#disconnect', () => {
		it('should clear _counterResetInterval', () => {
			const _resetCounters = jest.spyOn(defaultPeer as any, '_resetCounters');

			defaultPeer.disconnect();

			jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

			expect(_resetCounters).not.toHaveBeenCalled;
		});

		it('should clear _productivityResetInterval', () => {
			const _resetProductivity = jest.spyOn(
				defaultPeer as any,
				'_resetProductivity',
			);

			defaultPeer.disconnect();

			jest.advanceTimersByTime(DEFAULT_PRODUCTIVITY_RESET_INTERVAL + 1);

			expect(_resetProductivity).not.toHaveBeenCalled;
		});

		it('should destroy socket if it exists', () => {
			(defaultPeer as any)._socket = createSocketStubInstance();
			defaultPeer.disconnect();
			expect((defaultPeer as any)._socket.destroy).toHaveBeenCalledWith(
				1000,
				undefined,
			);
		});
	});

	describe('#send', () => {
		it('should throw error if socket does not exists', () => {
			const p2pPacket = {
				data: 'myData',
				event: 'myEvent',
			};
			expect(() => {
				defaultPeer.send(p2pPacket);
			}).toThrowError('Peer socket does not exist');
		});

		it(`should emit for event ${REMOTE_SC_EVENT_MESSAGE}`, () => {
			// Arrange
			const p2pPacket = {
				data: 'myData',
				event: 'myEvent',
			};
			(defaultPeer as any)._socket = createSocketStubInstance();

			// Act
			defaultPeer.send(p2pPacket);

			// Assert
			expect((defaultPeer as any)._socket.emit).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_MESSAGE,
				{
					event: p2pPacket.event,
					data: p2pPacket.data,
				},
			);
		});
	});

	describe('#request', () => {
		it('should throw error if socket does not exists', async () => {
			const p2pPacket = {
				data: 'myData',
				procedure: 'myProcedure',
			};

			return expect(defaultPeer.request(p2pPacket)).rejects.toThrow(
				'Peer socket does not exist',
			);
		});

		it('should emit if socket exists', () => {
			// Arrange
			const p2pPacket = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			(defaultPeer as any)._socket = createSocketStubInstance();

			// Act
			defaultPeer.request(p2pPacket);

			// Assert
			expect((defaultPeer as any)._socket.emit).toHaveBeenCalledTimes(1);
			expect((defaultPeer as any)._socket.emit).toBeCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				{
					procedure: p2pPacket.procedure,
					data: p2pPacket.data,
				},
				expect.any(Function),
			);
		});
	});

	describe('#fetchPeers', () => {
		it('should call request', async () => {
			const peerRequest = jest.spyOn(defaultPeer, 'request').mockResolvedValue({
				data: {
					peers: [],
					success: true,
				},
			});

			await defaultPeer.fetchPeers();

			expect(peerRequest).toHaveBeenCalledTimes(1);
			expect(peerRequest).toHaveBeenCalledWith({
				procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
			});
		});

		describe('when request() fails', () => {
			beforeEach(() => {
				jest
					.spyOn(defaultPeer, 'request')
					.mockRejectedValue(EVENT_FAILED_TO_FETCH_PEERS);

				(defaultPeer as any).emit = jest.fn();
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEERS} event`, async () => {
				try {
					// Act
					await defaultPeer.fetchPeers();
					expect('never').toBe('called');
				} catch (e) {
					// Assert
					expect(defaultPeer.emit).toHaveBeenCalledTimes(1);
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(
						EVENT_FAILED_TO_FETCH_PEERS,
						EVENT_FAILED_TO_FETCH_PEERS,
					);
				}
			});

			it('should throw an error', async () => {
				return expect(defaultPeer.fetchPeers()).rejects.toThrow(
					RPCResponseError,
				);
			});
		});

		describe('when request() succeeds', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'applyPenalty');
			});
			it('should return a sanitized peer list', async () => {
				const peers = [
					{
						peerId: constructPeerId('1.1.1.1', 1111),
						ipAddress: '1.1.1.1',
						sourceAddress: '12.12.12.12',
						wsPort: 1111,
						sharedState: {
							version: '1.1.1',
						},
					},
					{
						peerId: constructPeerId('2.2.2.2', 2222),
						ipAddress: '2.2.2.2',
						sourceAddress: '12.12.12.12',
						wsPort: 2222,
						sharedState: {
							version: '2.2.2',
						},
					},
				];
				const sanitizedPeers = [
					{
						peerId: constructPeerId('1.1.1.1', 1111),
						ipAddress: '1.1.1.1',
						sourceAddress: '12.12.12.12',
						wsPort: 1111,
						sharedState: {
							version: '1.1.1',
							height: 0,
						},
					},
					{
						peerId: constructPeerId('2.2.2.2', 2222),
						ipAddress: '2.2.2.2',
						sourceAddress: '12.12.12.12',
						wsPort: 2222,
						sharedState: {
							version: '2.2.2',
							height: 0,
						},
					},
				];
				jest.spyOn(defaultPeer, 'request').mockResolvedValue({
					data: {
						peers: peers.map(peer => ({
							...peer.sharedState,
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						})),
						success: true,
					},
				});
				const response = await defaultPeer.fetchPeers();
				expect(response).toEqual(sanitizedPeers);
			});

			it('should throw apply penalty on malformed Peer list', async () => {
				const malformedPeerList = [...new Array(1001).keys()].map(index => ({
					peerId: `'1.1.1.1:${1 + index}`,
					ipAddress: '1.1.1.1',
					wsPort: 1 + index,
					sharedState: {
						version: '1.1.1',
					},
				}));

				jest.spyOn(defaultPeer, 'request').mockResolvedValue({
					data: {
						peers: malformedPeerList.map(peer => ({
							...peer.sharedState,
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						})),
						success: true,
					},
				});

				try {
					await defaultPeer.fetchPeers();
					expect('never').toBe('called');
				} catch (e) {
					expect(defaultPeer.applyPenalty).toHaveBeenCalledTimes(1);
					expect(defaultPeer.applyPenalty).toHaveBeenCalledWith(100);
				}
			});

			it('should throw apply penalty on malformed Peer', async () => {
				const malformedPeerList = [
					{
						peerId: `'1.1.1.1:5000`,
						ipAddress: '1.1.1.1',
						wsPort: 1111,
						sharedState: {
							version: '1.1.1',
							junkData: [...new Array(10000).keys()].map(() => 'a'),
						},
					},
				];

				jest.spyOn(defaultPeer, 'request').mockResolvedValue({
					data: {
						peers: malformedPeerList.map(peer => ({
							...peer.sharedState,
							ipAddress: peer.ipAddress,
							wsPort: peer.wsPort,
						})),
						success: true,
					},
				});

				try {
					await defaultPeer.fetchPeers();
					expect('never').toBe('called');
				} catch (e) {
					expect(defaultPeer.applyPenalty).toHaveBeenCalledTimes(1);
					expect(defaultPeer.applyPenalty).toHaveBeenCalledWith(100);
				}
			});
		});
	});

	describe('#discoverPeers', () => {
		let discoveredPeers: ReadonlyArray<P2PPeerInfo>;

		beforeEach(() => {
			discoveredPeers = [
				{
					peerId: constructPeerId('1.1.1.1', 1111),
					ipAddress: '1.1.1.1',
					wsPort: 1111,
					sharedState: {
						version: '1.1.1',
						height: 0,
						protocolVersion: '',
						os: '',
					},
				},
				{
					peerId: constructPeerId('2.2.2.2', 2222),
					ipAddress: '2.2.2.2',
					wsPort: 2222,
					sharedState: {
						version: '2.2.2',
						height: 0,
						protocolVersion: '',
						os: '',
					},
				},
			];
			jest.spyOn(defaultPeer, 'fetchPeers').mockResolvedValue(discoveredPeers);
			jest.spyOn(defaultPeer, 'emit');
		});

		it('should call fetchPeers', async () => {
			await defaultPeer.discoverPeers();
			expect(defaultPeer.fetchPeers).toHaveBeenCalledTimes(1);
		});

		it(`should emit ${EVENT_DISCOVERED_PEER} event 2 times`, async () => {
			await defaultPeer.discoverPeers();
			expect((defaultPeer as any).emit).toHaveBeenCalledTimes(2);
		});

		it(`should emit ${EVENT_DISCOVERED_PEER} event with every peer info`, async () => {
			await defaultPeer.discoverPeers();
			expect(Object.keys(discoveredPeers)).not.toHaveLength(0);
			discoveredPeers.forEach(discoveredPeer => {
				expect((defaultPeer as any).emit).toHaveBeenCalledWith(
					EVENT_DISCOVERED_PEER,
					discoveredPeer,
				);
			});
		});

		it(`should return discoveredPeerInfoList`, async () => {
			const discoveredPeerInfoList = await defaultPeer.discoverPeers();
			expect(discoveredPeerInfoList).toEqual(discoveredPeers);
		});
	});

	describe('#fetchAndUpdateStatus', () => {
		describe('when request() fails', () => {
			beforeEach(() => {
				jest
					.spyOn(defaultPeer, 'request')
					.mockRejectedValue(EVENT_FAILED_TO_FETCH_PEER_INFO);
				jest.spyOn(defaultPeer, 'emit');
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEER_INFO} event with error`, async () => {
				try {
					await defaultPeer.fetchAndUpdateStatus();
					expect('never').toBe('called');
				} catch (e) {
					expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(
						EVENT_FAILED_TO_FETCH_PEER_INFO,
						EVENT_FAILED_TO_FETCH_PEER_INFO,
					);
				}
			});

			it('should throw error', async () => {
				return expect(defaultPeer.fetchAndUpdateStatus()).rejects.toThrow(
					RPCResponseError,
				);
			});
		});

		describe('when request() succeeds', () => {
			describe('when _updateFromProtocolPeerInfo() fails', () => {
				const peer = {
					ip: '1.1.1.1',
					wsPort: 1111,
					version: '1.1.2',
					protocolVersion: '9.2',
					networkId: 'networkId',
				};
				beforeEach(() => {
					jest.spyOn(defaultPeer, 'request').mockResolvedValue({
						data: peer,
					});
					jest.spyOn(defaultPeer, 'emit');
				});

				it(`should emit ${EVENT_FAILED_PEER_INFO_UPDATE} event with error`, async () => {
					try {
						await defaultPeer.fetchAndUpdateStatus();
						expect('never').toBe('called');
					} catch (error) {
						expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
						expect((defaultPeer as any).emit).toHaveBeenCalledWith(
							EVENT_FAILED_PEER_INFO_UPDATE,
							expect.any(Error),
						);
					}
				});

				it('should throw error', async () => {
					return expect(defaultPeer.fetchAndUpdateStatus()).rejects.toThrow(
						RPCResponseError,
					);
				});
			});

			describe('when _updateFromProtocolPeerInfo() succeeds', () => {
				const peerSharedState = {
					ipAddress: '1.1.1.1',
					wsPort: 1111,
					version: '1.1.2',
					protocolVersion: '1.2',
					networkId: 'networkId',
				};

				beforeEach(() => {
					jest.spyOn(defaultPeer, 'request').mockResolvedValue({
						data: peerSharedState,
					});
					jest.spyOn(defaultPeer, 'updatePeerInfo');
					jest.spyOn(defaultPeer, 'emit');
				});

				it(`should call updatePeerInfo()`, async () => {
					// Arrange
					const defaultProtocolPeerInfo = {
						peerId: constructPeerId(
							defaultPeerInfo.ipAddress,
							defaultPeerInfo.wsPort,
						),
						ipAddress: defaultPeerInfo.ipAddress,
						wsPort: defaultPeerInfo.wsPort,
						sharedState: {
							version: peerSharedState.version,
							height: 0,
							protocolVersion: '1.2',
							networkId: 'networkId',
						},
					};

					// Act
					await defaultPeer.fetchAndUpdateStatus();

					// Assert
					expect(defaultPeer.updatePeerInfo).toHaveBeenCalledWith(
						defaultProtocolPeerInfo,
					);
				});

				it(`should emit ${EVENT_UPDATED_PEER_INFO} event with fetched peer info`, async () => {
					const peerInfo = await defaultPeer.fetchAndUpdateStatus();
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(
						EVENT_UPDATED_PEER_INFO,
						peerInfo,
					);
				});

				it('should return fetched peer info', async () => {
					const peerInfo = await defaultPeer.fetchAndUpdateStatus();
					expect(peerInfo.sharedState).toMatchSnapshot({
						height: 0,
						nethash: 'nethash',
						protocolVersion: '1.2',
						version: '1.1.2',
					});
				});
			});
		});
	});

	describe('#applyPenalty', () => {
		describe('when reputation does not go below 0', () => {
			it('should apply penalty', () => {
				const reputation = defaultPeer.internalState.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.internalState.reputation).toEqual(
					reputation - penalty,
				);
			});

			it('should not ban peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE / 10;

				const banPeerSpy = jest.spyOn(defaultPeer as any, '_banPeer');

				defaultPeer.applyPenalty(penalty);

				expect(banPeerSpy).not.toBeCalled();
			});
		});

		describe('when reputation goes below 0', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'disconnect');
				jest.spyOn(defaultPeer, 'emit');
			});

			it('should apply penalty', () => {
				const reputation = defaultPeer.internalState.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.internalState.reputation).toEqual(
					reputation - penalty,
				);
			});

			it(`should emit ${EVENT_BAN_PEER} event`, () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect((defaultPeer as any).emit).toHaveBeenCalledWith(
					EVENT_BAN_PEER,
					defaultPeer.id,
				);
			});

			it('should disconnect peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.disconnect).toHaveBeenCalledWith(
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);
			});
		});
	});

	describe('MessageRate and limiters', () => {
		describe('when protocol messages limit exceed', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'applyPenalty');
				jest.spyOn(defaultPeer, 'emit');
			});

			it('should not apply penalty inside rate limit', () => {
				// Arrange
				const reputation = defaultPeer.peerInfo.internalState.reputation;

				//Act
				[...PROTOCOL_EVENTS_TO_RATE_LIMIT.keys()].forEach(procedure => {
					(defaultPeer as any)._handleRawRPC({ procedure }, () => {});
				});

				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				//Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(reputation);
			});

			it('should apply penalty for getPeers flood', () => {
				// Arrange
				const rawMessageRCP = {
					procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
				};
				const reputation = defaultPeer.peerInfo.internalState.reputation;
				const requestCount = 10;

				//Act
				for (let i = 0; i < requestCount; i++) {
					(defaultPeer as any)._handleRawRPC(rawMessageRCP, () => {});
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				//Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(
					reputation - DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
				);
			});

			it('should silent the request events after limit exceed', () => {
				// Arrange
				const rawMessageRCP = {
					procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
				};
				const requestCount = 10;

				//Act
				for (let i = 0; i < requestCount; i++) {
					(defaultPeer as any)._handleRawRPC(rawMessageRCP, () => {});
				}

				//Assert
				expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
			});
		});

		describe('when messagesRate limit exceed', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer as any, 'applyPenalty');
			});

			it('should apply penalty for messagesRate exceeded', () => {
				// Arrange
				const reputation = defaultPeer.peerInfo.internalState.reputation;
				const messageCount = 101;

				//Act
				for (let i = 0; i < messageCount; i++) {
					(defaultPeer as any)._handleWSMessage();
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				//Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(
					reputation - DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
				);
			});

			it('should increase penalty based on rate limit exceeded', () => {
				// Arrange
				const reputation = defaultPeer.peerInfo.internalState.reputation;
				const messageCount = 201;
				const expectedPenalty =
					DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY *
					Math.floor(messageCount / DEFAULT_WS_MAX_MESSAGE_RATE);

				//Act
				for (let i = 0; i < messageCount; i++) {
					(defaultPeer as any)._handleWSMessage();
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				//Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(
					reputation - expectedPenalty,
				);
			});
		});
	});
});
