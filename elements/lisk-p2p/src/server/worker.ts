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

// tslint:disable-next-line no-require-imports no-var-requires no-submodule-imports variable-name
const SCWorker = require('socketcluster/scworker');
import { SCServerSocket } from 'socketcluster-server';
import * as socketClusterClient from 'socketcluster-client';
import * as url from 'url';

import {
	// DEFAULT_MAX_PEER_INFO_SIZE,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	// INCOMPATIBLE_PEER_CODE,
	// INCOMPATIBLE_PEER_INFO_CODE,
	// INCOMPATIBLE_PEER_UNKNOWN_REASON,
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_SELF_CODE,
	INVALID_CONNECTION_SELF_REASON,
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
} from '../constants';
import { PeerInboundHandshakeError } from '../errors';
import {
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	REMOTE_SC_EVENT_RPC_REQUEST,
	REMOTE_SC_EVENT_MESSAGE,
	EVENT_CLOSE_INBOUND,
} from '../events';
import {
	constructPeerId,
	// validatePeerCompatibility,
	// validatePeerInfo,
} from '../utils';

import { REQUEST_NODE_CONFIG } from './constants';
import { NodeConfig, SocketInfo, WorkerMessage } from './type';
// import { P2PPeerInfo } from '../p2p_types';

const BASE_10_RADIX = 10;
const socketErrorStatusCodes = {
	...(socketClusterClient.SCClientSocket as any).errorStatuses,
	1000: 'Intentionally disconnected',
};

export type SCServerSocketUpdated = {
	destroy(code?: number, data?: string | object): void;
	on(event: string | unknown, listener: (packet?: unknown) => void): void;
	on(event: string, listener: (packet: any, respond: any) => void): void;
} & SCServerSocket;

class Worker extends SCWorker {
	private readonly _socketMap: Map<string, SCServerSocket> = new Map();
	private _nodeConfig?: NodeConfig;

	public async run(): Promise<void> {
		// Get config from master
		this._nodeConfig = await this._requestToServer<NodeConfig>({
			type: REQUEST_NODE_CONFIG,
			id: 'worker',
		});

		this.scServer.on('handshake', (socket: SCServerSocket) => {
			(socket as any).socket.on('ping', () => {
				(socket as any).socket.terminate();

				return;
			});
			// Terminate the connection the moment it receive pong frame
			(socket as any).socket.on('pong', () => {
				(socket as any).socket.terminate();

				return;
			});

			if (this._nodeConfig?.bannedPeers.includes(socket.remoteAddress)) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);

				return;
			}
			// Check blacklist to avoid incoming connections from backlisted ips
			if (this._nodeConfig?.blacklistedPeers.includes(socket.remoteAddress)) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);

