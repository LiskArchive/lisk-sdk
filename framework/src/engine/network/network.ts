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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { Database, NotFoundError } from '@liskhq/lisk-db';
import { EventEmitter } from 'events';
import * as liskP2P from '@liskhq/lisk-p2p';

import { EVENT_NETWORK_READY as ENGINE_EVENT_NETWORK_READY } from '../events';
import { lookupPeersIPs } from './utils';
import { Logger } from '../../logger';
import { NetworkConfig } from '../../types';
import { customNodeInfoSchema } from './schema';
import { Endpoint } from './endpoint';

const {
	P2P,
	events: {
		EVENT_NETWORK_READY,
		EVENT_NEW_INBOUND_PEER,
		EVENT_CLOSE_INBOUND,
		EVENT_CLOSE_OUTBOUND,
		EVENT_CONNECT_OUTBOUND,
		EVENT_DISCOVERED_PEER,
		EVENT_FAILED_TO_FETCH_PEER_INFO,
		EVENT_FAILED_TO_PUSH_NODE_INFO,
		EVENT_OUTBOUND_SOCKET_ERROR,
		EVENT_INBOUND_SOCKET_ERROR,
		EVENT_UPDATED_PEER_INFO,
		EVENT_FAILED_PEER_INFO_UPDATE,
		EVENT_REQUEST_RECEIVED,
		EVENT_MESSAGE_RECEIVED,
		EVENT_BAN_PEER,
	},
} = liskP2P;

const DB_KEY_NETWORK_NODE_SECRET = Buffer.from('network:nodeSecret', 'utf8');
const DB_KEY_NETWORK_TRIED_PEERS_LIST = Buffer.from('network:triedPeersList', 'utf8');
const DEFAULT_PEER_SAVE_INTERVAL = 10 * 60 * 1000; // 10min in ms

interface NodeInfoOptions {
	[key: string]: unknown;
	readonly lastBlockID: Buffer;
	readonly height: number;
	readonly maxHeightPrevoted: number;
	readonly blockVersion: number;
	readonly legacy?: Buffer[];
}

interface NetworkConstructor {
	readonly options: NetworkConfig;
}

interface P2PRequestPacket extends liskP2P.p2pTypes.P2PRequestPacket {
	readonly peerId: string;
}

interface P2PMessagePacket extends liskP2P.p2pTypes.P2PMessagePacket {
	readonly peerId: string;
}

interface P2PRequest {
	readonly procedure: string;
	readonly wasResponseSent: boolean;
	readonly data: object;
	readonly peerId: string;
	readonly end: (result: object) => void;
	readonly error: (result: object) => void;
}

type P2PRPCEndpointHandler = (input: { data: unknown; peerId: string }) => unknown;

interface P2PRPCEndpoints {
	[key: string]: P2PRPCEndpointHandler;
}

type P2PEventHandler = (input: { data: Buffer | undefined; peerId: string }) => void;

interface P2PEventHandlers {
	[key: string]: P2PEventHandler;
}

interface NetworkInitArgs {
	chainID: Buffer;
	logger: Logger;
	nodeDB: Database;
}

export class Network {
	public readonly events: EventEmitter;
	private readonly _options: NetworkConfig;
	private readonly _endpoint: Endpoint;

	private _logger!: Logger;
	private _nodeDB!: Database;
	private _chainID!: Buffer;
	private _secret: number | undefined;
	private _p2p!: liskP2P.P2P;
	private _endpoints: P2PRPCEndpoints;
	private _eventHandlers: P2PEventHandlers;
	private _saveIntervalID?: NodeJS.Timer;
	private _nodeInfoOptions!: Record<string, unknown>;

	public constructor({ options }: NetworkConstructor) {
		this._options = options;
		this._endpoints = {};
		this._eventHandlers = {};
		this._secret = undefined;
		this._endpoint = new Endpoint();
		this.events = new EventEmitter();
	}

	public async init(args: NetworkInitArgs): Promise<void> {
		this._logger = args.logger;
		this._nodeDB = args.nodeDB;
		this._chainID = args.chainID;
		let previousPeers: ReadonlyArray<liskP2P.p2pTypes.ProtocolPeerInfo> = [];
		try {
			// Load peers from the database that were tried or connected the last time node was running
			const previousPeersBuffer = await this._nodeDB.get(DB_KEY_NETWORK_TRIED_PEERS_LIST);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			previousPeers = JSON.parse(previousPeersBuffer.toString('utf8'));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				this._logger.error({ err: error as Error }, 'Error while querying nodeDB');
			}
		}

