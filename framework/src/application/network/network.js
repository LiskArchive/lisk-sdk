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

'use strict';

const { getRandomBytes } = require('@liskhq/lisk-cryptography');
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
		EVENT_UNBAN_PEER,
	},
} = require('@liskhq/lisk-p2p');
const { lookupPeersIPs } = require('./utils');

const hasNamespaceReg = /:/;

const NETWORK_INFO_KEY_NODE_SECRET = 'network:nodeSecret';
const NETWORK_INFO_KEY_TRIED_PEERS = 'network:triedPeersList';
const DEFAULT_PEER_SAVE_INTERVAL = 10 * 60 * 1000; // 10min in ms

module.exports = class Network {
	constructor({ options, channel, logger, storage }) {
		this.options = options;
		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.secret = null;
	}

	async bootstrap() {
		// Load peers from the database that were tried or connected the last time node was running
		const previousPeersStr = await this.storage.entities.NetworkInfo.getKey(
			NETWORK_INFO_KEY_TRIED_PEERS,
		);
		let previousPeers = [];
		try {
			previousPeers = previousPeersStr ? JSON.parse(previousPeersStr) : [];
		} catch (err) {
			this.logger.error({ err }, 'Failed to parse JSON of previous peers.');
		}

		// Get previous secret if exists
		const secret = await this.storage.entities.NetworkInfo.getKey(
			NETWORK_INFO_KEY_NODE_SECRET,
		);
		if (!secret) {
			this.secret = getRandomBytes(4).readUInt32BE(0);
			await this.storage.entities.NetworkInfo.setKey(
				NETWORK_INFO_KEY_NODE_SECRET,
				this.secret,
			);
		} else {
			this.secret = Number(secret);
		}

		const sanitizeNodeInfo = nodeInfo => ({
			...nodeInfo,
			advertiseAddress: this.options.advertiseAddress,
		});

		const initialNodeInfo = sanitizeNodeInfo(
			await this.channel.invoke('app:getApplicationState'),
		);
		const seedPeers = await lookupPeersIPs(this.options.seedPeers, true);
		const blacklistedIPs = this.options.blacklistedIPs || [];

		const fixedPeers = this.options.fixedPeers
			? this.options.fixedPeers.map(peer => ({
					ipAddress: peer.ip,
					wsPort: peer.wsPort,
			  }))
			: [];

		const whitelistedPeers = this.options.whitelistedPeers
			? this.options.whitelistedPeers.map(peer => ({
					ipAddress: peer.ip,
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
				ipAddress: peer.ip,
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

		this.channel.subscribe('app:state:updated', event => {
			const newNodeInfo = sanitizeNodeInfo(event.data);
			try {
				this.p2p.applyNodeInfo(newNodeInfo);
			} catch (error) {
				this.logger.error(
					`Applying NodeInfo failed because of error: ${error.message ||
						error}`,
				);
			}
		});

		// ---- START: Bind event handlers ----
		this.p2p.on(EVENT_NETWORK_READY, () => {
			this.logger.debug('Node connected to the network');
			this.channel.publish('app:networkReady');
		});

		this.p2p.on(EVENT_CLOSE_OUTBOUND, closePacket => {
			this.logger.debug(
				{
					ipAddress: closePacket.peerInfo.ipAddress,
					wsPort: closePacket.peerInfo.wsPort,
					code: closePacket.code,
					reason: closePacket.reason,
				},
				'EVENT_CLOSE_OUTBOUND: Close outbound peer connection',
			);
		});

		this.p2p.on(EVENT_CLOSE_INBOUND, closePacket => {
			this.logger.debug(
				{
					ipAddress: closePacket.peerInfo.ipAddress,
					wsPort: closePacket.peerInfo.wsPort,
					code: closePacket.code,
					reason: closePacket.reason,
				},
				'EVENT_CLOSE_INBOUND: Close inbound peer connection',
			);
		});

		this.p2p.on(EVENT_CONNECT_OUTBOUND, peerInfo => {
			this.logger.debug(
				{
					ipAddress: peerInfo.ipAddress,
					wsPort: peerInfo.wsPort,
				},
				'EVENT_CONNECT_OUTBOUND: Outbound peer connection',
			);
		});

		this.p2p.on(EVENT_DISCOVERED_PEER, peerInfo => {
			this.logger.trace(
				{
					ipAddress: peerInfo.ipAddress,
					wsPort: peerInfo.wsPort,
				},
				'EVENT_DISCOVERED_PEER: Discovered peer connection',
			);
		});

		this.p2p.on(EVENT_NEW_INBOUND_PEER, peerInfo => {
			this.logger.debug(
				{
					ipAddress: peerInfo.ipAddress,
					wsPort: peerInfo.wsPort,
				},
				'EVENT_NEW_INBOUND_PEER: Inbound peer connection',
			);
		});

		this.p2p.on(EVENT_FAILED_TO_FETCH_PEER_INFO, error => {
			this.logger.error(error.message || error);
		});

		this.p2p.on(EVENT_FAILED_TO_PUSH_NODE_INFO, error => {
			this.logger.trace(error.message || error);
		});

		this.p2p.on(EVENT_OUTBOUND_SOCKET_ERROR, error => {
			this.logger.debug(error.message || error);
		});

		this.p2p.on(EVENT_INBOUND_SOCKET_ERROR, error => {
			this.logger.debug(error.message || error);
		});

		this.p2p.on(EVENT_UPDATED_PEER_INFO, peerInfo => {
			this.logger.trace(
				{
					ipAddress: peerInfo.ipAddress,
					wsPort: peerInfo.wsPort,
				},
				'EVENT_UPDATED_PEER_INFO: Update peer info',
				JSON.stringify(peerInfo),
			);
		});

		this.p2p.on(EVENT_FAILED_PEER_INFO_UPDATE, error => {
			this.logger.error(error.message || error);
		});

		this.p2p.on(EVENT_REQUEST_RECEIVED, async request => {
			this.logger.trace(
				`EVENT_REQUEST_RECEIVED: Received inbound request for procedure ${request.procedure}`,
			);
			// If the request has already been handled internally by the P2P library, we ignore.
			if (request.wasResponseSent) {
				return;
			}
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
					`Peer request fulfilled event: Responded to peer request ${request.procedure}`,
				);
				request.end(result); // Send the response back to the peer.
			} catch (error) {
				this.logger.error(
					`Peer request not fulfilled event: Could not respond to peer request ${
						request.procedure
					} because of error: ${error.message || error}`,
				);
				request.error(error); // Send an error back to the peer.
			}
		});

		this.p2p.on(EVENT_MESSAGE_RECEIVED, async packet => {
			this.logger.trace(
				`EVENT_MESSAGE_RECEIVED: Received inbound message from ${packet.peerId} for event ${packet.event}`,
			);
			this.channel.publish('app:networkEvent', packet);
		});

		this.p2p.on(EVENT_BAN_PEER, peerId => {
			this.logger.error(
				{ peerId },
				'EVENT_MESSAGE_RECEIVED: Peer has been banned temporarily',
			);
		});

		this.p2p.on(EVENT_UNBAN_PEER, peerId => {
			this.logger.error(
				{ peerId },
				'EVENT_MESSAGE_RECEIVED: Peer ban has expired',
			);
		});

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
					message: error.message,
					stack: error.stack,
				},
				'Failed to initialize network',
			);
			process.emit('cleanup', error);
		}
	}

	async request(requestPacket) {
		return this.p2p.request({
			procedure: requestPacket.procedure,
			data: requestPacket.data,
		});
	}

	send(sendPacket) {
		return this.p2p.send({
			event: sendPacket.event,
			data: sendPacket.data,
		});
	}

	async requestFromPeer(requestPacket) {
		return this.p2p.requestFromPeer(
			{
				procedure: requestPacket.procedure,
				data: requestPacket.data,
			},
			requestPacket.peerId,
		);
	}

	sendToPeer(sendPacket) {
		return this.p2p.sendToPeer(
			{
				event: sendPacket.event,
				data: sendPacket.data,
			},
			sendPacket.peerId,
		);
	}

	broadcast(broadcastPacket) {
		return this.p2p.broadcast({
			event: broadcastPacket.event,
			data: broadcastPacket.data,
		});
	}

	getConnectedPeers() {
		return this.p2p.getConnectedPeers();
	}

	getDisconnectedPeers() {
		return this.p2p.getDisconnectedPeers();
	}

	applyPenalty(penaltyPacket) {
		return this.p2p.applyPenalty({
			peerId: penaltyPacket.peerId,
			penalty: penaltyPacket.penalty,
		});
	}

	async stop() {
		// TODO: Unsubscribe 'app:state:updated' from channel.
		this.logger.info('Cleaning network...');

		await this.p2p.stop();
	}
};
