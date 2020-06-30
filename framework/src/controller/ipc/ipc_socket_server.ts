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
			this._pubSocket.on('bind', resolve);
			this._pubSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is observing clients will publish
			this._pubSocket.bind(this._subSocketPath);
		}).finally(() => {
			this._pubSocket.removeAllListeners('bind');
			this._pubSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this._subSocket.on('bind', resolve);
			this._subSocket.on('error', reject);
			this._subSocket.on('socket error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this._subSocket.bind(this._pubSocketPath);
		}).finally(() => {
			this._subSocket.removeAllListeners('bind');
			this._subSocket.removeAllListeners('error');
		});
	}
}
