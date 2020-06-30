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

import * as axon from 'pm2-axon';
import { PubSocket, PullSocket } from 'pm2-axon';
import { IPCSocket } from './ipc_socket';

export class IPCSocketServer extends IPCSocket {
	public constructor(options: { socketsDir: string }) {
		super(options);

		this._pubSocket = axon.socket('pub', {}) as PubSocket;
		this._subSocket = axon.socket('pull', {}) as PullSocket;
	}

	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._pubSocket.on('bind', resolve);
			this._pubSocket.on('error', reject);

			this._pubSocket.bind(this._eventPubSocketPath);
		}).finally(() => {
			this._pubSocket.removeAllListeners('bind');
			this._pubSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this._subSocket.on('bind', resolve);
			this._subSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this._subSocket.bind(this._eventSubSocketPath);
		}).finally(() => {
			this._subSocket.removeAllListeners('bind');
			this._subSocket.removeAllListeners('error');
		});

		this._subSocket.on('message', (eventName: string, eventValue: object) => {
			this._pubSocket.send(eventName, eventValue);
		});
	}
}
