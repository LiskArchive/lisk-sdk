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

import { Publisher, Subscriber } from 'zeromq';
import { IPCSocket } from './ipc_socket';

export class IPCServer extends IPCSocket {
	public constructor(options: { socketsDir: string; name: string }) {
		super(options);

		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
	}

	public async start(): Promise<void> {
		await super.start();
		try {
			await this.pubSocket.bind(this._eventPubSocketPath);
			await this.subSocket.bind(this._eventSubSocketPath);
			// Subscribe to all the events
			this.subSocket.subscribe();
		} catch (error) {
			this.pubSocket.close();
			this.subSocket.close();
			throw error;
		}
	}
}
