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

export class IPCServer extends IPCSocket {
	public constructor(options: { socketsDir: string; name: string }) {
		super(options);

		this.pubSocket = axon.socket('pub', {}) as PubSocket;
		this.subSocket = axon.socket('pull', {}) as PullSocket;
	}

	public async start(): Promise<void> {
		await super.start();

		await new Promise((resolve, reject) => {
			this.pubSocket.on('bind', resolve);
			this.pubSocket.on('error', reject);

			this.pubSocket.bind(this._eventPubSocketPath);
		}).finally(() => {
			this.pubSocket.removeAllListeners('bind');
			this.pubSocket.removeAllListeners('error');
		});

		await new Promise((resolve, reject) => {
			this.subSocket.on('bind', resolve);
			this.subSocket.on('error', reject);

			// We switched the path here to establish communication
			// The socket on which server is publishing clients will observer
			this.subSocket.bind(this._eventSubSocketPath);
		}).finally(() => {
			this.subSocket.removeAllListeners('bind');
			this.subSocket.removeAllListeners('error');
		});
	}
}