				return;
			}
		});

		this.scServer.on('connection', async (socket: SCServerSocket) => {
			if (this._nodeConfig === undefined) {
				throw new Error('Node config has to be set');
			}
			if (!socket.request.url) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_URL_CODE,
					INVALID_CONNECTION_URL_REASON,
				);

				return;
			}
			const queryObject = url.parse(socket.request.url, true).query;

			if (queryObject.nonce === this._nodeConfig?.nonce) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_SELF_CODE,
					INVALID_CONNECTION_SELF_REASON,
				);

				return;
			}

			if (
				typeof queryObject.wsPort !== 'string' ||
				typeof queryObject.protocolVersion !== 'string' ||
				typeof queryObject.nethash !== 'string' ||
				typeof queryObject.nonce !== 'string'
			) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_QUERY_CODE,
					INVALID_CONNECTION_QUERY_REASON,
				);

				return;
			}

			const remoteWSPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
			const peerId = constructPeerId(socket.remoteAddress, remoteWSPort);

			// Remove these wsPort and ip from the query object
			const { nonce, nethash, advertiseAddress } = queryObject;

			// Validate query size
			// Validate query schema
			// this._disconnectSocketDueToFailedHandshake(
			// 		socket,
			// 		INCOMPATIBLE_PEER_INFO_CODE,
			// 		error,
			// 	);

			// Validate compatibility
			// const incompatibilityReason = error || INCOMPATIBLE_PEER_UNKNOWN_REASON;
			// 	this._disconnectSocketDueToFailedHandshake(
			// 		socket,
			// 		INCOMPATIBLE_PEER_CODE,
			// 		incompatibilityReason,
			// 	);

			this._socketMap.set(peerId, socket);
			try {
				const socketInfo: SocketInfo = {
					id: peerId,
					ipAddress: socket.remoteAddress,
					nethash,
					nonce,
					wsPort: remoteWSPort,
					protocolVersion: queryObject.protocolVersion,
					advertiseAddress: advertiseAddress !== 'false',
				};
				this._unbindHandlersFromInboundSocket(socket);
				this._bindHandlersToInboundSocket(peerId, socket);
				this._sendToServer({
					type: 'connection',
					id: peerId,
					data: socketInfo,
				});
			} catch (err) {
				console.error(err);
			}
		});
	}

	private _disconnectSocketDueToFailedHandshake(
		socket: SCServerSocket,
		statusCode: number,
		closeReason: string,
	): void {
		socket.disconnect(statusCode, closeReason);
		this.emit(
			EVENT_FAILED_TO_ADD_INBOUND_PEER,
			new PeerInboundHandshakeError(closeReason, statusCode, socket.id),
		);
	}

	/**
	 * @param data data massage request as T
	 * @returns type of K
	 */
	private _sendToServer(data: WorkerMessage): void {
		this.sendToMaster(data);
	}

	/**
	 * @param data data massage request as T
	 * @returns type of K
	 */
	private async _requestToServer<T>(data: WorkerMessage): Promise<T> {
		return new Promise((resolve, reject) => {
			this.sendToMaster(data, (err: Error, res: T) => {
				if (err) {
					reject(err);

					return;
				}
				resolve(res);
			});
		});
	}

	// All event handlers for the inbound socket should be bound in this method.
	private _bindHandlersToInboundSocket(
		id: string,
		inboundSocket: SCServerSocketUpdated,
	): void {
		inboundSocket.on('close', (code: number, reasonMessage: string) => {
			const reason = reasonMessage
				? reasonMessage
				: socketErrorStatusCodes[code] || 'Unknown reason';
			this._sendToServer({
				type: EVENT_CLOSE_INBOUND,
				id,
				data: { code, reason },
			});
		});
		inboundSocket.on('error', (error: Error) => {
			this._sendToServer({ type: 'error', id, data: { error } });
		});
		inboundSocket.on('message', () => {
			this._sendToServer({ type: 'message', id });
		});

		// Bind RPC and remote event handlers
		inboundSocket.on(REMOTE_SC_EVENT_RPC_REQUEST, (packet: unknown) => {
			this._sendToServer({
				type: REMOTE_SC_EVENT_RPC_REQUEST,
				id,
				data: packet,
			});
		});
		inboundSocket.on(
			REMOTE_SC_EVENT_RPC_REQUEST,
			async (
				packet: unknown,
				respond: (responseError?: Error, responseData?: unknown) => void,
			) => {
				try {
					const result = await this._requestToServer({
						type: REMOTE_SC_EVENT_RPC_REQUEST,
						id,
						data: packet,
					});
					respond(undefined, result);
				} catch (error) {
					respond(error);
				}
			},
		);
		inboundSocket.on(REMOTE_SC_EVENT_MESSAGE, (packet: unknown) => {
			this._sendToServer({ type: REMOTE_SC_EVENT_MESSAGE, id, data: packet });
		});
	}

	// All event handlers for the inbound socket should be unbound in this method.
	private _unbindHandlersFromInboundSocket(
		inboundSocket: SCServerSocketUpdated,
	): void {
		inboundSocket.off('close');
		inboundSocket.off('message');

		// Unbind RPC and remote event handlers
		inboundSocket.off(REMOTE_SC_EVENT_RPC_REQUEST);
		inboundSocket.off(REMOTE_SC_EVENT_MESSAGE);
	}
}

new Worker();
