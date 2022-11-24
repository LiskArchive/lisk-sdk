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
import { codec } from '@liskhq/lisk-codec';
import { SCServerSocket } from 'socketcluster-server';
import { Peer } from '../../../src/peer';
import {
	DEFAULT_REPUTATION_SCORE,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_PRODUCTIVITY_RESET_INTERVAL,
	DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
	DEFAULT_WS_MAX_MESSAGE_RATE,
	DEFAULT_RATE_CALCULATION_INTERVAL,
	DEFAULT_MESSAGE_ENCODING_FORMAT,
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
import { getNetgroup, constructPeerId } from '../../../src/utils';
import { p2pTypes } from '../../../src';
import { defaultRPCSchemas } from '../../../src/schema';
import {
	PeerConfig,
	P2PMessagePacketBufferData,
	P2PRequestPacketBufferData,
} from '../../../src/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const createSocketStubInstance = () => <SCServerSocket>({
		emit: jest.fn(),
		destroy: jest.fn(),
	} as any);

describe('peer/base', () => {
	let defaultPeerInfo: p2pTypes.P2PPeerInfo;
	let peerConfig: PeerConfig;
	let p2pDiscoveredPeerInfo: p2pTypes.P2PPeerInfo;
	let defaultPeer: Peer;

	beforeEach(() => {
		jest.useFakeTimers();
		defaultPeerInfo = {
			peerId: constructPeerId('12.12.12.12', 5001),
			ipAddress: '12.12.12.12',
			port: 5001,
			sharedState: {
				networkVersion: '1.1',
				chainID: Buffer.from('chainID', 'hex'),
				nonce: 'nonce',
				options: {},
			},
		};
		peerConfig = {
			hostPort: 6001,
			rateCalculationInterval: DEFAULT_RATE_CALCULATION_INTERVAL,
			wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
			wsMaxMessageRatePenalty: DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
			peerStatusMessageRate: 4,
			serverNodeInfo: {
				chainID: Buffer.from('chainID', 'hex'),
				networkVersion: '1.2',
				nonce: 'nonce',
				advertiseAddress: true,
				options: {},
			},
			rpcSchemas: {
				...defaultRPCSchemas,
			},
		};
		p2pDiscoveredPeerInfo = {
			peerId: constructPeerId(defaultPeerInfo.ipAddress, defaultPeerInfo.port),
			ipAddress: defaultPeerInfo.ipAddress,
			port: defaultPeerInfo.port,
			sharedState: {
				networkVersion: '1.3',
				chainID: Buffer.from('chainID', 'hex'),
				nonce: 'nonce',
				options: {},
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
		it('should be an instance of Peer class', () => expect(defaultPeer).toBeInstanceOf(Peer));

		it('should have a function named _handleRawRPC', () => {
			expect((defaultPeer as any)._handleRawRPC).toEqual(expect.any(Function));
		});

		it('should have a function named _handleWSMessage', () => {
			expect((defaultPeer as any)._handleWSMessage).toEqual(expect.any(Function));
		});

		it('should have a function named _handleRawMessage', () => {
			expect((defaultPeer as any)._handleRawMessage).toEqual(expect.any(Function));
		});
	});

	describe('#id', () => {
		it('should get id property', () => expect(defaultPeer.id).toEqual(defaultPeerInfo.peerId));
	});

	describe('#ipAddress', () => {
		it('should get ipAddress property', () =>
			expect(defaultPeer.ipAddress).toEqual(defaultPeerInfo.ipAddress));
	});

	describe('#port', () => {
		it('should get port property', () => expect(defaultPeer.port).toEqual(defaultPeerInfo.port));
	});

	describe('#netgroup', () => {
		it('should get netgroup property', () =>
			expect(defaultPeer.internalState.netgroup).toEqual(
				getNetgroup(defaultPeerInfo.ipAddress, peerConfig.secret),
			));
	});

	describe('#reputation', () => {
		it('should get reputation property', () =>
			expect(defaultPeer.internalState.reputation).toEqual(DEFAULT_REPUTATION_SCORE));
	});

	describe('#latency', () => {
		it('should get latency property', () => expect(defaultPeer.internalState.latency).toEqual(0));
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
		it('should get state property', () => expect(defaultPeer.state).toEqual('closed'));
	});

	describe('#peerInfo', () => {
		it('should get peerInfo property', () =>
			expect(defaultPeer.peerInfo.sharedState).toEqual(defaultPeerInfo.sharedState));
	});

	describe('#updatePeerInfo', () => {
		it('should update peer info', () => {
			defaultPeer.updatePeerInfo(p2pDiscoveredPeerInfo);

			expect(defaultPeer.peerInfo.sharedState).toEqual(p2pDiscoveredPeerInfo.sharedState);
		});
	});

	describe('#connect', () => {
		it('should throw error if socket does not exist', () => {
			defaultPeer.disconnect();
			expect(() => {
				defaultPeer.connect();
			}).toThrow('Peer socket does not exist');
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

			expect(_resetCounters).not.toHaveBeenCalled();
		});

		it('should clear _productivityResetInterval', () => {
			const _resetProductivity = jest.spyOn(defaultPeer as any, '_resetProductivity');

			defaultPeer.disconnect();

			jest.advanceTimersByTime(DEFAULT_PRODUCTIVITY_RESET_INTERVAL + 1);

			expect(_resetProductivity).not.toHaveBeenCalled();
		});

		it('should destroy socket if it exists', () => {
			(defaultPeer as any)._socket = createSocketStubInstance();
			defaultPeer.disconnect();
			expect((defaultPeer as any)._socket.destroy).toHaveBeenCalledWith(1000, undefined);
		});
	});

	describe('#send', () => {
		// Arrange
		let p2pPacket: P2PMessagePacketBufferData;
		beforeEach(() => {
			p2pPacket = {
				data: Buffer.from('myData'),
				event: 'myEvent',
			};
		});

		it('should throw error if socket does not exists', () => {
			expect(() => {
				defaultPeer.send(p2pPacket);
			}).toThrow('Peer socket does not exist');
		});

		it(`should emit for event ${REMOTE_SC_EVENT_MESSAGE}`, () => {
			(defaultPeer as any)._socket = createSocketStubInstance();

			// Act
			defaultPeer.send(p2pPacket);

			// Assert
			expect((defaultPeer as any)._socket.emit).toHaveBeenCalledWith(REMOTE_SC_EVENT_MESSAGE, {
				event: p2pPacket.event,
				data: p2pPacket.data?.toString(DEFAULT_MESSAGE_ENCODING_FORMAT),
			});
		});
	});

	describe('#request', () => {
		// Arrange
		let p2pPacket: P2PRequestPacketBufferData;
		beforeEach(() => {
			p2pPacket = {
				data: Buffer.from('myData'),
				procedure: 'myProcedure',
			};
		});

		it('should throw error if socket does not exists', async () => {
			return expect(defaultPeer.request(p2pPacket)).rejects.toThrow('Peer socket does not exist');
		});

		it('should emit if socket exists', () => {
			(defaultPeer as any)._socket = createSocketStubInstance();

			// Act
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			defaultPeer.request(p2pPacket);

			// Assert
			expect((defaultPeer as any)._socket.emit).toHaveBeenCalledTimes(1);
			expect((defaultPeer as any)._socket.emit).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				{
					procedure: p2pPacket.procedure,
					data: p2pPacket.data?.toString(DEFAULT_MESSAGE_ENCODING_FORMAT),
				},
				expect.any(Function),
			);
		});
	});

	describe('#fetchPeers', () => {
		it('should call request', async () => {
			const peerRequest = jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({
				data: Buffer.alloc(0),
			});

			await defaultPeer.fetchPeers();

			expect(peerRequest).toHaveBeenCalledTimes(1);
			expect(peerRequest).toHaveBeenCalledWith({
				procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
			});
		});

		describe('when request() fails', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'request').mockRejectedValue(EVENT_FAILED_TO_FETCH_PEERS);

				(defaultPeer as any).emit = jest.fn();
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEERS} event`, async () => {
				try {
					// Act
					await defaultPeer.fetchPeers();
					expect('never').toBe('called');
				} catch (e) {
					// Assert
					// eslint-disable-next-line jest/no-try-expect
					expect(defaultPeer.emit).toHaveBeenCalledTimes(1);
					// eslint-disable-next-line jest/no-try-expect
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(
						EVENT_FAILED_TO_FETCH_PEERS,
						EVENT_FAILED_TO_FETCH_PEERS,
					);
				}
			});

			it('should throw an error', async () => {
				return expect(defaultPeer.fetchPeers()).rejects.toThrow(RPCResponseError);
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
						port: 1111,
						sharedState: {},
					},
					{
						peerId: constructPeerId('2.2.2.2', 2222),
						ipAddress: '2.2.2.2',
						sourceAddress: '12.12.12.12',
						port: 2222,
						sharedState: {},
					},
				];
				const sanitizedPeers = [
					{
						peerId: constructPeerId('1.1.1.1', 1111),
						ipAddress: '1.1.1.1',
						sourceAddress: '12.12.12.12',
						port: 1111,
						sharedState: {},
					},
					{
						peerId: constructPeerId('2.2.2.2', 2222),
						ipAddress: '2.2.2.2',
						sourceAddress: '12.12.12.12',
						port: 2222,
						sharedState: {},
					},
				];
				codec.addSchema(defaultRPCSchemas.peerInfo);
				codec.addSchema(defaultRPCSchemas.peerRequestResponse);

				const encodedPeers = peers.map(peer =>
					codec.encode(defaultRPCSchemas.peerInfo, {
						ipAddress: peer.ipAddress,
						port: peer.port,
					}),
				);
				const data = codec.encode(defaultRPCSchemas.peerRequestResponse, {
					peers: encodedPeers,
				});

				jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({ data });
				const response = await defaultPeer.fetchPeers();
				expect(response).toEqual(sanitizedPeers);
			});

			it('should throw apply penalty on malformed Peer list', async () => {
				const malformedPeerList = [...new Array(1001).keys()].map(index => ({
					peerId: `'1.1.1.1:${1 + index}`,
					ipAddress: '1.1.1.1',
					port: 1 + index,
					sharedState: {},
				}));

				const encodedMalformedPeersList = malformedPeerList.map(peer =>
					codec.encode(defaultRPCSchemas.peerInfo, {
						ipAddress: peer.ipAddress,
						port: peer.port,
					}),
				);
				const data = codec.encode(defaultRPCSchemas.peerRequestResponse, {
					peers: encodedMalformedPeersList,
				});

				jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({ data });

				try {
					await defaultPeer.fetchPeers();
				} catch (e) {
					// eslint-disable-next-line jest/no-try-expect
					expect(defaultPeer.applyPenalty).toHaveBeenCalledTimes(1);
					// eslint-disable-next-line jest/no-try-expect
					expect(defaultPeer.applyPenalty).toHaveBeenCalledWith(100);
				}
			});

			it('should throw apply penalty on malformed Peer', async () => {
				const malformedPeerList = [
					{
						peerId: "'1.1.1.1:5000",
						ipAddress: '1.1.1.1',
						port: 1111,
						sharedState: {
							version: '1.1.1',
							junkData: [...new Array(10000).keys()].map(() => 'a'),
						},
					},
				];

				const encodedMalformedPeersList = malformedPeerList.map(peer =>
					codec.encode(defaultRPCSchemas.peerInfo, {
						ipAddress: peer.ipAddress,
						port: peer.port,
					}),
				);
				const data = codec.encode(defaultRPCSchemas.peerRequestResponse, {
					peers: encodedMalformedPeersList,
				});

				jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({ data });

				try {
					await defaultPeer.fetchPeers();
				} catch (e) {
					// eslint-disable-next-line jest/no-try-expect
					expect(defaultPeer.applyPenalty).toHaveBeenCalledTimes(1);
					// eslint-disable-next-line jest/no-try-expect
					expect(defaultPeer.applyPenalty).toHaveBeenCalledWith(100);
				}
			});
		});
	});

	describe('#discoverPeers', () => {
		let discoveredPeers: ReadonlyArray<p2pTypes.P2PPeerInfo>;

		beforeEach(() => {
			discoveredPeers = [
				{
					peerId: constructPeerId('1.1.1.1', 1111),
					ipAddress: '1.1.1.1',
					port: 1111,
					sharedState: {
						chainID: Buffer.from('chainID', 'hex'),
						nonce: 'nonce',
						networkVersion: '',
						options: {},
					},
				},
				{
					peerId: constructPeerId('2.2.2.2', 2222),
					ipAddress: '2.2.2.2',
					port: 2222,
					sharedState: {
						chainID: Buffer.from('chainID', 'hex'),
						nonce: 'nonce',
						networkVersion: '',
						options: {},
					},
				},
			];
			jest.spyOn(defaultPeer as any, 'fetchPeers').mockResolvedValue(discoveredPeers);
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

		it('should return discoveredPeerInfoList', async () => {
			const discoveredPeerInfoList = await defaultPeer.discoverPeers();
			expect(discoveredPeerInfoList).toEqual(discoveredPeers);
		});
	});

	describe('#fetchAndUpdateStatus', () => {
		describe('when request() fails', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'request').mockRejectedValue(EVENT_FAILED_TO_FETCH_PEER_INFO);
				jest.spyOn(defaultPeer, 'emit');
			});

			it(`should emit ${EVENT_FAILED_TO_FETCH_PEER_INFO} event with error`, async () => {
				try {
					await defaultPeer.fetchAndUpdateStatus();
					expect('never').toBe('called');
				} catch (e) {
					// eslint-disable-next-line jest/no-try-expect
					expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
					// eslint-disable-next-line jest/no-try-expect
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(
						EVENT_FAILED_TO_FETCH_PEER_INFO,
						EVENT_FAILED_TO_FETCH_PEER_INFO,
					);
				}
			});

			it('should throw error', async () => {
				return expect(defaultPeer.fetchAndUpdateStatus()).rejects.toThrow(RPCResponseError);
			});
		});

		describe('when request() succeeds', () => {
			describe('when nodeInfo contains malformed information', () => {
				const invalidData = {
					data: '0b4bfc826a027f228c21da9e4ce2eef156f0742719b6b2466ec706b15441025f638f748b22adfab873561587be7285be3e3888cd9acdce226e342cf196fbc2c5',
				};
				beforeEach(() => {
					jest.spyOn(defaultPeer as any, 'request').mockResolvedValue(invalidData);
					jest.spyOn(defaultPeer, 'emit');
					jest.spyOn(defaultPeer, 'applyPenalty');
				});

				it('should apply penalty', async () => {
					expect.assertions(2);
					try {
						await defaultPeer.fetchAndUpdateStatus();
					} catch (error) {
						// eslint-disable-next-line jest/no-try-expect
						expect(defaultPeer.applyPenalty).toHaveBeenCalledTimes(1);
						// eslint-disable-next-line jest/no-try-expect
						expect(defaultPeer.applyPenalty).toHaveBeenCalledWith(100);
					}
				});

				it('should throw error', async () => {
					return expect(defaultPeer.fetchAndUpdateStatus()).rejects.toThrow(RPCResponseError);
				});
			});

			describe('when _updateFromProtocolPeerInfo() fails', () => {
				const nodeInfo = {
					advertiseAddress: true,
					nonce: '1111',
					networkVersion: '9.2',
					chainID: Buffer.from('chainID', 'hex'),
				};
				beforeEach(() => {
					const encodedResponse = codec.encode(defaultRPCSchemas.nodeInfo, nodeInfo);
					jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({ data: encodedResponse });
					jest.spyOn(defaultPeer, 'emit');
				});

				it(`should emit ${EVENT_FAILED_PEER_INFO_UPDATE} event with error`, async () => {
					try {
						await defaultPeer.fetchAndUpdateStatus();
						expect('never').toBe('called');
					} catch (error) {
						// eslint-disable-next-line jest/no-try-expect
						expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
						// eslint-disable-next-line jest/no-try-expect
						expect((defaultPeer as any).emit).toHaveBeenCalledWith(
							EVENT_FAILED_PEER_INFO_UPDATE,
							expect.any(Error),
						);
					}
				});

				it('should throw error', async () => {
					return expect(defaultPeer.fetchAndUpdateStatus()).rejects.toThrow(RPCResponseError);
				});
			});

			describe('when _updateFromProtocolPeerInfo() succeeds', () => {
				const peerSharedState = {
					advertiseAddress: false,
					nonce: '',
					networkVersion: '1.2',
					chainID: Buffer.from('chainID', 'hex'),
				};

				beforeEach(() => {
					codec.addSchema(defaultRPCSchemas.peerInfo);
					codec.addSchema(defaultRPCSchemas.peerRequestResponse);
					const encodedResponse = codec.encode(defaultRPCSchemas.nodeInfo, peerSharedState);

					jest.spyOn(defaultPeer as any, 'request').mockResolvedValue({ data: encodedResponse });
					jest.spyOn(defaultPeer, 'updatePeerInfo');
					jest.spyOn(defaultPeer, 'emit');
				});

				it('should call updatePeerInfo()', async () => {
					// Arrange
					const defaultProtocolPeerInfo = {
						peerId: constructPeerId(defaultPeerInfo.ipAddress, defaultPeerInfo.port),
						ipAddress: defaultPeerInfo.ipAddress,
						port: defaultPeerInfo.port,
						sharedState: {
							advertiseAddress: false,
							networkVersion: '1.2',
							chainID: Buffer.from('chainID', 'hex'),
							nonce: '',
						},
					};

					// Act
					await defaultPeer.fetchAndUpdateStatus();

					// Assert
					expect(defaultPeer.updatePeerInfo).toHaveBeenCalledWith(defaultProtocolPeerInfo);
				});

				it(`should emit ${EVENT_UPDATED_PEER_INFO} event with fetched peer info`, async () => {
					const peerInfo = await defaultPeer.fetchAndUpdateStatus();
					expect((defaultPeer as any).emit).toHaveBeenCalledWith(EVENT_UPDATED_PEER_INFO, peerInfo);
				});

				it('should return fetched peer info', async () => {
					const peerInfo = await defaultPeer.fetchAndUpdateStatus();
					expect(peerInfo.sharedState).toMatchObject({
						chainID: Buffer.from('chainID', 'hex'),
						networkVersion: '1.2',
					});
				});
			});
		});
	});

	describe('#applyPenalty', () => {
		describe('when reputation does not go below 0', () => {
			it('should apply penalty', () => {
				const { reputation } = defaultPeer.internalState;
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.internalState.reputation).toEqual(reputation - penalty);
			});

			it('should not ban peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE / 10;

				const banPeerSpy = jest.spyOn(defaultPeer as any, '_banPeer');

				defaultPeer.applyPenalty(penalty);

				expect(banPeerSpy).not.toHaveBeenCalled();
			});
		});

		describe('when reputation goes below 0', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer, 'disconnect');
				jest.spyOn(defaultPeer, 'emit');
			});

			it('should apply penalty', () => {
				const { reputation } = defaultPeer.internalState;
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.internalState.reputation).toEqual(reputation - penalty);
			});

			it(`should emit ${EVENT_BAN_PEER} event`, () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect((defaultPeer as any).emit).toHaveBeenCalledWith(EVENT_BAN_PEER, defaultPeer.id);
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
				const { reputation } = defaultPeer.peerInfo.internalState;

				// Act
				[...PROTOCOL_EVENTS_TO_RATE_LIMIT.keys()].forEach(procedure => {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					(defaultPeer as any)._handleRawRPC({ procedure }, () => {});
				});

				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				// Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(reputation);
			});

			it('should apply penalty for getPeers flood', () => {
				// Arrange
				const rawMessageRPC = {
					procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
				};
				const { reputation } = defaultPeer.peerInfo.internalState;
				const requestCount = 9;

				// Act
				for (let i = 0; i < requestCount; i += 1) {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					(defaultPeer as any)._handleRawRPC(rawMessageRPC, () => {});
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				// Assert
				// ((requestCount - 1) * 10) is the penalty added for every getPeers RPC request after the first request
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(
					reputation - DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY - (requestCount - 1) * 10,
				);
			});

			it('should not apply any penalty for second getPeers after 10 secs', () => {
				// Arrange
				const rawMessageRPC = {
					procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
				};

				// Act
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				(defaultPeer as any)._handleRawRPC(rawMessageRPC, () => {});

				// Assert
				expect(defaultPeer['_discoveryMessageCounter'].getPeers).toBe(1);
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(100);

				// Act
				jest.advanceTimersByTime(10000);

				// eslint-disable-next-line @typescript-eslint/no-empty-function
				(defaultPeer as any)._handleRawRPC(rawMessageRPC, () => {});

				// Assert
				expect(defaultPeer['_discoveryMessageCounter'].getPeers).toBe(1);
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(100);
			});

			it('should silent the request events after limit exceed', () => {
				// Arrange
				const rawMessageRPC = {
					procedure: REMOTE_EVENT_RPC_GET_PEERS_LIST,
				};
				const requestCount = 10;

				// Act
				for (let i = 0; i < requestCount; i += 1) {
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					(defaultPeer as any)._handleRawRPC(rawMessageRPC, () => {});
				}

				// Assert
				expect((defaultPeer as any).emit).toHaveBeenCalledTimes(1);
			});
		});

		describe('when messagesRate limit exceed', () => {
			beforeEach(() => {
				jest.spyOn(defaultPeer as any, 'applyPenalty');
			});

			it('should apply penalty for messagesRate exceeded', () => {
				// Arrange
				const { reputation } = defaultPeer.peerInfo.internalState;
				const messageCount = 101;

				// Act
				for (let i = 0; i < messageCount; i += 1) {
					(defaultPeer as any)._handleWSMessage();
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				// Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(
					reputation - DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY,
				);
			});

			it('should increase penalty based on rate limit exceeded', () => {
				// Arrange
				const { reputation } = defaultPeer.peerInfo.internalState;
				const messageCount = 201;
				const expectedPenalty =
					DEFAULT_WS_MAX_MESSAGE_RATE_PENALTY *
					Math.floor(messageCount / DEFAULT_WS_MAX_MESSAGE_RATE);

				// Act
				for (let i = 0; i < messageCount; i += 1) {
					(defaultPeer as any)._handleWSMessage();
				}
				jest.advanceTimersByTime(peerConfig.rateCalculationInterval + 1);

				// Assert
				expect(defaultPeer.peerInfo.internalState.reputation).toBe(reputation - expectedPenalty);
			});
		});
	});
});
