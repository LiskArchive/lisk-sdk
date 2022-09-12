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
import * as socketClusterClient from 'socketcluster-client';
import { SCClientSocket } from 'socketcluster-client';
import { OutboundPeer } from '../../../src/peer';

import { REMOTE_SC_EVENT_MESSAGE, REMOTE_SC_EVENT_RPC_REQUEST } from '../../../src/events';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_CONNECT_TIMEOUT,
	DEFAULT_ACK_TIMEOUT,
	DEFAULT_WS_MAX_MESSAGE_RATE,
	DEFAULT_HTTP_PATH,
	DEFAULT_MESSAGE_ENCODING_FORMAT,
} from '../../../src/constants';
import {
	P2PPeerInfo,
	P2PRequestPacketBufferData,
	P2PMessagePacketBufferData,
	PeerConfig,
} from '../../../src/types';
import { defaultRPCSchemas } from '../../../src/schema';

describe('peer/outbound', () => {
	let defaultPeerInfo: P2PPeerInfo;
	let defaultOutboundPeerConfig: PeerConfig;
	let defaultOutboundPeer: OutboundPeer;
	let outboundSocket: SCClientSocket;

	beforeEach(() => {
		defaultPeerInfo = {
			peerId: '12.12.12.12:5001',
			ipAddress: '12.12.12.12',
			port: 5001,
			sharedState: {
				nonce: 'nonce',
				chainID: Buffer.from('chainID', 'hex'),
				networkVersion: '1.1',
				options: {},
			},
		};
		defaultOutboundPeerConfig = {
			hostPort: 5000,
			rateCalculationInterval: 1000,
			wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
			wsMaxMessageRatePenalty: 10,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
			peerStatusMessageRate: 4,
			wsMaxPayload: 1000,
			rpcSchemas: {
				...defaultRPCSchemas,
			},
			serverNodeInfo: {
				advertiseAddress: true,
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				nonce: 'nonce',
				options: {
					height: 1,
				},
			},
		};
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		outboundSocket = <SCClientSocket>({
			on: jest.fn(),
			emit: jest.fn(),
			destroy: jest.fn(),
			off: jest.fn(),
			connect: jest.fn(),
		} as any);
		defaultOutboundPeer = new OutboundPeer(defaultPeerInfo, defaultOutboundPeerConfig);
	});

	afterEach(() => {
		defaultOutboundPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of OutboundPeer class', () =>
			expect(defaultOutboundPeer).toBeInstanceOf(OutboundPeer));
	});

	describe('#set socket', () => {
		it('should not unbind handlers from the outbound socket if it does not exist', () => {
			jest.spyOn(defaultOutboundPeer as any, '_unbindHandlersFromOutboundSocket');

			expect((defaultOutboundPeer as any)._socket).toBeUndefined();
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).not.toHaveBeenCalled();
		});

		it('should unbind handlers from outbound socket if it exists', () => {
			jest.spyOn(defaultOutboundPeer as any, '_unbindHandlersFromOutboundSocket');

			(defaultOutboundPeer as any)._socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket).toEqual(outboundSocket);
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).toHaveBeenCalled();
		});

		it('should set new socket', () => {
			expect((defaultOutboundPeer as any)._socket).toBeUndefined();
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket).toEqual(outboundSocket);
		});

		it('should call _bindHandlersToOutboundSocket with outbound socket', () => {
			jest.spyOn(defaultOutboundPeer as any, '_bindHandlersToOutboundSocket');
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._bindHandlersToOutboundSocket).toHaveBeenCalledWith(
				outboundSocket,
			);
		});

		it('should bind handlers to an outbound socket', () => {
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledTimes(7);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'error',
				expect.any(Function),
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'connect',
				expect.any(Function),
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'connectAbort',
				expect.any(Function),
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'close',
				expect.any(Function),
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'message',
				(defaultOutboundPeer as any)._handleWSMessage,
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				expect.any(Function),
			);
			expect((defaultOutboundPeer as any)._socket.on).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_MESSAGE,
				(defaultOutboundPeer as any)._handleRawMessage,
			);
		});
	});

	describe('#connect', () => {
		it('should not create outbound socket if one already exists', () => {
			jest.spyOn(defaultOutboundPeer as any, '_createOutboundSocket');
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.connect();
			expect((defaultOutboundPeer as any)._createOutboundSocket).not.toHaveBeenCalled();
		});

		it('should call connect', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.connect();
			expect(outboundSocket.connect).toHaveBeenCalled();
		});

		describe('when no outbound socket exists', () => {
			it('should call _createOutboundSocket', () => {
				jest
					.spyOn(defaultOutboundPeer as any, '_createOutboundSocket')
					.mockReturnValue(outboundSocket);

				expect((defaultOutboundPeer as any)._socket).toBeUndefined();
				defaultOutboundPeer.connect();
				expect((defaultOutboundPeer as any)._createOutboundSocket).toHaveBeenCalled();
				expect((defaultOutboundPeer as any)._socket).toEqual(outboundSocket);
			});

			it('should call socketClusterClient create method', () => {
				const clientOptions = {
					hostname: defaultOutboundPeer.ipAddress,
					port: defaultOutboundPeer.port,
					query: 'networkVersion=1.1&chainID=10000000&nonce=nonce&advertiseAddress=true&port=5000',
					path: DEFAULT_HTTP_PATH,
					connectTimeout: DEFAULT_CONNECT_TIMEOUT,
					ackTimeout: DEFAULT_ACK_TIMEOUT,
					multiplex: false,
					autoConnect: true,
					autoReconnect: false,
					maxPayload: defaultOutboundPeerConfig.wsMaxPayload,
				};
				jest.spyOn(socketClusterClient, 'create');
				defaultOutboundPeer.connect();
				expect(socketClusterClient.create).toHaveBeenCalledWith(clientOptions);
			});

			it('should bind handlers to the just created outbound socket', () => {
				jest.spyOn(defaultOutboundPeer as any, '_bindHandlersToOutboundSocket');
				expect((defaultOutboundPeer as any)._socket).toBeUndefined();
				defaultOutboundPeer.connect();
				expect((defaultOutboundPeer as any)._bindHandlersToOutboundSocket).toHaveBeenCalledWith(
					(defaultOutboundPeer as any)._socket,
				);
			});
		});
	});

	describe('#disconnect', () => {
		it('should call disconnect and destroy socket', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.disconnect();

			expect(outboundSocket.destroy).toHaveBeenCalledTimes(1);
			expect(outboundSocket.destroy).toHaveBeenCalledWith(1000, undefined);
		});

		it('should not unbind handlers if outbound socket does not exist', () => {
			jest.spyOn(defaultOutboundPeer as any, '_unbindHandlersFromOutboundSocket');

			defaultOutboundPeer.disconnect();
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).not.toHaveBeenCalled();
		});

		describe('when a socket exists', () => {
			it('should call _unbindHandlersFromOutboundSocket', () => {
				jest.spyOn(defaultOutboundPeer as any, '_unbindHandlersFromOutboundSocket');
				(defaultOutboundPeer as any)._socket = outboundSocket;
				defaultOutboundPeer.disconnect();
				expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).toHaveBeenCalled();
			});

			it('should unbind handlers from inbound socket', () => {
				(defaultOutboundPeer as any)._socket = outboundSocket;
				defaultOutboundPeer.disconnect();
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledTimes(7);
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith('connect');
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith('connectAbort');
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith('close');
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith(
					'message',
					(defaultOutboundPeer as any)._handleWSMessage,
				);
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith(
					REMOTE_SC_EVENT_RPC_REQUEST,
					(defaultOutboundPeer as any)._handleRawRPC,
				);
				expect((defaultOutboundPeer as any)._socket.off).toHaveBeenCalledWith(
					REMOTE_SC_EVENT_MESSAGE,
					(defaultOutboundPeer as any)._handleRawMessage,
				);
			});
		});
	});

	describe('#send', () => {
		// Arrange
		let p2pPacket: P2PMessagePacketBufferData;
		const data = Buffer.from('myData', DEFAULT_MESSAGE_ENCODING_FORMAT);
		beforeEach(() => {
			p2pPacket = {
				data,
				event: 'myEvent',
			};
		});

		it('should not create outbound socket if one already exists', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			jest.spyOn(defaultOutboundPeer as any, '_createOutboundSocket');

			defaultOutboundPeer.send(p2pPacket);
			expect((defaultOutboundPeer as any)._createOutboundSocket).not.toHaveBeenCalled();
		});

		it('should create outbound socket if it does not exist any', () => {
			jest
				.spyOn(defaultOutboundPeer as any, '_createOutboundSocket')
				.mockReturnValue(outboundSocket);

			expect((defaultOutboundPeer as any)._socket).toBeUndefined();
			defaultOutboundPeer.send(p2pPacket);
			expect((defaultOutboundPeer as any)._createOutboundSocket).toHaveBeenCalled();
			expect((defaultOutboundPeer as any)._socket).toEqual(outboundSocket);
		});

		it('should emit event', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.send(p2pPacket);

			expect(outboundSocket.emit).toHaveBeenCalledTimes(1);
			expect(outboundSocket.emit).toHaveBeenCalledWith(REMOTE_SC_EVENT_MESSAGE, {
				data: data.toString(DEFAULT_MESSAGE_ENCODING_FORMAT),
				event: 'myEvent',
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

		it('should not create an outbound socket if one exists', () => {
			jest.spyOn(defaultOutboundPeer as any, '_createOutboundSocket');

			(defaultOutboundPeer as any)._socket = outboundSocket;
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			defaultOutboundPeer.request(p2pPacket);
			expect((defaultOutboundPeer as any)._createOutboundSocket).not.toHaveBeenCalled();
		});

		it('should create outbound socket if it does not exist any', () => {
			// Arrange
			(defaultOutboundPeer as any)._socket = undefined;

			jest
				.spyOn(defaultOutboundPeer as any, '_createOutboundSocket')
				.mockReturnValue(outboundSocket);

			// Act
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			defaultOutboundPeer.request(p2pPacket);

			// Assert
			expect((defaultOutboundPeer as any)._createOutboundSocket).toHaveBeenCalled();
			expect((defaultOutboundPeer as any)._socket).toEqual(outboundSocket);
		});

		it('should emit event', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			defaultOutboundPeer.request(p2pPacket);
			expect(outboundSocket.emit).toHaveBeenCalled();
		});
	});
});
