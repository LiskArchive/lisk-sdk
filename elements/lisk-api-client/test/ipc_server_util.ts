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
/// <reference path="../external_types/pm2-axon/index.d.ts" />
// eslint-disable-next-line
/// <reference path="../external_types/pm2-axon-rpc/index.d.ts" />

import { mkdirSync } from 'fs';
import * as path from 'path';
import * as axon from 'pm2-axon';
import { PushSocket, PubSocket, PullSocket, SubSocket, RepSocket } from 'pm2-axon';
import { Server as RPCServer, Client as RPCClient } from 'pm2-axon-rpc';

const getSocketsPath = (dataPath: string) => {
	const socketDir = path.join(dataPath, 'tmp', 'sockets');
	return {
		root: `unix://${socketDir}`,
		pub: `unix://${socketDir}/pub_socket.sock`,
		sub: `unix://${socketDir}/sub_socket.sock`,
		rpc: `unix://${socketDir}/bus_rpc_socket.sock`,
	};
};

export class IPCServer {
	public rpcServer: RPCServer;
	public rpcClient!: RPCClient;
	public pubSocket!: PushSocket | PubSocket;
	public subSocket!: PullSocket | SubSocket;
	public eventPubSocketPath: string;
	public eventSubSocketPath: string;
	public rpcServerSocketPath: string;

	public constructor(dataPath: string) {
		const socketsDir = getSocketsPath(dataPath);

		mkdirSync(path.join(dataPath, 'tmp', 'sockets'), { recursive: true });
		this.eventPubSocketPath = path.join(socketsDir.root, 'pub_socket.sock');
		this.eventSubSocketPath = path.join(socketsDir.root, 'sub_socket.sock');
		this.rpcServerSocketPath = path.join(socketsDir.root, 'bus_rpc_socket.sock');

		this.pubSocket = axon.socket('pub', {}) as PubSocket;
		this.subSocket = axon.socket('pull', {}) as PullSocket;
		this.rpcServer = new RPCServer(axon.socket('rep') as RepSocket);
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this.pubSocket.on('bind', resolve);
			this.pubSocket.on('error', reject);

			this.pubSocket.bind(this.eventPubSocketPath);
		}).finally(() => {
			this.pubSocket.removeAllListeners('bind');
			this.pubSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this.subSocket.on('bind', resolve);
			this.subSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this.subSocket.bind(this.eventSubSocketPath);
		}).finally(() => {
			this.subSocket.removeAllListeners('bind');
			this.subSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this.rpcServer.sock.on('bind', resolve);
			this.rpcServer.sock.on('error', reject);
			this.rpcServer.sock.bind(this.rpcServerSocketPath);
		}).finally(() => {
			this.rpcServer.sock.removeAllListeners('bind');
			this.rpcServer.sock.removeAllListeners('error');
		});
	}

	public stop(): void {
		this.subSocket.removeAllListeners();
		this.pubSocket.close();
		this.subSocket.close();
		this.rpcServer.sock.close();
	}

	public publish(eventName: string, data?: Record<string, unknown>): void {
		const [moduleName, funcName] = eventName.split(':');
		const event = {
			module: moduleName,
			name: funcName,
			data: data ?? {},
		};
		this.pubSocket.send(eventName, event);
	}
}
