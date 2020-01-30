import { EventEmitter } from 'events';
import * as http from 'http';
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';
import * as url from 'url';

import {
	ConnectionKind,
	DEFAULT_HTTP_PATH,
	DEFAULT_MAX_PEER_INFO_SIZE,
	DEFAULT_NODE_HOST_IP,
	DUPLICATE_CONNECTION,
	DUPLICATE_CONNECTION_REASON,
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
	EVENT_FAILED_TO_ADD_INBOUND_PEER,
	EVENT_NEW_INBOUND_PEER,
} from '../events';
import {
	IncomingPeerConnection,
	P2PCheckPeerCompatibility,
	P2PNodeInfo,
	P2PPeerInfo,
	PeerServerConfig,
} from '../p2p_types';
import { PeerBook } from '../peer_book';
import {
	assignInternalInfo,
	constructPeerId,
	validatePeerInfo,
} from '../utils';

import { PeerInboundHandshakeError } from './../errors';

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

	public async stop(): Promise<void> {
		await this._stopWSServer();
		await this._stopHTTPServer();
	}

	public async start(): Promise<void> {
		this._scServer.on('handshake', (socket: SCServerSocket): void => {
			// Terminate the connection the moment it receive ping frame
			(socket as any).socket.on('ping', () => {
				(socket as any).socket.terminate();

				return;
			});
			// Terminate the connection the moment it receive pong frame
			(socket as any).socket.on('pong', () => {
				(socket as any).socket.terminate();

				return;
			});

			if (this._peerBook.bannedIPs.has(socket.remoteAddress)) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);

				return;
			}
		});

		this._scServer.on('connection', (socket: SCServerSocket): void => {
			if (!socket.request.url) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_URL_CODE,
					INVALID_CONNECTION_URL_REASON,
				);

				return;
			}
			const queryObject = url.parse(socket.request.url, true).query;

			if (queryObject.nonce === this._nodeInfo.nonce) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_SELF_CODE,
					INVALID_CONNECTION_SELF_REASON,
				);

				const selfWSPort = queryObject.wsPort
					? +queryObject.wsPort
					: this._nodeInfo.wsPort;

				// Delete you peerinfo from both the lists
				this._peerBook.removePeer({
					peerId: constructPeerId(socket.remoteAddress, selfWSPort),
					ipAddress: socket.remoteAddress,
					wsPort: selfWSPort,
				});

				return;
			}

			if (
				typeof queryObject.wsPort !== 'string' ||
				typeof queryObject.version !== 'string' ||
				typeof queryObject.networkId !== 'string'
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

			// tslint:disable-next-line no-let
			let queryOptions;

			try {
				queryOptions =
					typeof queryObject.options === 'string'
						? JSON.parse(queryObject.options)
						: undefined;
			} catch (error) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INVALID_CONNECTION_QUERY_CODE,
					INVALID_CONNECTION_QUERY_REASON,
				);

				return;
			}

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
				validatePeerInfo(
					incomingPeerInfo,
					this._maxPeerInfoSize
						? this._maxPeerInfoSize
						: DEFAULT_MAX_PEER_INFO_SIZE,
				);
			} catch (error) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					INCOMPATIBLE_PEER_INFO_CODE,
					error,
				);
			}

			const { success, error } = this._peerHandshakeCheck(
				incomingPeerInfo,
				this._nodeInfo,
			);

			if (!success) {
				const incompatibilityReason = error || INCOMPATIBLE_PEER_UNKNOWN_REASON;

				this._disconnectSocketDueToFailedHandshake(
					socket,
					INCOMPATIBLE_PEER_CODE,
					incompatibilityReason,
				);

				return;
			}

			try {
				const incomingPeerConnection: IncomingPeerConnection = {
					peerInfo: incomingPeerInfo,
					socket,
				};

				this.emit(EVENT_NEW_INBOUND_PEER, incomingPeerConnection);
			} catch (err) {
				this._disconnectSocketDueToFailedHandshake(
					socket,
					DUPLICATE_CONNECTION,
					DUPLICATE_CONNECTION_REASON,
				);

				return;
			}

			if (this._peerBook.hasPeer(incomingPeerInfo)) {
				return;
			}

			this._peerBook.addPeer({
				...incomingPeerInfo,
				sourceAddress: socket.remoteAddress,
			});
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
}
