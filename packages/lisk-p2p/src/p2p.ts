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
import { attach, SCServer, SCServerSocket } from 'socketcluster-server';

import { RequestFailError } from './errors';
import { ConnectionState, Peer, PeerInfo } from './peer';
import { discoverPeers } from './peer_discovery';
import { PeerOptions, selectForConnection } from './peer_selection';

import {
	P2PConfig,
	P2PMessagePacket,
	P2PNetworkStatus,
	P2PNodeInfo,
	P2PPenalty,
	P2PRequestPacket,
	P2PResponsePacket,
} from './p2p_types';

type SCServerCloseCallback = () => void;

type SCServerUpdated = {
	readonly close: (sCServerCloseCallback: SCServerCloseCallback) => void;
} & SCServer;

import { PeerPool } from './peer_pool';

export const EVENT_NEW_INBOUND_PEER = 'newInboundPeer';
export const EVENT_FAILED_TO_ADD_INBOUND_PEER = 'failedToAddInboundPeer';
export const EVENT_NEW_PEER = 'newPeer';

const BASE_10_RADIX = 10;

export class P2P extends EventEmitter {
	private readonly _config: P2PConfig;
	private readonly _httpServer: Server;
	private _isActive: boolean;
	private readonly _newPeers: Set<PeerInfo>;
	private readonly _triedPeers: Set<PeerInfo>;

	private _nodeInfo: P2PNodeInfo;
	private readonly _peerPool: PeerPool;
	private readonly _scServer: SCServerUpdated;

	public constructor(config: P2PConfig) {
		super();
		this._config = config;
		this._nodeInfo = {
			wsPort: config.wsPort,
			os: platform(),
			version: config.version,
			height: 0,
		};
		this._isActive = false;
		this._newPeers = new Set();
		this._triedPeers = new Set();

		this._peerPool = new PeerPool();
		this._httpServer = http.createServer();
		this._scServer = attach(this._httpServer) as SCServerUpdated;
	}

	public get isActive(): boolean {
		return this._isActive;
	}

	public get nodeInfo(): P2PNodeInfo {
		return this._nodeInfo;
	}

	/**
	 * This is not a declared as a setter because this method will need
	 * invoke an async RPC on Peers to give them our new node status.
	 */
	public applyNodeInfo(nodeInfo: P2PNodeInfo): void {
		this._nodeInfo = nodeInfo;
		const peerList = this._peerPool.getAllPeers();
		peerList.forEach(peer => {
			peer.applyNodeInfo(nodeInfo);
		});
	}

	/* tslint:disable:next-line: prefer-function-over-method */
	public applyPenalty(penalty: P2PPenalty): void {
		penalty;
	}

	public getNetworkStatus(): P2PNetworkStatus {
		const newPeers: ReadonlyArray<PeerInfo> = [...this._newPeers.values()];
		const triedPeers: ReadonlyArray<PeerInfo> = [...this._triedPeers.values()];

		return {
			newPeers,
			triedPeers,
			connectedPeers: this._peerPool.getAllPeerInfos(),
		};
	}

	public async request<T>(
		packet: P2PRequestPacket<T>,
	): Promise<P2PResponsePacket> {
		const peerSelectionParams: PeerOptions = {
			lastBlockHeight: this._nodeInfo.height,
		};
		const selectedPeer = this._peerPool.selectPeers(peerSelectionParams, 1);

		if (selectedPeer.length <= 0) {
			throw new RequestFailError(
				'Request failed due to no peers found in peer selection',
			);
		}
		const response: P2PResponsePacket = await selectedPeer[0].request(packet);

		return response;
	}

	public send<T>(message: P2PMessagePacket<T>): void {
		const peerSelectionParams: PeerOptions = {
			lastBlockHeight: this._nodeInfo.height,
		};
		const selectedPeers = this._peerPool.selectPeers(peerSelectionParams);

		selectedPeers.forEach((peer: Peer) => {
			peer.send(message);
		});
	}

	private async _startPeerServer(): Promise<void> {
		this._scServer.on(
			'connection',
			(socket: SCServerSocket): void => {
				if (!socket.request.url) {
					super.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER);

					return;
				}
				const queryObject = querystring.parse(socket.request.url);
				if (
					typeof queryObject.wsPort !== 'string' ||
					typeof queryObject.os !== 'string' ||
					typeof queryObject.version !== 'string'
				) {
					super.emit(EVENT_FAILED_TO_ADD_INBOUND_PEER);
				} else {
					const wsPort: number = parseInt(queryObject.wsPort, BASE_10_RADIX);
					const peerId = Peer.constructPeerId(socket.remoteAddress, wsPort);
					const existingPeer = this._peerPool.getPeer(peerId);
					if (existingPeer === undefined) {
						const peer = new Peer(
							{
								ipAddress: socket.remoteAddress,
								wsPort,
								height: queryObject.height ? +queryObject.height : 0,
								os: queryObject.os,
								version: queryObject.version,
							},
							socket,
						);
						peer.applyNodeInfo(this._nodeInfo);
						this._peerPool.addPeer(peer);
						super.emit(EVENT_NEW_INBOUND_PEER, peer);
						super.emit(EVENT_NEW_PEER, peer);
						this._newPeers.add(peer.peerInfo);
					} else if (
						existingPeer.state.inbound === ConnectionState.DISCONNECTED
					) {
						existingPeer.inboundSocket = socket;
						this._newPeers.add(existingPeer.peerInfo);
					}
				}
			},
		);
		this._httpServer.listen(this._config.wsPort);

		return new Promise<void>(resolve => {
			this._scServer.once('ready', () => {
				this._isActive = true;
				resolve();
			});
		});
	}

	private async _stopPeerServer(): Promise<void> {
		// TODO ASAP: Test this and check for potential failure scenarios.
		return new Promise<void>(resolve => {
			this._scServer.close(() => {
				this._isActive = false;
				resolve();
			});
		});
	}

	private _connectToPeers(): void {
		const availablePeers = Array.from(this._newPeers).map(
			(peerInfo: PeerInfo) => new Peer(peerInfo),
		);

		const peersToConnect = selectForConnection(availablePeers);
		peersToConnect.forEach(async (peer: Peer) => {
			await peer.connect();
			this._newPeers.delete(peer.peerInfo);
			this._triedPeers.add(peer.peerInfo);
		});
	}

	private async _runPeerDiscovery(
		peers: ReadonlyArray<PeerInfo>,
	): Promise<ReadonlyArray<PeerInfo>> {
		const peersObjectList = peers.map((peerInfo: PeerInfo) => {
			const peer = new Peer(peerInfo);
			if (!this._newPeers.has(peerInfo) && !this._triedPeers.has(peerInfo)) {
				this._newPeers.add(peerInfo);
				this._peerPool.addPeer(peer);
			}

			return peer;
		});
		const peersOfPeers = await discoverPeers(peersObjectList);

		return peersOfPeers;
	}

	public async start(): Promise<void> {
		await this._startPeerServer();
		const discoveredPeers = await this._runPeerDiscovery(
			this._config.seedPeers,
		);
		// Add all the discovered peers in newPeer list
		discoveredPeers.forEach((peerInfo: PeerInfo) => {
			this._newPeers.add(peerInfo);
		});

		this._connectToPeers();
	}

	public async stop(): Promise<void> {
		this._peerPool.disconnectAllPeers();
		await this._stopPeerServer();
	}
}
