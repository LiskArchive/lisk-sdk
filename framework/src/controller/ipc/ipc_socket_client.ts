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
/// <reference path="../../external_types/pm2-axon/index.d.ts" />
// eslint-disable-next-line
/// <reference path="../../external_types/pm2-axon-rpc/index.d.ts" />

import { join } from 'path';
import * as axon from 'pm2-axon';
import { PushSocket, PullSocket } from 'pm2-axon';
import { EventEmitter2, Listener } from 'eventemitter2';

const CONNECTION_TIME_OUT = 2000;

export class IPCSocketClient {
	public name?: string;

	protected _eventPushSocketPath: string;
	protected _eventPullSocketPath: string;
	protected _pushSocket: PushSocket;
	protected _pullSocket: PullSocket;
	protected _emitter: EventEmitter2;

	public constructor(options: {
		socketDir: string;
		initForBus?: boolean;
		name?: string;
	}) {
		this.name = options.name;
		this._eventPushSocketPath = `unix://${join(
			options.socketDir,
			'push_socket.sock',
		)}`;
		this._eventPullSocketPath = `unix://${join(
			options.socketDir,
			'pull_socket.sock',
		)}`;

		this._pushSocket = axon.socket('push', {}) as PushSocket;
		this._pullSocket = axon.socket('pull', {}) as PullSocket;

		this._emitter = new EventEmitter2({
			// set this to `true` to use wildcards
			wildcard: true,

			// the delimiter used to segment namespaces
			delimiter: ':',

			// the maximum amount of listeners that can be assigned to an event
			maxListeners: 10,

			// show event name in memory leak message when more than maximum amount of listeners is assigned
			verboseMemoryLeak: true,
		});
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._pushSocket.on('connect', resolve);
			this._pushSocket.on('error', reject);
			setTimeout(() => {
				reject(
					new Error(
						'IPC Socket client connection timeout. Please check if IPC server is running.',
					),
				);
			}, CONNECTION_TIME_OUT);

			// We switched the path here to establish communication
			// The socket on which server is observing clients will publish
			this._pushSocket.connect(this._eventPullSocketPath);
		}).finally(() => {
			this._pushSocket.removeAllListeners('connect');
			this._pushSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this._pullSocket.on('connect', resolve);
			this._pullSocket.on('error', reject);
			setTimeout(() => {
				reject(
					new Error(
						'IPC Socket client connection timeout. Please check if IPC server is running.',
					),
				);
			}, CONNECTION_TIME_OUT);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this._pullSocket.connect(this._eventPushSocketPath);
		}).finally(() => {
			this._pullSocket.removeAllListeners('connect');
			this._pullSocket.removeAllListeners('error');
		});

		this._listenToMessages();
	}

	public close(): void {
		this._pullSocket.removeAllListeners('message');
		this._pushSocket.close();
		this._pullSocket.close();
	}

	public emit(eventName: string, eventValue: object): void {
		this._pushSocket.send(eventName, eventValue);
	}

	public on(eventName: string, cb: Listener): void {
		this._emitter.on(eventName, cb);
	}

	public once(eventName: string, cb: Listener): void {
		this._emitter.once(eventName, cb);
	}

	protected _listenToMessages(): void {
		this._pullSocket.on('message', (eventName: string, eventValue: object) => {
			this._emitter.emit(eventName, eventValue);
		});
	}
}
