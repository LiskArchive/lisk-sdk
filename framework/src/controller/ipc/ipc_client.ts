/*
 * Copyright © 2020 Lisk Foundation
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

// eslint-disable-next-line
/// <reference path="../../../external_types/pm2-axon/index.d.ts" />
// eslint-disable-next-line
/// <reference path="../../../external_types/pm2-axon-rpc/index.d.ts" />

import * as axon from 'pm2-axon';
import { PushSocket, ReqSocket, SubSocket } from 'pm2-axon';
import { Client as RPCClient } from 'pm2-axon-rpc';
import { IPCSocket } from './ipc_socket';

const CONNECTION_TIME_OUT = 2000;

export class IPCClient extends IPCSocket {
	public rpcClient!: RPCClient;
	protected readonly _actionRPCConnectingServerSocketPath: string;

	public constructor(options: { socketsDir: string; name: string; rpcServerSocketPath: string }) {
		super(options);

		this._actionRPCConnectingServerSocketPath = options.rpcServerSocketPath;

		this.pubSocket = axon.socket('push', {}) as PushSocket;
		this.subSocket = axon.socket('sub', {}) as SubSocket;
		this.rpcClient = new RPCClient(axon.socket('req') as ReqSocket);
	}

	public async start(): Promise<void> {
		await super.start();

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this.pubSocket.on('connect', () => {
				clearTimeout(timeout);
				resolve();
			});
			this.pubSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is observing clients will publish
			this.pubSocket.connect(this._eventSubSocketPath);
		}).finally(() => {
			this.pubSocket.removeAllListeners('connect');
			this.pubSocket.removeAllListeners('error');
		});

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this.subSocket.on('connect', () => {
				clearTimeout(timeout);
				resolve();
			});
			this.subSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this.subSocket.connect(this._eventPubSocketPath);
		}).finally(() => {
			this.subSocket.removeAllListeners('connect');
			this.subSocket.removeAllListeners('error');
		});

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this.rpcClient.sock.on('connect', () => {
				clearTimeout(timeout);
				resolve();
			});
			this.rpcClient.sock.on('error', reject);

			this.rpcClient.sock.connect(this._actionRPCConnectingServerSocketPath);
		}).finally(() => {
			this.rpcClient.sock.removeAllListeners('connect');
			this.rpcClient.sock.removeAllListeners('error');
		});
	}

	public stop(): void {
		super.stop();
		this.rpcClient.sock.close();
	}
}
