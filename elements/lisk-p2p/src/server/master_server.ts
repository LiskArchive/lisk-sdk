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

import {
	NodeConfig,
	ProcessCallback,
	ProcessMessage,
	SocketInfo,
	WorkerMessage,
} from './type';
import { REQUEST_NODE_CONFIG, REQUEST_SOCKET_CONNECTION } from './constants';
import { ServerSocket } from './server_socket';
import { REMOTE_SC_EVENT_RPC_REQUEST } from '../events';

interface MasterConfig {
	readonly wsPort: number;
	readonly maxPayload: number;
	readonly workers: number;
	readonly path: string;
	// tslint:disable-next-line no-magic-numbers
	readonly logLevel: 0 | 1 | 2 | 3;
}

export class MasterServer extends EventEmitter {
	// private readonly _config: MasterConfig;
	private readonly _nodeConfig: NodeConfig;
	private readonly _server: SocketCluster;
	private _socketMap: Map<string, ServerSocket>;
	public isReady: boolean;

	public constructor(config: MasterConfig, nodeConfig: NodeConfig) {
		super();
		this._nodeConfig = nodeConfig;
		this._socketMap = new Map();
		this.isReady = false;

		this._server = new SocketCluster({
			workerController: `${__dirname}/worker`,
			maxPayload: config.maxPayload,
			host: '0.0.0.0',
			port: config.wsPort,
			workers: config.workers ?? 1,
			logLevel: config.logLevel ?? 0,
		});
		this._server.on('ready', () => {
			this.isReady = true;
			this.emit('ready');
		});
		this._server.on(
			'workerMessage' as any,
			((workerId: number, req: WorkerMessage, callback: ProcessCallback) => {
				if (req.type === REQUEST_NODE_CONFIG) {
					callback(undefined, this._nodeConfig);

					return;
				}
				if (req.type === REQUEST_SOCKET_CONNECTION) {
					const socket = new ServerSocket(
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
	}

	public async close(): Promise<void> {
		return new Promise(resolve => {
			this._server.destroy(resolve);
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
		this._server.sendToWorker(workerId, data);
	}
}
