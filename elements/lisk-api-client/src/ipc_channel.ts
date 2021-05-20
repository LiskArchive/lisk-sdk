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
 *
 */

// eslint-disable-next-line
/// <reference path="../external_types/pm2-axon/index.d.ts" />
// eslint-disable-next-line
/// <reference path="../external_types/pm2-axon-rpc/index.d.ts" />
import * as path from 'path';
import * as axon from 'pm2-axon';
import { homedir } from 'os';
import { PubSocket, PullSocket, PushSocket, SubSocket, ReqSocket } from 'pm2-axon';
import { Client as RPCClient } from 'pm2-axon-rpc';
import { EventEmitter } from 'events';
import {
	Channel,
	EventCallback,
	JSONRPCNotification,
	JSONRPCResponse,
	JSONRPCError,
} from './types';
import { convertRPCError } from './utils';

const CONNECTION_TIME_OUT = 2000;

const getSocketsPath = (dataPath: string) => {
	const socketDir = path.join(path.resolve(dataPath.replace('~', homedir())), 'tmp', 'sockets');
	return {
		root: `unix://${socketDir}`,
		pub: `unix://${socketDir}/pub_socket.sock`,
		sub: `unix://${socketDir}/sub_socket.sock`,
		rpc: `unix://${socketDir}/bus_rpc_socket.sock`,
	};
};

export class IPCChannel implements Channel {
	private readonly _events: EventEmitter;
	private readonly _rpcClient!: RPCClient;
	private readonly _pubSocket!: PushSocket | PubSocket;
	private readonly _subSocket!: PullSocket | SubSocket;

	private readonly _eventPubSocketPath: string;
	private readonly _eventSubSocketPath: string;
	private readonly _rpcServerSocketPath: string;
	private _id: number;

	public constructor(dataPath: string) {
		const socketsDir = getSocketsPath(dataPath);

		this._eventPubSocketPath = socketsDir.pub;
		this._eventSubSocketPath = socketsDir.sub;
		this._rpcServerSocketPath = socketsDir.rpc;

		this._pubSocket = axon.socket('push', {}) as PushSocket;
		this._subSocket = axon.socket('sub', {}) as SubSocket;
		this._rpcClient = new RPCClient(axon.socket('req') as ReqSocket);
		this._events = new EventEmitter();
		this._id = 0;
	}

	public async connect(): Promise<void> {
		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this._pubSocket.on('connect', () => {
				clearTimeout(timeout);
				resolve(undefined);
			});
			this._pubSocket.on('error', reject);
			this._pubSocket.connect(this._eventSubSocketPath);
		}).finally(() => {
			this._pubSocket.removeAllListeners('connect');
			this._pubSocket.removeAllListeners('error');
		});

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this._subSocket.on('connect', () => {
				clearTimeout(timeout);
				resolve();
			});
			this._subSocket.on('error', reject);
			this._subSocket.connect(this._eventPubSocketPath);
		}).finally(() => {
			this._subSocket.removeAllListeners('connect');
			this._subSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(
					new Error('IPC Socket client connection timeout. Please check if IPC server is running.'),
				);
			}, CONNECTION_TIME_OUT);
			this._rpcClient.sock.on('connect', () => {
				clearTimeout(timeout);
				resolve(undefined);
			});
			this._rpcClient.sock.on('error', reject);

			this._rpcClient.sock.connect(this._rpcServerSocketPath);
		}).finally(() => {
			this._rpcClient.sock.removeAllListeners('connect');
			this._rpcClient.sock.removeAllListeners('error');
		});

		this._subSocket.on('message', (eventData: JSONRPCNotification<unknown>) => {
			this._events.emit(eventData.method, eventData.params);
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async disconnect(): Promise<void> {
		this._subSocket.removeAllListeners();
		this._pubSocket.close();
		this._subSocket.close();
		this._rpcClient.sock.close();
	}

	public async invoke<T = Record<string, unknown>>(
		actionName: string,
		params?: Record<string, unknown>,
	): Promise<T> {
		this._id += 1;
		const action = {
			id: this._id,
			jsonrpc: '2.0',
			method: actionName,
			params: params ?? {},
		};
		return new Promise<T>((resolve, reject) => {
			this._rpcClient.call(
				'invoke',
				action,
				(err: JSONRPCError | undefined, data: JSONRPCResponse<T>) => {
					if (err) {
						reject(convertRPCError(err));
						return;
					}
					if (data.error) {
						reject(convertRPCError(data.error));
						return;
					}
					resolve(data.result as T);
				},
			);
		});
	}

	public subscribe<T = Record<string, unknown>>(eventName: string, cb: EventCallback<T>): void {
		this._events.on(eventName, cb as never);
	}
}
