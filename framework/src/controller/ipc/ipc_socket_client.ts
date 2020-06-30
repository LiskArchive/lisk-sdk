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

import { Listener } from 'eventemitter2';
import * as axon from 'pm2-axon';
import { PushSocket, SubSocket } from 'pm2-axon';
import { IPCSocket } from './ipc_socket';

const CONNECTION_TIME_OUT = 2000;

export class IPCSocketClient extends IPCSocket {
	public constructor(options: { socketsDir: string }) {
		super(options);

		this._pubSocket = axon.socket('push', {}) as PushSocket;
		this._subSocket = axon.socket('sub', {}) as SubSocket;
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._pubSocket.on('connect', resolve);
			this._pubSocket.on('error', reject);
			setTimeout(() => {
				reject(
					new Error(
						'IPC Socket client connection timeout. Please check if IPC server is running.',
					),
				);
			}, CONNECTION_TIME_OUT);

			// We switched the path here to establish communication
			// The socket on which server is observing clients will publish
			this._pubSocket.connect(this._eventSubSocketPath);
		}).finally(() => {
			this._pubSocket.removeAllListeners('connect');
			this._pubSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this._subSocket.on('connect', resolve);
			this._subSocket.on('error', reject);
			setTimeout(() => {
				reject(
					new Error(
						'IPC Socket client connection timeout. Please check if IPC server is running.',
					),
				);
			}, CONNECTION_TIME_OUT);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this._subSocket.connect(this._eventPubSocketPath);
		}).finally(() => {
			this._subSocket.removeAllListeners('connect');
			this._subSocket.removeAllListeners('error');
		});

		this._subSocket.on('message', (eventName: string, eventValue: object) => {
			this._emitter.emit(eventName, eventValue);
		});
	}

	public on(eventName: string, cb: Listener): void {
		this._emitter.on(eventName, cb);
	}

	public once(eventName: string, cb: Listener): void {
		this._emitter.once(eventName, cb);
	}
}
