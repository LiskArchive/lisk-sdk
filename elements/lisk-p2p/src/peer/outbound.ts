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
import * as querystring from 'querystring';
import * as socketClusterClient from 'socketcluster-client';

import {
	ConnectionKind,
	DEFAULT_ACK_TIMEOUT,
	DEFAULT_CONNECT_TIMEOUT,
	DEFAULT_HTTP_PATH,
	INTENTIONAL_DISCONNECT_CODE,
} from '../constants';
import {
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_ABORT_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT,
	EVENT_OUTBOUND_SOCKET_ERROR,
	REMOTE_EVENT_PING,
	REMOTE_EVENT_PONG,
	REMOTE_SC_EVENT_MESSAGE,
	REMOTE_SC_EVENT_RPC_REQUEST,
} from '../events';
import {
	P2PMessagePacketBufferData,
	PeerConfig,
	P2PPeerInfo,
	P2PNodeInfo,
	P2PRequestPacketBufferData,
	P2PResponsePacketBufferData,
	P2PRawRequestPacket,
	P2PRequestPacket,
} from '../types';

import { Peer, SCClientSocket, socketErrorStatusCodes, RATE_NORMALIZATION_FACTOR } from './base';
import { P2PRequest } from '../p2p_request';

interface ClientOptionsUpdated {
	readonly hostname: string;
	readonly path: string;
	readonly port: number;
	readonly query: string;
	readonly autoConnect: boolean;
	readonly autoReconnect: boolean;
	readonly multiplex: boolean;
	readonly ackTimeout?: number;
	readonly connectTimeout?: number;
	readonly maxPayload?: number;
}

export class OutboundPeer extends Peer {
	protected _socket: SCClientSocket | undefined;

	public constructor(peerInfo: P2PPeerInfo, peerConfig: PeerConfig) {
		super(peerInfo, peerConfig);
		this._peerInfo.internalState.connectionKind = ConnectionKind.OUTBOUND;
	}

	public set socket(scClientSocket: SCClientSocket) {
		if (this._socket) {
			this._unbindHandlersFromOutboundSocket(this._socket);
		}
		this._socket = scClientSocket;
		this._bindHandlersToOutboundSocket(this._socket);
	}

