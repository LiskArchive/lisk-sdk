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

import { join } from 'path';
import * as axon from 'pm2-axon';
import { PushSocket, PullSocket } from 'pm2-axon';

const CONNECTION_TIME_OUT = 2000;

export class IPCSocketClient {
	protected _pubSocketPath: string;
	protected _subSocketPath: string;
	protected _pubSocket: PushSocket;
	protected _subSocket: PullSocket;

	public constructor(options: { socketDir: string; initForBus?: boolean }) {
		this._pubSocketPath = `unix://${join(options.socketDir, 'event_pub.sock')}`;
		this._subSocketPath = `unix://${join(options.socketDir, 'event_sub.sock')}`;

		this._pubSocket = axon.socket('push', {}) as PushSocket;
		this._subSocket = axon.socket('pull', {}) as PullSocket;
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
			this._pubSocket.connect(this._pubSocketPath);
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
			this._subSocket.connect(this._subSocketPath);
		}).finally(() => {
			this._subSocket.removeAllListeners('connect');
			this._subSocket.removeAllListeners('error');
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async close(): Promise<void> {
		this._pubSocket.close();
		this._subSocket.close();
	}
}
