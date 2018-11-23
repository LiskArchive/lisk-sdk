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

/**
 * The purpose of the PeerPool
 */

import { EventEmitter } from 'events';
import http, { Server } from 'http';
import querystring from 'querystring';
import { ILogger } from './p2p_types';
import { Peer } from './peer';

import socketClusterServer from 'socketcluster-server';

export interface IPeerPoolConfig {
	readonly blacklistedPeers?: ReadonlyArray<string>;
	readonly logger: ILogger;
	readonly seedPeers: ReadonlyArray<string>;
}

export class PeerPool extends EventEmitter {
	public httpServer: Server;
	public logger: ILogger;
	public newPeers: Map<string, Peer>;
	public scServer: any;
	public triedPeers: Map<string, Peer>;

	public constructor(config: IPeerPoolConfig) {
		super();

		this.httpServer = http.createServer();
		this.scServer = socketClusterServer.attach(this.httpServer);
		this.newPeers = new Map();
		this.triedPeers = new Map();
		this.logger = config.logger;

		this.handleInboundConnections(this.scServer);
	}

	public getNewPeers(): ReadonlyArray<Peer> {
		return Array.from(this.newPeers.values());
	}

	public getTriedPeers(): ReadonlyArray<Peer> {
		return Array.from(this.triedPeers.values());
	}

	// TODO: Connect to seed nodes and start discovery process.
	public async start(): Promise<void> {
		return Promise.resolve();
	}

	// TODO
	public async stop(): Promise<void> {
		return Promise.resolve();
	}

	private addInboundPeerToMaps(peer: Peer): void {
		const peerId: string = peer.getId();

		if (this.triedPeers.has(peerId)) {
			this.logger.trace(
				`Received inbound connection from peer ${peerId} which is already in our triedPeers map.`,
			);
		} else if (this.newPeers.has(peerId)) {
			this.logger.trace(
				`Received inbound connection from peer ${peerId} which is already in our newPeers map.`,
			);
		} else {
			this.logger.trace(`Received inbound connection from new peer ${peerId}`);
			this.newPeers.set(peerId, peer);
			super.emit('newInboundPeer', peer);
			super.emit('newPeer', peer);
		}
	}

	private handleInboundConnections(scServer: any): void {
		scServer.on('connection', (socket: any) => {
			const queryObject: any = querystring.parse(socket.request.url);
			const peer: Peer = new Peer({
				clock: new Date(),
				height: 0,
				httpPort: queryObject.httpPort,
				id: `${socket.remoteAddress}:${queryObject.wsPort}`,
				inboundSocket: socket,
				ip: socket.remoteAddress,
				logger: this.logger,
				os: queryObject.os,
				version: queryObject.version,
				wsPort: queryObject.wsPort,
			});
			this.addInboundPeerToMaps(peer);
		});
	}
}
