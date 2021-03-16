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

import {
	ConnectionKind,
	DEFAULT_PING_INTERVAL_MAX,
	DEFAULT_PING_INTERVAL_MIN,
	INTENTIONAL_DISCONNECT_CODE,
} from '../constants';
import {
	EVENT_CLOSE_INBOUND,
	EVENT_INBOUND_SOCKET_ERROR,
	REMOTE_EVENT_PING,
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
} from '../events';
import { PeerConfig, P2PPeerInfo } from '../types';
import { Peer, SCServerSocketUpdated, socketErrorStatusCodes } from './base';

const getRandomPingDelay = (): number =>
	Math.random() * (DEFAULT_PING_INTERVAL_MAX - DEFAULT_PING_INTERVAL_MIN) +
	DEFAULT_PING_INTERVAL_MIN;

export class InboundPeer extends Peer {
	protected _socket: SCServerSocketUpdated;
	protected readonly _handleInboundSocketError: (error: Error) => void;
	protected readonly _handleInboundSocketClose: (code: number, reason: string | undefined) => void;
	private _pingTimeoutId: NodeJS.Timer;

	public constructor(peerInfo: P2PPeerInfo, peerSocket: SCServerSocket, peerConfig: PeerConfig) {
		super(peerInfo, peerConfig);
		this._peerInfo.internalState.connectionKind = ConnectionKind.INBOUND;
		this._handleInboundSocketError = (error: Error): void => {
			this.emit(EVENT_INBOUND_SOCKET_ERROR, error);
		};
		this._handleInboundSocketClose = (code, reasonMessage): void => {
			const reason =
				reasonMessage !== undefined && reasonMessage !== ''
					? reasonMessage
					: socketErrorStatusCodes[code] ?? 'Unknown reason';
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (this._pingTimeoutId) {
				clearTimeout(this._pingTimeoutId);
			}
			this.emit(EVENT_CLOSE_INBOUND, {
				peerInfo,
				code,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				reason,
			});
		};
		this._pingTimeoutId = setTimeout(() => {
			this._sendPing();
		}, getRandomPingDelay());
		this._socket = peerSocket;
		this._bindHandlersToInboundSocket(this._socket);
	}

	public set socket(scServerSocket: SCServerSocket) {
		this._unbindHandlersFromInboundSocket(this._socket);
		this._socket = scServerSocket as SCServerSocketUpdated;
		this._bindHandlersToInboundSocket(this._socket);
	}

	public disconnect(code: number = INTENTIONAL_DISCONNECT_CODE, reason?: string): void {
		super.disconnect(code, reason);
		clearTimeout(this._pingTimeoutId);
		this._unbindHandlersFromInboundSocket(this._socket);
	}

	private _sendPing(): void {
		const pingStart = Date.now();
		this.request({ procedure: REMOTE_EVENT_PING })
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			.catch(() => {})
			.finally(() => {
				this._peerInfo.internalState.latency = Date.now() - pingStart;
				this._pingTimeoutId = setTimeout(() => {
					this._sendPing();
				}, getRandomPingDelay());
			});
	}

	// All event handlers for the inbound socket should be bound in this method.
	private _bindHandlersToInboundSocket(inboundSocket: SCServerSocketUpdated): void {
		inboundSocket.on('close', this._handleInboundSocketClose);
		inboundSocket.on('error', this._handleInboundSocketError);
		inboundSocket.on('message', this._handleWSMessage);

		// Bind RPC and remote event handlers
		inboundSocket.on(REMOTE_SC_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.on(REMOTE_SC_EVENT_MESSAGE, this._handleRawMessage);
	}

	// All event handlers for the inbound socket should be unbound in this method.
	private _unbindHandlersFromInboundSocket(inboundSocket: SCServerSocket): void {
		inboundSocket.off('close', this._handleInboundSocketClose);
		inboundSocket.off('message', this._handleWSMessage);

		// Unbind RPC and remote event handlers
		inboundSocket.off(REMOTE_SC_EVENT_RPC_REQUEST, this._handleRawRPC);
		inboundSocket.off(REMOTE_SC_EVENT_MESSAGE, this._handleRawMessage);
	}
}
