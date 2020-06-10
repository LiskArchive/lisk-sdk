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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { KVStore, NotFoundError } from '@liskhq/lisk-db';
import * as liskP2P from '@liskhq/lisk-p2p';
import { lookupPeersIPs } from './utils';
import { Logger } from '../logger';
import { InMemoryChannel } from '../../controller/channels';
import { EventInfoObject } from '../../controller/event';
import { NetworkConfig } from '../../types';

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

const hasNamespaceReg = /:/;

const DB_KEY_NETWORK_NODE_SECRET = 'network:nodeSecret';
const DB_KEY_NETWORK_TRIED_PEERS_LIST = 'network:triedPeersList';
const DEFAULT_PEER_SAVE_INTERVAL = 10 * 60 * 1000; // 10min in ms

interface NetworkConstructor {
	readonly options: NetworkConfig;
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly nodeDB: KVStore;
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

export class Network {
	private readonly _options: NetworkConfig;
	private readonly _channel: InMemoryChannel;
	private readonly _logger: Logger;
	private readonly _nodeDB: KVStore;
	private _secret: number | null;
	private _p2p!: liskP2P.P2P;

	public constructor({ options, channel, logger, nodeDB }: NetworkConstructor) {
		this._options = options;
		this._channel = channel;
		this._logger = logger;
		this._nodeDB = nodeDB;
		this._secret = null;
	}

	public async bootstrap(): Promise<void> {
		let previousPeers: ReadonlyArray<liskP2P.p2pTypes.ProtocolPeerInfo> = [];
		try {
			// Load peers from the database that were tried or connected the last time node was running
			const previousPeersBuffer = await this._nodeDB.get(
				DB_KEY_NETWORK_TRIED_PEERS_LIST,
			);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			previousPeers = JSON.parse(previousPeersBuffer.toString('utf8'));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				this._logger.error(
					{ err: error as Error },
					'Error while querying nodeDB',
				);
			}
		}

		// Get previous secret if exists
		let secret: string | undefined;
		try {
			const secretBuffer = await this._nodeDB.get(DB_KEY_NETWORK_NODE_SECRET);
			secret = JSON.parse(secretBuffer.toString('utf8')) as string;
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				this._logger.error(
					{ err: error as Error },
					'Error while querying nodeDB',
				);
			}
		}
		if (!secret) {
			this._secret = getRandomBytes(4).readUInt32BE(0);
			await this._nodeDB.put(
				DB_KEY_NETWORK_NODE_SECRET,
				Buffer.from(JSON.stringify(this._secret.toString())),
			);
		} else {
			this._secret = Number(secret);
		}

		const sanitizeNodeInfo = (
			nodeInfo: liskP2P.p2pTypes.P2PNodeInfo,
		): liskP2P.p2pTypes.P2PNodeInfo => ({
			...nodeInfo,
			advertiseAddress: this._options.advertiseAddress ?? true,
		});