	public connect(): void {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}
		this._socket.connect();
	}

	public disconnect(code: number = INTENTIONAL_DISCONNECT_CODE, reason?: string): void {
		super.disconnect(code, reason);
		if (this._socket) {
			this._unbindHandlersFromOutboundSocket(this._socket);
		}
	}

	public send(packet: P2PMessagePacketBufferData): void {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}

		super.send(packet);
	}

	public async request(packet: P2PRequestPacketBufferData): Promise<P2PResponsePacketBufferData> {
		if (!this._socket) {
			this._socket = this._createOutboundSocket();
		}

		return super.request(packet);
	}

	private _createOutboundSocket(): SCClientSocket {
		const connectTimeout = this._peerConfig.connectTimeout
			? this._peerConfig.connectTimeout
			: DEFAULT_CONNECT_TIMEOUT;
		const ackTimeout = this._peerConfig.ackTimeout
			? this._peerConfig.ackTimeout
			: DEFAULT_ACK_TIMEOUT;
		// Isolating options that has custom property part
		const { options, ...nodeInfo } = this._serverNodeInfo as P2PNodeInfo;
		const queryObject = {
			networkVersion: nodeInfo.networkVersion,
			chainID: nodeInfo.chainID.toString('hex'),
			nonce: nodeInfo.nonce,
			advertiseAddress: nodeInfo.advertiseAddress,
			port: this._peerConfig.hostPort,
		};

		// Ideally, we should JSON-serialize the whole NodeInfo object but this cannot be done for compatibility reasons, so instead we put it inside an options property.
		const clientOptions: ClientOptionsUpdated = {
			hostname: this.ipAddress,
			path: DEFAULT_HTTP_PATH,
			port: this.port,
			query: querystring.stringify(queryObject as querystring.ParsedUrlQueryInput),
			connectTimeout,
			ackTimeout,
			multiplex: false,
			autoConnect: true,
			autoReconnect: false,
			maxPayload: this._peerConfig.wsMaxPayload,
		};

		const outboundSocket = socketClusterClient.create(clientOptions);

		this._bindHandlersToOutboundSocket(outboundSocket);

		return outboundSocket;
	}

	// All event handlers for the outbound socket should be bound in this method.
	private _bindHandlersToOutboundSocket(outboundSocket: SCClientSocket): void {
		outboundSocket.on('error', (error: Error) => {
			this.emit(EVENT_OUTBOUND_SOCKET_ERROR, error);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		outboundSocket.on('connect', async () => {
			try {
				await this.fetchAndUpdateStatus();
			} catch (error) {
				this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);

				return;
			}

			try {
				await this.discoverPeers();
			} catch (error) {
				this.emit(EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT, error);
			}

			this.emit(EVENT_CONNECT_OUTBOUND, this._peerInfo);
		});

		outboundSocket.on('connectAbort', () => {
			this.emit(EVENT_CONNECT_ABORT_OUTBOUND, this._peerInfo);
		});

		outboundSocket.on('close', (code: number, reasonMessage: string | undefined) => {
			const reason: string =
				reasonMessage !== undefined && reasonMessage !== ''
					? reasonMessage
					: socketErrorStatusCodes[code] ?? 'Unknown reason';
			this.emit(EVENT_CLOSE_OUTBOUND, {
				peerInfo: this._peerInfo,
				code,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				reason,
			});
		});

		outboundSocket.on('message', this._handleWSMessage);

		// Bind RPC and remote event handlers
		outboundSocket.on(
			REMOTE_SC_EVENT_RPC_REQUEST,
			(
				rawRequestPacket: P2PRawRequestPacket,
				respond: (responseError?: Error, responseData?: unknown) => void,
			) => {
				if (rawRequestPacket.procedure === REMOTE_EVENT_PING) {
					// Protocol RCP request limiter LIP-0004
					this._updateOutboundRPCCounter(rawRequestPacket);
					const rate = this._getOutboundRPCRate(rawRequestPacket);

					// Each P2PRequest contributes to the Peer's productivity.
					// A P2PRequest can mutate this._productivity from the current Peer instance.
					const request = new P2PRequest(
						{
							procedure: rawRequestPacket.procedure,
							data: rawRequestPacket.data,
							id: this.peerInfo.peerId,
							rate,
							productivity: this.internalState.productivity,
						},
						respond,
					);

					request.end(REMOTE_EVENT_PONG);
					return;
				}
				this._handleRawRPC(rawRequestPacket, respond);
			},
		);

		outboundSocket.on(REMOTE_SC_EVENT_MESSAGE, this._handleRawMessage);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
		const transportSocket = (outboundSocket as any).transport;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (transportSocket?.socket && transportSocket.socket.on) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
			transportSocket.socket.on(REMOTE_EVENT_PING, () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
				transportSocket.socket.terminate();
				this.applyPenalty(100);
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
			transportSocket.socket.on(REMOTE_EVENT_PONG, () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
				transportSocket.socket.terminate();
				this.applyPenalty(100);
			});
		}
	}

	// All event handlers for the outbound socket should be unbound in this method.
	private _unbindHandlersFromOutboundSocket(outboundSocket: SCClientSocket): void {
		// Do not unbind the error handler because error could still throw after disconnect.
		// We don't want to have uncaught errors.
		outboundSocket.off('connect');
		outboundSocket.off('connectAbort');
		outboundSocket.off('close');
		outboundSocket.off('message', this._handleWSMessage);

		// Unbind RPC and remote event handlers
		outboundSocket.off(REMOTE_SC_EVENT_RPC_REQUEST, this._handleRawRPC);
		outboundSocket.off(REMOTE_SC_EVENT_MESSAGE, this._handleRawMessage);
		outboundSocket.off(REMOTE_EVENT_PING);
	}

	private _updateOutboundRPCCounter(packet: P2PRequestPacket): void {
		const key = packet.procedure;
		const count = (this.internalState.rpcCounter.get(key) ?? 0) + 1;
		this.peerInfo.internalState.rpcCounter.set(key, count);
	}

	private _getOutboundRPCRate(packet: P2PRequestPacket): number {
		const rate = this.peerInfo.internalState.rpcRates.get(packet.procedure) ?? 0;

		return rate * RATE_NORMALIZATION_FACTOR;
	}
}
