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
} from './peer';

import { P2PDiscoveredPeerInfo } from './p2p_types';

import { SCServerSocket } from 'socketcluster-server';

export class InboundPeer extends Peer {
	protected _socket: SCServerSocketUpdated | undefined;

	public constructor(
		peerInfo: P2PDiscoveredPeerInfo,
		peerConfig?: PeerConfig,
		peerSocket?: SCServerSocket,
	) {
		super(peerInfo, peerConfig);
		this._socket = peerSocket ? peerSocket : undefined;
		if (this._socket) {
			this._bindHandlersToInboundSocket(this._socket);
		}
	}

	public set socket(scServerSocket: SCServerSocket) {
		if (this._socket) {
			this._unbindHandlersFromInboundSocket(this._socket);
		}
		this._socket = scServerSocket as SCServerSocketUpdated;
		this._bindHandlersToInboundSocket(this._socket);
	}

	public disconnect(): void {
		if (!this._socket) {
			throw new Error('Peer socket does not exist');
		}
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
