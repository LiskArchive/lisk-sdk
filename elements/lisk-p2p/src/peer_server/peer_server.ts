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
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import { ParsedUrlQuery } from 'querystring';
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';
import * as url from 'url';

import {
	ConnectionKind,
	DEFAULT_CONTROL_MESSAGE_LIMIT,
	DEFAULT_HTTP_PATH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	DEFAULT_NODE_HOST_IP,
	DEFAULT_RATE_CALCULATION_INTERVAL,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
	INCOMPATIBLE_PEER_CODE,
	INCOMPATIBLE_PEER_INFO_CODE,
	INCOMPATIBLE_PEER_UNKNOWN_REASON,
	INVALID_CONNECTION_QUERY_CODE,
	INVALID_CONNECTION_QUERY_REASON,
	INVALID_CONNECTION_SELF_CODE,
	INVALID_CONNECTION_SELF_REASON,
	INVALID_CONNECTION_URL_CODE,
	INVALID_CONNECTION_URL_REASON,
} from '../constants';
import {
	InvalidDisconnectEventError,
	InvalidPayloadError,
	PeerInboundHandshakeError,
} from '../errors';
import {
	EVENT_BAN_PEER,
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_NEW_INBOUND_PEER_CONNECTION,
} from '../events';
import { PeerBook } from '../peer_book';
import {
	IncomingPeerConnection,
	P2PCheckPeerCompatibility,
	P2PNodeInfo,
	P2PPeerInfo,
	PeerServerConfig,
} from '../types';
import {
	assignInternalInfo,
	constructPeerId,
	validatePeerInfo,
} from '../utils';

interface SCServerUpdated extends SCServer {
	readonly isReady: boolean;
}

const BASE_10_RADIX = 10;

export class PeerServer extends EventEmitter {
	private readonly _nodeInfo: P2PNodeInfo;
	private readonly _hostIp: string;
	private readonly _secret: number;
	private readonly _maxPeerInfoSize: number;
	private readonly _peerBook: PeerBook;
	private readonly _httpServer: http.Server;
	private readonly _scServer: SCServerUpdated;
	private readonly _peerHandshakeCheck: P2PCheckPeerCompatibility;
	protected _invalidMessageInterval?: NodeJS.Timer;
	protected _invalidMessageCounter: Map<string, number>;

