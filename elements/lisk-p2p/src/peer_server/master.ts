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
import { EventEmitter } from 'events';
import * as SocketCluster from 'socketcluster';

import { Worker, isMainThread } from 'worker_threads';

import { REQUEST_SOCKET_CONNECTION } from '../constants';
import { REMOTE_SC_EVENT_RPC_REQUEST } from '../events';
import {
	NodeConfig,
	ProcessCallback,
	ProcessMessage,
	SocketInfo,
	WorkerMessage,
	PeerServerConfig,
	P2PNodeInfo,
	P2PCheckPeerCompatibility,
	WorkerPeerServerConfig,
} from '../types';

import { InboundSocket } from './inbound_socket';
import { PeerBook } from '../peer_book';

const relativePath =
	process.env.NODE_ENV === 'test' ? '/../../dist-node/peer_server/' : '';

// tslint:disable-next-line: prefer-template
const workerPath = __dirname + `${relativePath}/worker.js`;

export class MasterPeerServer extends EventEmitter {
	private readonly _nodeInfo: P2PNodeInfo;
	private readonly _hostIp: string;
	private readonly _secret: number;
	private readonly _maxPeerInfoSize: number;
	private readonly _peerBook: PeerBook;
	private readonly _peerHandshakeCheck: P2PCheckPeerCompatibility;
	private _socketMap: Map<string, InboundSocket>;
	protected _workerPeerServer?: Worker;

	public constructor(config: PeerServerConfig) {
		super();
		this._nodeInfo = config.nodeInfo;
		this._hostIp = config.hostIp;
		this._secret = config.secret;
		this._peerBook = config.peerBook;
		this._peerHandshakeCheck = config.peerHandshakeCheck;
		this._maxPeerInfoSize = config.maxPeerInfoSize;
		// MasterServer
		this._socketMap = new Map();

		/*
		this._server.on(
			'workerMessage' as any,
			((workerId: number, req: WorkerMessage, callback: ProcessCallback) => {
				if (req.type === REQUEST_NODE_CONFIG) {
					callback(undefined, this._nodeConfig);

					return;
				}
				if (req.type === REQUEST_SOCKET_CONNECTION) {
					const socket = new InboundSocket(
						this,
						workerId,
						req.data as SocketInfo,
					);
					this._socketMap.set(req.id, socket);
					this.emit('connection', socket);

					return;
				}
				// Find a related socket and emit event
				const existingSocket = this._socketMap.get(req.id);
				console.log('message', { workerId, req });
				existingSocket?.emitFromWorker(
					req.type,
					req.data,
					req.type === REMOTE_SC_EVENT_RPC_REQUEST ? callback : undefined,
				);
			}) as any,
		);
		*/
	}

	private _createWorkerData(): WorkerPeerServerConfig {
		return {
			nodeInfo: this._nodeInfo,
			hostIp: this._hostIp,
			secret: this._secret,
			maxPeerInfoSize: this._maxPeerInfoSize,
		};
	}

	public async start(): Promise<void> {
		this._workerPeerServer = new Worker(workerPath, {
			workerData: { config: this._createWorkerData() },
		});

		return new Promise(resolve => {
			this._workerPeerServer.destroy(resolve);
		});
	}

	public async close(): Promise<void> {
		return new Promise(resolve => {
			this._workerPeerServer.destroy(resolve);
		});
	}

	public disconnect(
		workerId: number,
		id: string,
		statusCode: number,
		reason: string,
	): void {
		this._socketMap.delete(id);
		this.sendToWorker(workerId, {
			type: 'disconnect',
			data: { id, statusCode, reason },
		});
	}

	public sendToWorker<T>(workerId: number, data: ProcessMessage<T>): void {
		this._sendToWorker<T>(workerId, data);
	}

	private _sendToWorker<T>(workerId: number, data: ProcessMessage<T>): void {
		this._workerPeerServer.sendToWorker(workerId, data);
	}
}
