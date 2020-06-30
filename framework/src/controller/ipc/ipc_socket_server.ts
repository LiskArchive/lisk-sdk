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

// import { unlinkSync } from 'fs';
import { IPCSocketClient } from './ipc_socket_client';

export class IPCSocketServer extends IPCSocketClient {
	public async start(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._pushSocket.on('bind', resolve);
			this._pushSocket.on('error', reject);

			this._pushSocket.bind(this._eventPushSocketPath);
		}).finally(() => {
			this._pushSocket.removeAllListeners('bind');
			this._pushSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this._pullSocket.on('bind', resolve);
			this._pullSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this._pullSocket.bind(this._eventPullSocketPath);
		}).finally(() => {
			this._pullSocket.removeAllListeners('bind');
			this._pullSocket.removeAllListeners('error');
		});

		this._listenToMessages();
	}

	protected _listenToMessages(): void {
		this._pullSocket.on('message', (eventName: string, eventValue: object) => {
			this._pushSocket.send(eventName, eventValue);
			this._emitter.emit(eventName, eventValue);
		});
	}
}
