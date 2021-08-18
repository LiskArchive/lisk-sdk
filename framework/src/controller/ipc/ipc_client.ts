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

const CONNECTION_TIME_OUT = 2000;

export class IPCClient extends IPCSocket {

	public constructor(options: { socketsDir: string; name: string; }) {
		super(options);

		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
	}

	public async start(): Promise<void> {
		try {
			this.pubSocket.connectTimeout = CONNECTION_TIME_OUT;
			this.subSocket.connectTimeout = CONNECTION_TIME_OUT;
			// Connect to sub socket of the server to publish
			this.pubSocket.connect(this._eventSubSocketPath);
			// Connect to pub socket of the server to receive subscribed events
			this.subSocket.connect(this._eventPubSocketPath);
			/* Wait briefly before publishing to avoid slow joiner syndrome,
			   where the subscriber loses messages as it connects to the server’s socket */
			await new Promise(resolve => setTimeout(resolve, 25));
		} catch (error) {
			this.pubSocket.close();
			this.subSocket.close();
			throw error;
		}
	}
}
