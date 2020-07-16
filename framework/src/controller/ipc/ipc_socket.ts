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
import { PubSocket, PullSocket, PushSocket, RepSocket, SubSocket } from 'pm2-axon';
import { join } from 'path';
import { Server as RPCServer } from 'pm2-axon-rpc';

export abstract class IPCSocket {
	public pubSocket!: PushSocket | PubSocket;
	public subSocket!: PullSocket | SubSocket;
	public rpcServer: RPCServer;

	protected readonly _eventPubSocketPath: string;
	protected readonly _eventSubSocketPath: string;
	protected readonly _actionRpcSeverSocketPath: string;

	protected constructor(options: { socketsDir: string; name: string }) {
		this._eventPubSocketPath = `unix://${join(options.socketsDir, 'pub_socket.sock')}`;
		this._eventSubSocketPath = `unix://${join(options.socketsDir, 'sub_socket.sock')}`;
		this._actionRpcSeverSocketPath = `unix://${join(
			options.socketsDir,
			`${options.name}_rpc_socket.sock`,
		)}`;

		this.rpcServer = new RPCServer(axon.socket('rep') as RepSocket);
	}

	public get rpcServerSocketPath(): string {
		return this._actionRpcSeverSocketPath;
	}

	public stop(): void {
		this.subSocket.removeAllListeners();
		this.pubSocket.close();
		this.subSocket.close();
		this.rpcServer.sock.close();
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this.rpcServer.sock.on('bind', resolve);
			this.rpcServer.sock.on('error', reject);

			this.rpcServer.sock.bind(this._actionRpcSeverSocketPath);
		}).finally(() => {
			this.rpcServer.sock.removeAllListeners('bind');
			this.rpcServer.sock.removeAllListeners('error');
		});
	}
}