	public constructor(config: PeerServerConfig) {
		super();
		this._nodeInfo = config.nodeInfo;
		this._hostIp = config.hostIp;
		this._secret = config.secret;
		this._peerBook = config.peerBook;
		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer, {
			path: DEFAULT_HTTP_PATH,
			wsEngineServerOptions: {
				maxPayload: config.maxPayload,
			},
		}) as SCServerUpdated;
		this._maxPeerInfoSize = config.maxPeerInfoSize;
		this._peerHandshakeCheck = config.peerHandshakeCheck;
		this._invalidMessageCounter = new Map();
	}

	public async stop(): Promise<void> {
		if (this._invalidMessageInterval) {
			clearTimeout(this._invalidMessageInterval);
		}

		await this._stopWSServer();
		await this._stopHTTPServer();
	}

	public async start(): Promise<void> {
		this._invalidMessageInterval = setInterval(() => {
			this._invalidMessageCounter = new Map();
		}, DEFAULT_RATE_CALCULATION_INTERVAL);

		this._scServer.addMiddleware(
			this._scServer.MIDDLEWARE_HANDSHAKE_WS,
			(
				req: http.IncomingMessage,
				next: SCServer.nextMiddlewareFunction,
			): void => {
				// Decline connections from banned IPs
				if (this._peerBook.bannedIPs.has(req.socket.remoteAddress as string)) {
					next(
						new PeerInboundHandshakeError(
							FORBIDDEN_CONNECTION_REASON,
							FORBIDDEN_CONNECTION,
							req.socket.remoteAddress as string,
						),
					);

					return;
				}

				next();

				return;
			},
		);

		this._scServer.on('handshake', (socket: SCServerSocket): void => {
			if (this._peerBook.bannedIPs.has(socket.remoteAddress)) {
				if ((socket as any).socket) {
					(socket as any).socket.terminate();
				}
			}

			this._bindInvalidControlFrameEvents(socket);
		});

		// Handle incoming invalid payload
		(this._scServer as any).wsServer.on('connection', (ws: any, req: any) => {
			this._handleIncomingPayload(ws, req);
		});

		this._scServer.on('connection', (socket: SCServerSocket): void => {
			this._handleIncomingConnection(socket);
		});

		this._httpServer.listen(
			this._nodeInfo.wsPort,
			this._hostIp || DEFAULT_NODE_HOST_IP,
		);

		if (this._scServer.isReady) {
			return;
		}

		return new Promise<void>(resolve => {
			this._scServer.once('ready', () => {
				resolve();
			});
		});
	}

	private _terminateIncomingSocket(
		socket: SCServerSocket,
		error: Error | string,
		addToBannedPeers?: boolean,
	): void {
		if ((socket as any).socket) {
			(socket as any).socket.terminate();
		}
		// Re-emit the message to allow it to bubble up the class hierarchy.
		this.emit(EVENT_INBOUND_SOCKET_ERROR, error);

		// If the socket needs to be permanently banned
		if (addToBannedPeers) {
			const peerId = `${socket.remoteAddress}:${socket.remotePort}`;

			this.emit(EVENT_BAN_PEER, peerId);
		}
	}

	private _disconnectSocketDueToFailedHandshake(
		socket: SCServerSocket,
		statusCode: number,
		closeReason: string,
	): void {
		socket.disconnect(statusCode, closeReason);

		this.emit(
			EVENT_FAILED_TO_ADD_INBOUND_PEER,
			new PeerInboundHandshakeError(
				closeReason,
				statusCode,
				socket.remoteAddress,
				socket.request.url,
			),
		);
	}

	private _validateQueryObject(
		socket: SCServerSocket,
	): ParsedUrlQuery | undefined {
		if (!socket.request.url) {
			this._disconnectSocketDueToFailedHandshake(
				socket,
				INVALID_CONNECTION_URL_CODE,
				INVALID_CONNECTION_URL_REASON,
			);

			return undefined;
		}
		const { query: queryObject } = url.parse(socket.request.url, true);

		if (queryObject && queryObject.nonce === this._nodeInfo.nonce) {
			this._disconnectSocketDueToFailedHandshake(
				socket,
				INVALID_CONNECTION_SELF_CODE,
				INVALID_CONNECTION_SELF_REASON,
			);

			const selfWSPort = queryObject.wsPort
				? +queryObject.wsPort
				: this._nodeInfo.wsPort;

			// Delete you peerInfo from both the lists
			this._peerBook.removePeer({
				peerId: constructPeerId(socket.remoteAddress, selfWSPort),
				ipAddress: socket.remoteAddress,
				wsPort: selfWSPort,
			});

			return undefined;
		}

		if (
			queryObject &&
			(typeof queryObject.wsPort !== 'string' ||
				typeof queryObject.version !== 'string' ||
				typeof queryObject.networkId !== 'string')
		) {
			this._disconnectSocketDueToFailedHandshake(
				socket,
				INVALID_CONNECTION_QUERY_CODE,
				INVALID_CONNECTION_QUERY_REASON,
			);

			return undefined;
		}

		return queryObject;
	}

	private _checkQueryParameters(
		queryObject: ParsedUrlQuery,
		socket: SCServerSocket,
	): object | undefined {
		try {
			return typeof queryObject.options === 'string'
				? JSON.parse(queryObject.options)
				: {};
		} catch (error) {
			this._disconnectSocketDueToFailedHandshake(
				socket,
				INVALID_CONNECTION_QUERY_CODE,
				INVALID_CONNECTION_QUERY_REASON,
			);

			return undefined;
		}
	}

	private _constructPeerInfoForInboundConnection(
		queryObject: ParsedUrlQuery,
		queryOptions: object,
		socket: SCServerSocket,
	): P2PPeerInfo | undefined {
		const remoteWSPort: number = parseInt(
			queryObject.wsPort as string,
			BASE_10_RADIX,
		);
		const peerId = constructPeerId(socket.remoteAddress, remoteWSPort);

		// Remove these wsPort and ip from the query object
		const {
			wsPort,
			ipAddress,
			advertiseAddress,
			...restOfQueryObject
		} = queryObject;

		const peerInPeerBook = this._peerBook.getPeer({
			peerId,
			ipAddress: socket.remoteAddress,
			wsPort: remoteWSPort,
		});

		const incomingPeerInfo: P2PPeerInfo = peerInPeerBook
			? {
					...peerInPeerBook,
					sharedState: {
						...peerInPeerBook.sharedState,
						...restOfQueryObject,
						...queryOptions,
						height: queryObject.height ? +queryObject.height : 0, // TODO: Remove the usage of height for choosing among peers having same ipAddress, instead use productivity and reputation
						protocolVersion: queryObject.protocolVersion,
					},
					internalState: {
						...(peerInPeerBook.internalState
							? peerInPeerBook.internalState
							: assignInternalInfo(peerInPeerBook, this._secret)),
						advertiseAddress: advertiseAddress !== 'false',
						connectionKind: ConnectionKind.INBOUND,
					},
			  }
			: {
					sharedState: {
						...restOfQueryObject,
						...queryOptions,
						height: queryObject.height ? +queryObject.height : 0, // TODO: Remove the usage of height for choosing among peers having same ipAddress, instead use productivity and reputation
						protocolVersion: queryObject.protocolVersion,
					},
					internalState: {
						...assignInternalInfo(
							{
								peerId,
								ipAddress: socket.remoteAddress,
								wsPort: remoteWSPort,
							},
							this._secret,
						),
						advertiseAddress: advertiseAddress !== 'false',
						connectionKind: ConnectionKind.INBOUND,
					},
					peerId,
					ipAddress: socket.remoteAddress,
					wsPort: remoteWSPort,
			  };

		try {
			const validPeerInfo = validatePeerInfo(
				incomingPeerInfo,
				this._maxPeerInfoSize
					? this._maxPeerInfoSize
					: DEFAULT_MAX_PEER_INFO_SIZE,
			);

			return validPeerInfo;
		} catch (error) {
			this._disconnectSocketDueToFailedHandshake(
				socket,
				INCOMPATIBLE_PEER_INFO_CODE,
				error,
			);

			return undefined;
		}
	}

	private _checkPeerCompatibility(
		peerInfo: P2PPeerInfo,
		socket: SCServerSocket,
	): boolean {
		const { success, error } = this._peerHandshakeCheck(
			peerInfo,
			this._nodeInfo,
		);

		if (!success) {
			const errorReason = error || INCOMPATIBLE_PEER_UNKNOWN_REASON;

			this._disconnectSocketDueToFailedHandshake(
				socket,
				INCOMPATIBLE_PEER_CODE,
				errorReason,
			);
		}

		return success;
	}

	private _handleIncomingConnection(socket: SCServerSocket): void {
		// Validate query object from the url
		const queryObject = this._validateQueryObject(socket);
		if (!queryObject) {
			return;
		}
		// Check if the query object has valid query parameters
		const queryOptions = this._checkQueryParameters(queryObject, socket);

		if (!queryOptions) {
			return;
		}
		// Validate and construct peerInfo object for the incoming connection
		const incomingPeerInfo = this._constructPeerInfoForInboundConnection(
			queryObject,
			queryOptions,
			socket,
		);

		if (!incomingPeerInfo) {
			return;
		}
		// Check for the compatibility of the peer with the node
		if (!this._checkPeerCompatibility(incomingPeerInfo, socket)) {
			return;
		}

		const incomingPeerConnection: IncomingPeerConnection = {
			peerInfo: incomingPeerInfo,
			socket,
		};

		this.emit(EVENT_NEW_INBOUND_PEER_CONNECTION, incomingPeerConnection);
	}

	private _bindInvalidControlFrameEvents(socket: SCServerSocket): void {
		// Terminate the connection the moment it receive ping frame
		(socket as any).socket.on('ping', () => {
			this._terminateIncomingSocket(
				socket,
				`Terminated connection peer: ${socket.remoteAddress}, reason: malicious ping control frames`,
				true,
			);
		});
		// Terminate the connection the moment it receive pong frame
		(socket as any).socket.on('pong', () => {
			this._terminateIncomingSocket(
				socket,
				`Terminated connection peer: ${socket.remoteAddress}, reason: malicious pong control frames`,
				true,
			);
		});
	}

	private _handleIncomingPayload(ws: any, _req: any): void {
		ws.on('message', (message: any) => {
			// Pong message
			if (message === '#2') {
				return;
			}

			const MAX_EVENT_NAME_LENGTH = 128;

			const {
				address: peerIpAddress,
				port: wsPort,
			} = ws._socket._peername.address;

			const peerId = constructPeerId(peerIpAddress, wsPort);

			try {
				const parsed = JSON.parse(message);

				const invalidEvents: Set<string> = new Set([
					'#authenticate',
					'#removeAuthToken',
					'#subscribe',
					'#unsubscribe',
					'#publish',
				]);

				if (
					(parsed.event && typeof parsed.event !== 'string') ||
					invalidEvents.has(parsed.event) ||
					parsed.event.length > MAX_EVENT_NAME_LENGTH
				) {
					throw new InvalidPayloadError('Received invalid payload', parsed);
				}

				if (parsed.event === '#disconnect') {
					const count =
						(this._invalidMessageCounter.get(peerIpAddress) || 0) + 1;
					this._invalidMessageCounter.set(peerIpAddress, count);

					if (count > DEFAULT_CONTROL_MESSAGE_LIMIT) {
						throw new InvalidDisconnectEventError(
							`Exhausted disconnected event: peer disconnected ${count} times above the limit of ${DEFAULT_CONTROL_MESSAGE_LIMIT}`,
						);
					}
				}
			} catch (error) {
				ws.terminate();

				this.emit(EVENT_BAN_PEER, peerId);
				this.emit(
					EVENT_INBOUND_SOCKET_ERROR,
					`Banned peer with Ip: ${peerIpAddress}, reason: ${error}, message: ${message}`,
				);
			}
		});
	}

	private async _stopHTTPServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._httpServer.close(() => {
				resolve();
			});
		});
	}

	private async _stopWSServer(): Promise<void> {
		return new Promise<void>(resolve => {
			this._scServer.close(() => {
				resolve();
			});
		});
	}
}
