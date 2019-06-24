/*
 * Copyright © 2018 Lisk Foundation
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
	Peer,
	PeerConfig,
	REMOTE_EVENT_MESSAGE,
	REMOTE_EVENT_RPC_REQUEST,
	SCServerSocketUpdated,
} from './base';

import { P2PDiscoveredPeerInfo } from '../p2p_types';

import { SCServerSocket } from 'socketcluster-server';

export const EVENT_CLOSE_INBOUND = 'closeInbound';
export const EVENT_INBOUND_SOCKET_ERROR = 'inboundSocketError';
export const EVENT_PING = 'ping';

const DEFAULT_PING_INTERVAL_MAX = 60000;
const DEFAULT_PING_INTERVAL_MIN = 20000;

const getRandomPingDelay = () =>
	Math.random() * (DEFAULT_PING_INTERVAL_MAX - DEFAULT_PING_INTERVAL_MIN) +
	DEFAULT_PING_INTERVAL_MIN;

export class InboundPeer extends Peer {
	protected _socket: SCServerSocketUpdated;
	protected readonly _handleInboundSocketError: (error: Error) => void;
	protected readonly _handleInboundSocketClose: (
		code: number,
		reason: string,
	) => void;
	private readonly _sendPing: () => void;
	private _pingTimeoutId: NodeJS.Timer;
	private _pingStart: number;

	public constructor(
		peerInfo: P2PDiscoveredPeerInfo,
		peerSocket: SCServerSocket,
		peerConfig?: PeerConfig,
	) {
		super(peerInfo, peerConfig);
		this._handleInboundSocketError = (error: Error) => {
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};
		this._handleInboundSocketClose = (code, reason) => {
			if (this._pingTimeoutId) {
				clearTimeout(this._pingTimeoutId);
			}
			this.emit(EVENT_CLOSE_INBOUND, {
				peerInfo,
				code,
				reason,
			});
		};
		this._pingStart = Date.now();
		this._sendPing = () => {
			clearTimeout(this._pingTimeoutId);
			this._pingStart = Date.now();
			this._socket.emit(EVENT_PING, undefined, (_: Error, __: unknown) => {
				this._latency = Date.now() - this._pingStart;
				this._pingTimeoutId = setTimeout(this._sendPing, getRandomPingDelay());
			});
		};
		this._pingTimeoutId = setTimeout(this._sendPing, getRandomPingDelay());
		this._socket = peerSocket;
		this._bindHandlersToInboundSocket(this._socket);
	}

	public set socket(scServerSocket: SCServerSocket) {
		this._unbindHandlersFromInboundSocket(this._socket);
		this._socket = scServerSocket as SCServerSocketUpdated;
		this._bindHandlersToInboundSocket(this._socket);
	}

	public disconnect(code: number = 1000, reason?: string): void {
		super.disconnect(code, reason);
		this._unbindHandlersFromInboundSocket(this._socket);
	}

	// All event handlers for the inbound socket should be bound in this method.
	private _bindHandlersToInboundSocket(
		inboundSocket: SCServerSocketUpdated,
	): void {
		inboundSocket.on('close', this._handleInboundSocketClose);
		inboundSocket.on('error', this._handleInboundSocketError);

		// Bind RPC and remote event handlers
		inboundSocket.on(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.on(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.on('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.on(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.on(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}

	// All event handlers for the inbound socket should be unbound in this method.
	private _unbindHandlersFromInboundSocket(
		inboundSocket: SCServerSocket,
	): void {
		inboundSocket.off('close', this._handleInboundSocketClose);

		// Unbind RPC and remote event handlers
		inboundSocket.off(REMOTE_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.off(REMOTE_EVENT_MESSAGE, this._handleRawMessage);
		inboundSocket.off('postBlock', this._handleRawLegacyMessagePostBlock);
		inboundSocket.off(
			'postSignatures',
			this._handleRawLegacyMessagePostSignatures,
		);
		inboundSocket.off(
			'postTransactions',
			this._handleRawLegacyMessagePostTransactions,
		);
	}
}
