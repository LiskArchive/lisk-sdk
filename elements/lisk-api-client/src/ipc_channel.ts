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

import * as path from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';
import { Subscriber, Dealer } from 'zeromq';
import { Channel, EventCallback, Defer, JSONRPCMessage, JSONRPCResponse } from './types';
import { convertRPCError, defer, promiseWithTimeout } from './utils';

const CONNECTION_TIME_OUT = 2000;
const RESPONSE_TIMEOUT = 3000;

const getSocketsPath = (dataPath: string) => {
	const socketDir = path.join(path.resolve(dataPath.replace('~', homedir())), 'tmp', 'sockets');
	return {
		pub: `ipc://${socketDir}/external.pub.ipc`,
		sub: `ipc://${socketDir}/external.sub.ipc`,
		rpc: `ipc://${socketDir}/engine.external.rpc.ipc`,
	};
};

export class IPCChannel implements Channel {
	public isAlive = false;

	private readonly _events: EventEmitter;
	private readonly _subSocket: Subscriber;
	private readonly _rpcClient: Dealer;

	private readonly _eventPubSocketPath: string;
	private readonly _rpcServerSocketPath: string;
	private _id: number;
	private _pendingRequests: {
		[key: number]: Defer<unknown>;
	} = {};

	public constructor(dataPath: string) {
		const socketsDir = getSocketsPath(dataPath);

		this._eventPubSocketPath = socketsDir.pub;
		this._rpcServerSocketPath = socketsDir.rpc;

		this._subSocket = new Subscriber();
		this._rpcClient = new Dealer();
		this._events = new EventEmitter();
		this._id = 0;
	}

	public async connect(): Promise<void> {
		try {
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'IPC Socket client connection timeout. Please check if IPC server is running.',
						),
					);
				}, CONNECTION_TIME_OUT);
				this._subSocket.events.on('connect', () => {
					clearTimeout(timeout);
					resolve();
				});
				this._subSocket.events.on('bind:error', reject);
				this._subSocket.connect(this._eventPubSocketPath);
			});

			await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'IPC Socket client connection timeout. Please check if IPC server is running.',
						),
					);
				}, CONNECTION_TIME_OUT);
				this._rpcClient.events.on('connect', () => {
					clearTimeout(timeout);
					resolve(undefined);
				});
				this._rpcClient.events.on('bind:error', reject);

				this._rpcClient.connect(this._rpcServerSocketPath);
			});
			this.isAlive = true;
		} catch (error) {
			this._subSocket.close();
			this._rpcClient.close();
			throw error;
		}
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		this._listenToRPCResponse().catch(() => {});
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		this._listenToEvents().catch(() => {});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async disconnect(): Promise<void> {
		this._subSocket.close();
		this._rpcClient.close();
		this.isAlive = false;
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
		await this._rpcClient.send([JSON.stringify(action)]);
		const response = defer<T>();
		this._pendingRequests[action.id] = response as Defer<unknown>;

		return promiseWithTimeout(
			[response.promise],
			RESPONSE_TIMEOUT,
			`Response not received in ${RESPONSE_TIMEOUT}ms`,
		);
	}

	public subscribe<T = Record<string, unknown>>(eventName: string, cb: EventCallback<T>): void {
		this._subSocket.subscribe(eventName);
		this._events.on(eventName, cb as never);
	}

	public unsubscribe<T = Record<string, unknown>>(eventName: string, cb: EventCallback<T>): void {
		this._subSocket.unsubscribe(eventName);
		this._events.off(eventName, cb as never);
	}

	private async _listenToRPCResponse() {
		for await (const [eventData] of this._rpcClient) {
			const res = JSON.parse(eventData.toString()) as JSONRPCResponse<unknown>;
			const id = typeof res.id === 'number' ? res.id : parseInt(res.id, 10);
			if (this._pendingRequests[id]) {
				if (res.error) {
					this._pendingRequests[id].reject(convertRPCError(res.error));
				} else {
					this._pendingRequests[id].resolve(res.result);
				}
				delete this._pendingRequests[id];
			}
		}
	}

	private async _listenToEvents() {
		this._subSocket.subscribe('invoke');
		for await (const [_event, eventData] of this._subSocket) {
			const res = JSON.parse(eventData.toString()) as JSONRPCMessage<unknown>;
			this._events.emit(res.method, res.params);
		}
	}
}
