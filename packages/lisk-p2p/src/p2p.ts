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

import { EventEmitter } from 'events';
import http, { Server } from 'http';
import { platform } from 'os';
import querystring from 'querystring';
import socketClusterServer from 'socketcluster-server';

import { Peer } from './peer';

import {
	NetworkStatus,
	P2PMessagePacket,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
	P2PConfig,
	PeerInfo,
	RPCResponsePeerList,
	RPCResponsePeerInfo,
	P2PNodeStatus,
} from './p2p_types';

import { PeerPool } from './peer_pool';

export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NEW_PEER = 'newPeer';

const BASE_10_RADIX = 10;

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _peerPool: PeerPool;
	private readonly _httpServer: Server;
	private readonly _scServer: any;
	private readonly _newPeers: Set<string>;
	// TODO: private readonly _triedPeers: Set<string>;
	private _nodeStatus: P2PNodeStatus;

	public constructor(config: P2PConfig) {
		super();
		this._config = config;
		this._nodeStatus = {
			wsPort: config.wsPort,
			os: platform(),
			version: config.version,
		};
		this._newPeers = new Set();
		// TODO: this._triedPeers = new Set();

		this._peerPool = new PeerPool();
		this._httpServer = http.createServer();
		this._scServer = socketClusterServer.attach(this._httpServer);
	}

	public applyPenalty = (penalty: P2PPenalty): void => {
		penalty;
	};
	// TODO
	public getNetworkStatus = (): NetworkStatus => true;
	// TODO

	public async request<T>(
		packet: P2PRequestPacket<T>,
	): Promise<P2PResponsePacket> {
		return Promise.resolve({ data: packet });
	}

	public send<T>(message: P2PMessagePacket<T>): void {
		message;
		// TODO
	}

	public get nodeStatus(): P2PNodeStatus {
		return this._nodeStatus;
	}

	public set nodeStatus(value: P2PNodeStatus) {
		this._nodeStatus = value;
	}

	private async _startPeerServer(): Promise<void> {
		this._scServer.on(
			'connection',
			(socket: any): void => {
				const queryObject = querystring.parse(socket.request.url);
				if (
					typeof queryObject.wsPort !== 'string' ||
					typeof queryObject.os !== 'string' ||
					typeof queryObject.version !== 'string'
				) {
					super.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER);
				} else {
					const wsPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
					const peerId = P2P.generatePeerIdFromPeerInfo({
						ipAddress: socket.remoteAddress,
						wsPort,
					});
					const existingPeer = this._peerPool.getPeer(peerId);
					if (existingPeer === undefined) {
						const peer = new Peer({
							height: 0,
							id: peerId,
							inboundSocket: socket,
							ipAddress: socket.remoteAddress,
							os: queryObject.os,
							version: queryObject.version,
							wsPort,
							nodeStatus: this._nodeStatus,
						});
						this._peerPool.addPeer(peer);
						super.emit(EVENT_NEW_INBOUND_PEER, peer);
						super.emit(EVENT_NEW_PEER, peer);
					} else {
						existingPeer.inboundSocket = socket;
					}
					this._newPeers.add(peerId);
				}
			},
		);
		this._httpServer.listen(this._config.wsPort);

		return new Promise<void>(resolve => {
			this._scServer.once('ready', () => {
				resolve();
			});
		});
	}

	private async _stopPeerServer(): Promise<void> {
		// TODO: Test this and check for potential failure scenarios.
		return new Promise<void>(resolve => {
			this._scServer.close(() => {
				resolve();
			});
		});
	}

	public async _loadListOfPeerListsFromSeeds(
		seedList: ReadonlyArray<PeerInfo>,
	): Promise<ReadonlyArray<ReadonlyArray<Peer>>> {
		return Promise.all(
			seedList.map(async (seedPeer: PeerInfo) => {
				const seedPeerId = P2P.generatePeerIdFromPeerInfo(seedPeer);
				const peer = new Peer({
					id: seedPeerId,
					ipAddress: seedPeer.ipAddress,
					wsPort: seedPeer.wsPort,
					nodeStatus: this._nodeStatus,
				});
				this._newPeers.add(seedPeerId);
				/**
				 * TODO LATER: For the LIP phase, we shouldn't add the seed peers to our
				 * _peerPool and we should disconnect from them as soon as we've loaded their peer lists.
				 */
				this._peerPool.addPeer(peer);
				// TODO LATER: For the LIP phase, the 'list' request will need to be renamed.
				const seedNodePeerListResponse = await peer.request<void>({
					procedure: 'list',
				});
				const peerListResponse = seedNodePeerListResponse.data as RPCResponsePeerList;
				// TODO ASAP: Validate the response before returning. Check that seedNodePeerListResponse.data.peers exists.

				return peerListResponse.peers.map((peerObject: RPCResponsePeerInfo) => {
					const peerOfPeerId = P2P.generatePeerIdFromPeerInfo({
						ipAddress: peerObject.ip,
						wsPort: peerObject.wsPort,
					});

					return new Peer({
						id: peerOfPeerId,
						ipAddress: peerObject.ip,
						wsPort: peerObject.wsPort, // TODO ASAP: Add more properties
						nodeStatus: this._nodeStatus,
					});
				});
			}),
		);
	}

	public start = async (): Promise<void> => {
		await this._startPeerServer();
		await this._loadListOfPeerListsFromSeeds(this._config.seedPeers);
	};

	public stop = async (): Promise<void> => {
		this._peerPool.disconnectAllPeers();
		await this._stopPeerServer();
	};

	public static generatePeerIdFromPeerInfo(peerInfo: PeerInfo): string {
		return `${peerInfo.ipAddress}:${peerInfo.wsPort}`;
	}
}