		const initialNodeInfo = sanitizeNodeInfo(
			await this._channel.invoke('app:getApplicationState'),
		);
		const seedPeers = await lookupPeersIPs(this._options.seedPeers, true);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const blacklistedIPs = this._options.blacklistedIPs ?? [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const fixedPeers = this._options.fixedPeers
			? this._options.fixedPeers.map(peer => ({
					ipAddress: peer.ip,
					wsPort: peer.wsPort,
			  }))
			: [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const whitelistedPeers = this._options.whitelistedPeers
			? this._options.whitelistedPeers.map(peer => ({
					ipAddress: peer.ip,
					wsPort: peer.wsPort,
			  }))
			: [];

		const p2pConfig = {
			nodeInfo: initialNodeInfo,
			hostIp: this._options.hostIp,
			blacklistedIPs,
			fixedPeers,
			whitelistedPeers,
			seedPeers: seedPeers.map(peer => ({
				ipAddress: peer.ip,
				wsPort: peer.wsPort,
			})),
			previousPeers,
			maxOutboundConnections: this._options.maxOutboundConnections,
			maxInboundConnections: this._options.maxInboundConnections,
			peerBanTime: this._options.peerBanTime,
			sendPeerLimit: this._options.sendPeerLimit,
			maxPeerDiscoveryResponseLength: this._options
				.maxPeerDiscoveryResponseLength,
			maxPeerInfoSize: this._options.maxPeerInfoSize,
			wsMaxPayload: this._options.wsMaxPayload,
			secret: this._secret,
		};

		this._p2p = new P2P(p2pConfig);

		this._channel.subscribe('app:state:updated', (event: EventInfoObject) => {
			const newNodeInfo = sanitizeNodeInfo(
				event.data as liskP2P.p2pTypes.P2PNodeInfo,
			);
			try {
				this._p2p.applyNodeInfo(newNodeInfo);
			} catch (error) {
				this._logger.error(
					{ err: error as Error },
					'Applying NodeInfo failed because of error',
				);
			}
		});

		// ---- START: Bind event handlers ----
		this._p2p.on(EVENT_NETWORK_READY, () => {
			this._logger.debug('Node connected to the network');
			this._channel.publish('app:network:ready');
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
			this._logger.debug(
				{ err: error },
				'EVENT_OUTBOUND_SOCKET_ERROR: Outbound socket error',
			);
		});

		this._p2p.on(EVENT_INBOUND_SOCKET_ERROR, (error: Error) => {
			this._logger.debug(
				{ err: error },
				'EVENT_INBOUND_SOCKET_ERROR: Inbound socket error',
			);
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
			this._logger.error(
				{ err: error },
				'EVENT_FAILED_PEER_INFO_UPDATE: Failed peer update',
			);
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
			// eslint-disable-next-line @typescript-eslint/prefer-includes
			const hasTargetModule = hasNamespaceReg.test(request.procedure);
			// If the request has no target module, default to app (to support legacy protocol).
			const sanitizedProcedure = hasTargetModule
				? request.procedure
				: `app:${request.procedure}`;
			try {
				const result = await this._channel.invokePublic<
					liskP2P.p2pTypes.P2PNodeInfo
				>(sanitizedProcedure, {
					data: request.data,
					peerId: request.peerId,
				});
				this._logger.trace(
					{ procedure: request.procedure },
					'Peer request fulfilled event: Responded to peer request',
				);
				request.end(result); // Send the response back to the peer.
			} catch (error) {
				this._logger.error(
					{ err: error as Error, procedure: request.procedure },
					'Peer request not fulfilled event: Could not respond to peer request',
				);
				request.error(error); // Send an error back to the peer.
			}
		});

		this._p2p.on(
			EVENT_MESSAGE_RECEIVED,
			(packet: { readonly peerId: string; readonly event: string }) => {
				this._logger.trace(
					{
						peerId: packet.peerId,
						event: packet.event,
					},
					'EVENT_MESSAGE_RECEIVED: Received inbound message',
				);
				this._channel.publish('app:network:event', packet);
			},
		);

		this._p2p.on(EVENT_BAN_PEER, (peerId: string) => {
			this._logger.error(
				{ peerId },
				'EVENT_MESSAGE_RECEIVED: Peer has been banned temporarily',
			);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			const triedPeers = this._p2p.getTriedPeers();
			if (triedPeers.length) {
				await this._nodeDB.put(
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
			process.exit(0);
		}
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

	public getConnectedPeers(): ReadonlyArray<liskP2P.p2pTypes.ProtocolPeerInfo> {
		return this._p2p.getConnectedPeers();
	}

	public getDisconnectedPeers(): ReadonlyArray<
		liskP2P.p2pTypes.ProtocolPeerInfo
	> {
		return this._p2p.getDisconnectedPeers();
	}

	public applyPenalty(penaltyPacket: liskP2P.p2pTypes.P2PPenalty): void {
		return this._p2p.applyPenalty({
			peerId: penaltyPacket.peerId,
			penalty: penaltyPacket.penalty,
		});
	}

	public async cleanup(): Promise<void> {
		// TODO: Unsubscribe 'app:state:updated' from channel.
		this._logger.info({}, 'Cleaning network...');

		await this._p2p.stop();
	}
}
