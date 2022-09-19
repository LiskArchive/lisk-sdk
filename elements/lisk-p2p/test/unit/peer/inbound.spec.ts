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
import { InboundPeer } from '../../../src/peer';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_PING_INTERVAL_MAX,
	DEFAULT_PING_INTERVAL_MIN,
	DEFAULT_WS_MAX_MESSAGE_RATE,
} from '../../../src/constants';
import {
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
	REMOTE_EVENT_PING,
} from '../../../src/events';
import { p2pTypes } from '../../../src';
import { defaultRPCSchemas } from '../../../src/schema';
import { PeerConfig } from '../../../src/types';

describe('peer/inbound', () => {
	let defaultPeerInfo: p2pTypes.P2PPeerInfo;
	let defaultPeerConfig: PeerConfig;
	let defaultInboundPeer: InboundPeer;
	let inboundSocket: SCServerSocket;

	beforeEach(() => {
		jest.useFakeTimers();
		defaultPeerInfo = {
			peerId: '12.12.12.12:5001',
			ipAddress: '12.12.12.12',
			port: 5001,
			sharedState: {
				networkVersion: '1.1',
				nonce: 'nonce',
				chainID: Buffer.from('chainID', 'hex'),
				options: {},
			},
		};
		defaultPeerConfig = {
			hostPort: 5000,
			rateCalculationInterval: 1000,
			wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
			wsMaxMessageRatePenalty: 10,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
			peerStatusMessageRate: 4,
			rpcSchemas: {
				...defaultRPCSchemas,
			},
		};
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		inboundSocket = <SCServerSocket>({
			on: jest.fn(),
			off: jest.fn(),
			emit: jest.fn(),
			destroy: jest.fn(),
		} as any);
		defaultInboundPeer = new InboundPeer(defaultPeerInfo, inboundSocket, defaultPeerConfig);
	});

	afterEach(() => {
		jest.clearAllTimers();
		defaultInboundPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of InboundPeer class', () =>
			expect(defaultInboundPeer).toBeInstanceOf(InboundPeer));

		it('should have a function named _handleInboundSocketError', () =>
			expect((defaultInboundPeer as any)._handleInboundSocketError).toEqual(expect.any(Function)));

		it('should have a function named _handleInboundSocketClose', () =>
			expect((defaultInboundPeer as any)._handleInboundSocketClose).toEqual(expect.any(Function)));

		it('should set ping timeout', () => {
			expect((defaultInboundPeer as any)._pingTimeoutId).toBeDefined();
		});

		it('should get socket property', () =>
			expect((defaultInboundPeer as any)._socket).toBe(inboundSocket));

		it('should send ping at least once after some time', () => {
			jest.spyOn(defaultInboundPeer as any, '_sendPing');
			expect((defaultInboundPeer as any)._sendPing).not.toHaveBeenCalled();

			jest.advanceTimersByTime(DEFAULT_PING_INTERVAL_MAX + DEFAULT_PING_INTERVAL_MIN + 1);

			expect((defaultInboundPeer as any)._sendPing).toHaveBeenCalled();
		});

		it(`should emit ${REMOTE_EVENT_PING} event`, () => {
			jest.advanceTimersByTime(DEFAULT_PING_INTERVAL_MAX + DEFAULT_PING_INTERVAL_MIN + 1);

			expect((defaultInboundPeer as any)._socket.emit).toHaveBeenCalledTimes(1);
			expect((defaultInboundPeer as any)._socket.emit).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				{ procedure: REMOTE_EVENT_PING },
				expect.any(Function),
			);
		});

		it('should bind handlers to inbound socket', () => {
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledTimes(5);
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'close',
				(defaultInboundPeer as any)._handleInboundSocketClose,
			);
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'error',
				(defaultInboundPeer as any)._handleInboundSocketError,
			);
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledWith(
				'message',
				(defaultInboundPeer as any)._handleWSMessage,
			);
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				(defaultInboundPeer as any)._handleRawRPC,
			);
			expect((defaultInboundPeer as any)._socket.on).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_MESSAGE,
				(defaultInboundPeer as any)._handleRawMessage,
			);
		});
	});

	describe('#set socket', () => {
		let newInboundSocket: SCServerSocket;

		beforeEach(() => {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			newInboundSocket = <SCServerSocket>({
				on: jest.fn(),
				off: jest.fn(),
				emit: jest.fn(),
				destroy: jest.fn(),
			} as any);
		});

		it('should unbind handlers from a former inbound socket', () => {
			jest.spyOn(defaultInboundPeer as any, '_unbindHandlersFromInboundSocket');
			defaultInboundPeer.socket = newInboundSocket;
			expect((defaultInboundPeer as any)._unbindHandlersFromInboundSocket).toHaveBeenCalledWith(
				inboundSocket,
			);
		});

		it('should set a new socket', () => {
			expect((defaultInboundPeer as any)._socket).toEqual(inboundSocket);
			defaultInboundPeer.socket = newInboundSocket;
			expect((defaultInboundPeer as any)._socket).toEqual(newInboundSocket);
		});

		it('should bind handlers to a new inbound socket', () => {
			jest.spyOn(defaultInboundPeer as any, '_bindHandlersToInboundSocket');
			defaultInboundPeer.socket = newInboundSocket;

			expect((defaultInboundPeer as any)._bindHandlersToInboundSocket).toHaveBeenCalledTimes(1);
			expect((defaultInboundPeer as any)._bindHandlersToInboundSocket).toHaveBeenCalledWith(
				newInboundSocket,
			);
		});
	});

	describe('#disconnect', () => {
		it('should call disconnect and destroy socket', () => {
			defaultInboundPeer.disconnect();

			expect(inboundSocket.destroy).toHaveBeenCalledTimes(1);
			expect(inboundSocket.destroy).toHaveBeenCalledWith(1000, undefined);
		});

		it('should not send ping anymore', () => {
			jest.spyOn(defaultInboundPeer as any, '_sendPing');
			defaultInboundPeer.disconnect();
			jest.advanceTimersByTime(DEFAULT_PING_INTERVAL_MAX + DEFAULT_PING_INTERVAL_MIN + 1);
			expect((defaultInboundPeer as any)._sendPing).not.toHaveBeenCalled();
		});

		it('should call _unbindHandlersFromInboundSocket with inbound socket', () => {
			jest.spyOn(defaultInboundPeer as any, '_unbindHandlersFromInboundSocket');
			defaultInboundPeer.disconnect();
			expect((defaultInboundPeer as any)._unbindHandlersFromInboundSocket).toHaveBeenCalledWith(
				inboundSocket,
			);
		});

		it('should unbind handlers from an inbound socket', () => {
			defaultInboundPeer.disconnect();
			expect((defaultInboundPeer as any)._socket.off).toHaveBeenCalledTimes(4);
			expect((defaultInboundPeer as any)._socket.off).toHaveBeenCalledWith(
				'close',
				(defaultInboundPeer as any)._handleInboundSocketClose,
			);
			expect((defaultInboundPeer as any)._socket.off).toHaveBeenCalledWith(
				'message',
				(defaultInboundPeer as any)._handleWSMessage,
			);
			expect((defaultInboundPeer as any)._socket.off).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_RPC_REQUEST,
				(defaultInboundPeer as any)._handleRawRPC,
			);
			expect((defaultInboundPeer as any)._socket.off).toHaveBeenCalledWith(
				REMOTE_SC_EVENT_MESSAGE,
				(defaultInboundPeer as any)._handleRawMessage,
			);
		});
	});
});