		// Get previous secret if exists
		let secret: Buffer | undefined;
		try {
			secret = await this._nodeDB.get(DB_KEY_NETWORK_NODE_SECRET);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				this._logger.error({ err: error as Error }, 'Error while querying nodeDB');
			}
		}

		if (!secret) {
			secret = utils.getRandomBytes(4);
			await this._nodeDB.set(DB_KEY_NETWORK_NODE_SECRET, secret);
		}

		this._secret = secret?.readUInt32BE(0);

		this._nodeInfoOptions = {
			lastBlockID: Buffer.alloc(0),
			blockVersion: 0,
			height: 0,
			maxHeightPrevoted: 0,
			/* As soon as network will start, the node will sync
			   with the network or check if all the legacy blocks are already present
			   and update "legacy" field with corresponding snapshotBlockID
			*/
			legacy: [],
		};

		const initialNodeInfo = {
			chainID: this._chainID,
			networkVersion: this._options.version,
			// Nonce is required in type, but it is overwritten
			nonce: '',
			advertiseAddress: this._options.advertiseAddress ?? true,
			options: { ...this._nodeInfoOptions },
		};

		const seedPeers = await lookupPeersIPs(this._options.seedPeers, true);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const blacklistedIPs = this._options.blacklistedIPs ?? [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const fixedPeers = this._options.fixedPeers
			? this._options.fixedPeers.map(peer => ({
					ipAddress: peer.ip,
					port: peer.port,
			  }))
			: [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const whitelistedPeers = this._options.whitelistedPeers
			? this._options.whitelistedPeers.map(peer => ({
					ipAddress: peer.ip,
					port: peer.port,
			  }))
			: [];

		const p2pConfig: liskP2P.p2pTypes.P2PConfig = {
			port: this._options.port,
			nodeInfo: initialNodeInfo,
			hostIp: this._options.host,
			blacklistedIPs,
			fixedPeers,
			whitelistedPeers,
			seedPeers: seedPeers.map(peer => ({
				ipAddress: peer.ip,
				port: peer.port,
			})),
			previousPeers,
			maxOutboundConnections: this._options.maxOutboundConnections,
			maxInboundConnections: this._options.maxInboundConnections,
			wsMaxPayload: this._options.wsMaxPayload,
			secret: this._secret,
			customNodeInfoSchema,
		};

		this._p2p = new P2P(p2pConfig);
		this._endpoint.init({ p2p: this._p2p });

		// ---- START: Bind event handlers ----
		this._p2p.on(EVENT_NETWORK_READY, () => {
			this._logger.debug('Node connected to the network');
			this.events.emit(ENGINE_EVENT_NETWORK_READY);
		});

		this._p2p.on(
			EVENT_CLOSE_OUTBOUND,
			({ peerInfo, code, reason }: liskP2P.p2pTypes.P2PClosePacket) => {
				this._logger.debug(
					{
						...peerInfo,
						code,
						reason,
					},
					'EVENT_CLOSE_OUTBOUND: Close outbound peer connection',
				);
			},
		);

		this._p2p.on(
			EVENT_CLOSE_INBOUND,
			({ peerInfo, code, reason }: liskP2P.p2pTypes.P2PClosePacket) => {
				this._logger.debug(
					{
						...peerInfo,
						code,
						reason,
					},
					'EVENT_CLOSE_INBOUND: Close inbound peer connection',
				);
			},
		);

		this._p2p.on(EVENT_CONNECT_OUTBOUND, peerInfo => {
			this._logger.debug(
				{
					...peerInfo,
				},
				'EVENT_CONNECT_OUTBOUND: Outbound peer connection',
			);
		});

		this._p2p.on(EVENT_DISCOVERED_PEER, peerInfo => {
			this._logger.trace(
				{
					...peerInfo,
				},
				'EVENT_DISCOVERED_PEER: Discovered peer connection',
			);
		});

		this._p2p.on(EVENT_NEW_INBOUND_PEER, peerInfo => {
			this._logger.debug(
				{
					...peerInfo,
				},
				'EVENT_NEW_INBOUND_PEER: Inbound peer connection',
			);
		});

		this._p2p.on(EVENT_FAILED_TO_FETCH_PEER_INFO, (error: Error) => {
			this._logger.error(
				{ err: error },
				'EVENT_FAILED_TO_FETCH_PEER_INFO: Failed to fetch peer info',
			);
		});

		this._p2p.on(EVENT_FAILED_TO_PUSH_NODE_INFO, (error: Error) => {
			this._logger.trace(
				{ err: error },
				'EVENT_FAILED_TO_PUSH_NODE_INFO: Failed to push node info',
			);
		});

		this._p2p.on(EVENT_OUTBOUND_SOCKET_ERROR, (error: Error) => {
			this._logger.debug({ err: error }, 'EVENT_OUTBOUND_SOCKET_ERROR: Outbound socket error');
		});

		this._p2p.on(EVENT_INBOUND_SOCKET_ERROR, (error: Error) => {
			this._logger.debug({ err: error }, 'EVENT_INBOUND_SOCKET_ERROR: Inbound socket error');
		});

		this._p2p.on(EVENT_UPDATED_PEER_INFO, peerInfo => {
			this._logger.trace(
				{
					...peerInfo,
				},
				'EVENT_UPDATED_PEER_INFO: Update peer info',
			);
		});

		this._p2p.on(EVENT_FAILED_PEER_INFO_UPDATE, (error: Error) => {
			this._logger.error({ err: error }, 'EVENT_FAILED_PEER_INFO_UPDATE: Failed peer update');
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._p2p.on(EVENT_REQUEST_RECEIVED, async (request: P2PRequest) => {
			this._logger.trace(
				{ procedure: request.procedure },
				'EVENT_REQUEST_RECEIVED: Received inbound request for procedure',
			);

			// If the request has already been handled internally by the P2P library, we ignore.
			if (request.wasResponseSent) {
				return;
			}

			if (!Object.keys(this._endpoints).includes(request.procedure)) {
				const error = new Error(`Requested procedure "${request.procedure}" is not permitted.`);
				this._logger.warn(
					{ err: error, procedure: request.procedure },
					'Peer request not fulfilled event: Requested procedure is not permitted. Applying a penalty to the peer',
				);

				// Ban peer on if non-permitted procedure is requested
				this._p2p.applyPenalty({ peerId: request.peerId, penalty: 100 });

				// Send an error back to the peer.
				request.error(error);
				return;
			}

			try {
				const result = await this._endpoints[request.procedure]({
					data: request.data,
					peerId: request.peerId,
				});
				this._logger.trace(
					{ procedure: request.procedure },
					'Peer request fulfilled event: Responded to peer request',
				);
				request.end(result as object); // Send the response back to the peer.
			} catch (error) {
				this._logger.error(
					{ err: error as Error, procedure: request.procedure },
					'Peer request not fulfilled event: Could not respond to peer request',
				);
				request.error(error as Error); // Send an error back to the peer.
			}
		});

		this._p2p.on(
			EVENT_MESSAGE_RECEIVED,
			(packet: {
				readonly peerId: string;
				readonly event: string;
				readonly data: Buffer | undefined;
			}) => {
				if (!Object.keys(this._eventHandlers).includes(packet.event)) {
					const error = new Error(`Sent event "${packet.event}" is not permitted.`);
					this._logger.warn(
						{ err: error, event: packet.event },
						'Peer request not fulfilled. Sent event is not permitted. Applying a penalty to the peer',
					);
					// Ban peer on if non-permitted procedure is requested
					this._p2p.applyPenalty({ peerId: packet.peerId, penalty: 100 });

					return;
				}
				this._logger.trace(
					{
						peerId: packet.peerId,
						event: packet.event,
					},
					'EVENT_MESSAGE_RECEIVED: Received inbound message',
				);
				try {
					this._eventHandlers[packet.event](packet);
				} catch (error) {
					this._logger.warn(
						{ err: error as Error, event: packet.event },
						'Peer request not fulfilled event: Fail to handle event. Applying a penalty to the peer',
					);
					this._p2p.applyPenalty({ peerId: packet.peerId, penalty: 100 });
				}
			},
		);
		this._p2p.on(EVENT_BAN_PEER, (peerId: string) => {
			this._logger.error({ peerId }, 'EVENT_MESSAGE_RECEIVED: Peer has been banned temporarily');
		});
	}

	public async start(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._saveIntervalID = setInterval(async () => {
			const triedPeers = this._p2p.getTriedPeers();
			if (triedPeers.length) {
				await this._nodeDB.set(
					DB_KEY_NETWORK_TRIED_PEERS_LIST,
					Buffer.from(JSON.stringify(triedPeers), 'utf8'),
				);
			}
		}, DEFAULT_PEER_SAVE_INTERVAL);

		// ---- END: Bind event handlers ----

		try {
			await this._p2p.start();
		} catch (error) {
			this._logger.fatal(
				{
					message: (error as Error).message,
					stack: (error as Error).stack,
				},
				'Failed to initialize network',
			);
			throw error;
		}
	}

	public async stop(): Promise<void> {
		this._logger.info('Network cleanup started');
		if (this._saveIntervalID) {
			clearInterval(this._saveIntervalID);
		}
		await this._p2p.stop();
		this._logger.info('Network cleanup completed');
	}

	public get endpoint(): Endpoint {
		return this._endpoint;
	}

	public registerEndpoint(endpoint: string, handler: P2PRPCEndpointHandler): void {
		if (this._endpoints[endpoint]) {
			throw new Error(`Endpoint ${endpoint} has already been registered.`);
		}
		this._endpoints[endpoint] = handler;
	}

	public registerHandler(event: string, handler: P2PEventHandler): void {
		if (this._eventHandlers[event]) {
			throw new Error(`Event handler for ${event} has already been registered.`);
		}
		this._eventHandlers[event] = handler;
	}

	public async request(
		requestPacket: liskP2P.p2pTypes.P2PRequestPacket,
	): Promise<liskP2P.p2pTypes.P2PResponsePacket> {
		return this._p2p.request({
			procedure: requestPacket.procedure,
			data: requestPacket.data,
		});
	}

	public send(sendPacket: liskP2P.p2pTypes.P2PMessagePacket): void {
		return this._p2p.send({
			event: sendPacket.event,
			data: sendPacket.data,
		});
	}

	public async requestFromPeer(
		requestPacket: P2PRequestPacket,
	): Promise<liskP2P.p2pTypes.P2PResponsePacket> {
		return this._p2p.requestFromPeer(
			{
				procedure: requestPacket.procedure,
				data: requestPacket.data,
			},
			requestPacket.peerId,
		);
	}

	public sendToPeer(sendPacket: P2PMessagePacket): void {
		return this._p2p.sendToPeer(
			{
				event: sendPacket.event,
				data: sendPacket.data,
			},
			sendPacket.peerId,
		);
	}

	public broadcast(broadcastPacket: liskP2P.p2pTypes.P2PMessagePacket): void {
		return this._p2p.broadcast({
			event: broadcastPacket.event,
			data: broadcastPacket.data,
		});
	}

	public getConnectedPeers(): ReadonlyArray<liskP2P.p2pTypes.PeerInfo> {
		const peers = this._p2p.getConnectedPeers();
		return peers.map(peer => {
			const parsedPeer = {
				...peer,
			};
			if (parsedPeer.options) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				parsedPeer.options = codec.toJSON(customNodeInfoSchema, parsedPeer.options);
			}
			return parsedPeer;
		});
	}

	public getNetworkStats(): liskP2P.p2pTypes.NetworkStats {
		return this._p2p.getNetworkStats();
	}

	public getDisconnectedPeers(): ReadonlyArray<liskP2P.p2pTypes.PeerInfo> {
		const peers = this._p2p.getDisconnectedPeers();
		return peers.map(peer => {
			const parsedPeer = {
				...peer,
			};
			if (parsedPeer.options) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				parsedPeer.options = codec.toJSON(customNodeInfoSchema, parsedPeer.options);
			}
			return parsedPeer;
		});
	}

	public applyPenaltyOnPeer(penaltyPacket: liskP2P.p2pTypes.P2PPenalty): void {
		return this._p2p.applyPenalty({
			peerId: penaltyPacket.peerId,
			penalty: penaltyPacket.penalty,
		});
	}

	public applyNodeInfo(data: Partial<NodeInfoOptions>): void {
		this._nodeInfoOptions = { ...this._nodeInfoOptions, ...data };
		const newNodeInfo = {
			chainID: this._chainID,
			networkVersion: this._options.version,
			advertiseAddress: this._options.advertiseAddress ?? true,
			options: this._nodeInfoOptions,
		};

		try {
			this._p2p.applyNodeInfo(newNodeInfo);
		} catch (error) {
			this._logger.error({ err: error as Error }, 'Applying NodeInfo failed because of error');
		}
	}
}
