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
import * as liskP2p from '@liskhq/lisk-p2p';
import { lookupPeersIPs } from './utils';
import { Channel, Logger, Storage, P2PConfig } from '../../types';

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
} = liskP2p;

const hasNamespaceReg = /:/;

const NETWORK_INFO_KEY_NODE_SECRET = 'network:nodeSecret';
const NETWORK_INFO_KEY_TRIED_PEERS = 'network:triedPeersList';
const DEFAULT_PEER_SAVE_INTERVAL = 10 * 60 * 1000; // 10min in ms

interface NetworkConstructor {
	readonly options: P2PConfig;
	readonly channel: Channel<liskP2p.p2pTypes.P2PNodeInfo>;
	readonly logger: Logger;
	readonly storage: Storage;
	secret: string;
}

interface P2PRequestPacket extends liskP2p.p2pTypes.P2PRequestPacket {
	readonly peerId: string;
}

interface P2PMessagePacket extends liskP2p.p2pTypes.P2PMessagePacket {
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
	private readonly options: P2PConfig;
	private readonly channel: Channel<liskP2p.p2pTypes.P2PNodeInfo>;
	private readonly logger: Logger;
	private readonly storage: Storage;
	private secret: number | null;
	private p2p!: liskP2p.P2P;

	public constructor({
		options,
		channel,
		logger,
		storage,
	}: NetworkConstructor) {
		this.options = options;
		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.secret = null;
	}

	public async bootstrap(): Promise<void> {
		// Load peers from the database that were tried or connected the last time node was running
		const previousPeersStr = await this.storage.entities.NetworkInfo.getKey(
			NETWORK_INFO_KEY_TRIED_PEERS,
		);
		let previousPeers: ReadonlyArray<liskP2p.p2pTypes.ProtocolPeerInfo> = [];
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			previousPeers = previousPeersStr ? JSON.parse(previousPeersStr) : [];
		} catch (err) {
			this.logger.error(
				{ err: err as Error },
				'Failed to parse JSON of previous peers.',
			);
		}

		// Get previous secret if exists
		const secret = await this.storage.entities.NetworkInfo.getKey(
			NETWORK_INFO_KEY_NODE_SECRET,
		);
		if (!secret) {
			this.secret = getRandomBytes(4).readUInt32BE(0);
			await this.storage.entities.NetworkInfo.setKey(
				NETWORK_INFO_KEY_NODE_SECRET,
				this.secret.toString(),
			);
		} else {
			this.secret = Number(secret);
		}

		const sanitizeNodeInfo = (nodeInfo: liskP2p.p2pTypes.P2PNodeInfo) => ({
			...nodeInfo,
			advertiseAddress: this.options.advertiseAddress,
		});

		const initialNodeInfo = sanitizeNodeInfo(
			await this.channel.invoke('app:getApplicationState'),
		);
		const seedPeers = await lookupPeersIPs(this.options.seedPeers, true);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const blacklistedIPs = this.options.blacklistedIPs ?? [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const fixedPeers = this.options.fixedPeers
			? this.options.fixedPeers.map(peer => ({
					ipAddress: peer.ip as string,
					wsPort: peer.wsPort,
			  }))
			: [];

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const whitelistedPeers = this.options.whitelistedPeers
			? this.options.whitelistedPeers.map(peer => ({
					ipAddress: peer.ip as string,
					wsPort: peer.wsPort,
			  }))
			: [];

		const p2pConfig = {
			nodeInfo: initialNodeInfo,
			hostIp: this.options.hostIp,
			blacklistedIPs,
			fixedPeers,
			whitelistedPeers,
			seedPeers: seedPeers.map(peer => ({
				ipAddress: peer.ip as string,
				wsPort: peer.wsPort,
			})),
			previousPeers,
			maxOutboundConnections: this.options.maxOutboundConnections,
			maxInboundConnections: this.options.maxInboundConnections,
			peerBanTime: this.options.peerBanTime,
			sendPeerLimit: this.options.sendPeerLimit,
			maxPeerDiscoveryResponseLength: this.options
				.maxPeerDiscoveryResponseLength,
			maxPeerInfoSize: this.options.maxPeerInfoSize,
			wsMaxPayload: this.options.wsMaxPayload,
			secret: this.secret,
		};

		this.p2p = new P2P(p2pConfig);

		this.channel.subscribe(
			'app:state:updated',
			(event: { readonly data: liskP2p.p2pTypes.P2PNodeInfo }) => {
				const newNodeInfo = sanitizeNodeInfo(event.data);
				try {
					this.p2p.applyNodeInfo(newNodeInfo);
				} catch (error) {
					this.logger.error(
						{ err: error as Error },
						'Applying NodeInfo failed because of error',
					);
				}
			},
		);

		// ---- START: Bind event handlers ----
		this.p2p.on(EVENT_NETWORK_READY, () => {
			this.logger.debug('Node connected to the network');
			this.channel.publish('app:network:ready');
		});

		this.p2p.on(
			EVENT_CLOSE_OUTBOUND,
			({ peerInfo, code, reason }: liskP2p.p2pTypes.P2PClosePacket) => {
				this.logger.debug(
					{
						...peerInfo,
						code,
						reason,
					},
					'EVENT_CLOSE_OUTBOUND: Close outbound peer connection',
				);
			},
		);

		this.p2p.on(
			EVENT_CLOSE_INBOUND,
			({ peerInfo, code, reason }: liskP2p.p2pTypes.P2PClosePacket) => {
				this.logger.debug(
					{
						...peerInfo,
						code,
						reason,
					},
					'EVENT_CLOSE_INBOUND: Close inbound peer connection',
				);
			},
		);

		this.p2p.on(EVENT_CONNECT_OUTBOUND, peerInfo => {
			this.logger.debug(
				{
					...peerInfo,
				},
				'EVENT_CONNECT_OUTBOUND: Outbound peer connection',
			);
		});

		this.p2p.on(EVENT_DISCOVERED_PEER, peerInfo => {
			this.logger.trace(
				{
					...peerInfo,
				},
				'EVENT_DISCOVERED_PEER: Discovered peer connection',
			);
		});

		this.p2p.on(EVENT_NEW_INBOUND_PEER, peerInfo => {
			this.logger.debug(
				{
					...peerInfo,
				},
				'EVENT_NEW_INBOUND_PEER: Inbound peer connection',
			);
		});

		this.p2p.on(EVENT_FAILED_TO_FETCH_PEER_INFO, (error: Error) => {
			this.logger.error(
				{ err: error },
				'EVENT_FAILED_TO_FETCH_PEER_INFO: Failed to fetch peer info',
			);
		});

		this.p2p.on(EVENT_FAILED_TO_PUSH_NODE_INFO, (error: Error) => {
			this.logger.trace(
				{ err: error },
				'EVENT_FAILED_TO_PUSH_NODE_INFO: Failed to push node info',
			);
		});

		this.p2p.on(EVENT_OUTBOUND_SOCKET_ERROR, (error: Error) => {
			this.logger.debug(
				{ err: error },
				'EVENT_OUTBOUND_SOCKET_ERROR: Outbound socket error',
			);
		});

		this.p2p.on(EVENT_INBOUND_SOCKET_ERROR, (error: Error) => {
			this.logger.debug(
				{ err: error },
				'EVENT_INBOUND_SOCKET_ERROR: Inbound socket error',
			);
		});

		this.p2p.on(EVENT_UPDATED_PEER_INFO, peerInfo => {
			this.logger.trace(
				{
					...peerInfo,
				},
				'EVENT_UPDATED_PEER_INFO: Update peer info',
			);
		});

		this.p2p.on(EVENT_FAILED_PEER_INFO_UPDATE, (error: Error) => {
			this.logger.error(
				{ err: error },
				'EVENT_FAILED_PEER_INFO_UPDATE: Failed peer update',
			);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.p2p.on(EVENT_REQUEST_RECEIVED, async (request: P2PRequest) => {
			this.logger.trace(
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
				const result = await this.channel.invokePublic(sanitizedProcedure, {
					data: request.data,
					peerId: request.peerId,
				});
				this.logger.trace(
					{ procedure: request.procedure },
					'Peer request fulfilled event: Responded to peer request',
				);
				request.end(result); // Send the response back to the peer.
			} catch (error) {
				this.logger.error(
					{ err: error as Error, procedure: request.procedure },
					'Peer request not fulfilled event: Could not respond to peer request',
				);
				request.error(error); // Send an error back to the peer.
			}
		});

		this.p2p.on(
			EVENT_MESSAGE_RECEIVED,
			(packet: { readonly peerId: string; readonly event: string }) => {
				this.logger.trace(
					{
						peerId: packet.peerId,
						event: packet.event,
					},
					'EVENT_MESSAGE_RECEIVED: Received inbound message',
				);
				this.channel.publish('app:network:event', packet);
			},
		);

		this.p2p.on(EVENT_BAN_PEER, (peerId: string) => {
			this.logger.error(
				{ peerId },
				'EVENT_MESSAGE_RECEIVED: Peer has been banned temporarily',
			);
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			const triedPeers = this.p2p.getTriedPeers();
			if (triedPeers.length) {
				await this.storage.entities.NetworkInfo.setKey(
					NETWORK_INFO_KEY_TRIED_PEERS,
					JSON.stringify(triedPeers),
				);
			}
		}, DEFAULT_PEER_SAVE_INTERVAL);

		// ---- END: Bind event handlers ----

		try {
			await this.p2p.start();
		} catch (error) {
			this.logger.fatal(
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
		requestPacket: liskP2p.p2pTypes.P2PRequestPacket,
	): Promise<liskP2p.p2pTypes.P2PResponsePacket> {
		return this.p2p.request({
			procedure: requestPacket.procedure,
			data: requestPacket.data,
		});
	}

	public send(sendPacket: liskP2p.p2pTypes.P2PMessagePacket): void {
		return this.p2p.send({
			event: sendPacket.event,
			data: sendPacket.data,
		});
	}

	public async requestFromPeer(
		requestPacket: P2PRequestPacket,
	): Promise<liskP2p.p2pTypes.P2PResponsePacket> {
		return this.p2p.requestFromPeer(
			{
				procedure: requestPacket.procedure,
				data: requestPacket.data,
			},
			requestPacket.peerId,
		);
	}

	public sendToPeer(sendPacket: P2PMessagePacket): void {
		return this.p2p.sendToPeer(
			{
				event: sendPacket.event,
				data: sendPacket.data,
			},
			sendPacket.peerId,
		);
	}

	public broadcast(broadcastPacket: liskP2p.p2pTypes.P2PMessagePacket): void {
		return this.p2p.broadcast({
			event: broadcastPacket.event,
			data: broadcastPacket.data,
		});
	}

	public getConnectedPeers(): ReadonlyArray<liskP2p.p2pTypes.ProtocolPeerInfo> {
		return this.p2p.getConnectedPeers();
	}

	public getDisconnectedPeers(): ReadonlyArray<
		liskP2p.p2pTypes.ProtocolPeerInfo
	> {
		return this.p2p.getDisconnectedPeers();
	}

	public applyPenalty(penaltyPacket: liskP2p.p2pTypes.P2PPenalty): void {
		return this.p2p.applyPenalty({
			peerId: penaltyPacket.peerId,
			penalty: penaltyPacket.penalty,
		});
	}

	public async stop(): Promise<void> {
		// TODO: Unsubscribe 'app:state:updated' from channel.
		this.logger.info({}, 'Cleaning network...');

		await this.p2p.stop();
	}
}
