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

interface serverSocketPaths {
	readonly pub: string;
	readonly sub: string;
	readonly rpcServer: string;
}

export class IPCServer extends IPCSocket {
	private readonly _socketPaths: serverSocketPaths;

	public constructor(options: { socketsDir: string; name: string }) {
		super(options);

		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
		this._socketPaths = {
			pub: this._eventPubSocketPath,
			sub: this._eventSubSocketPath,
			rpcServer: this._rpcSeverSocketPath,
		};
	}

	public get socketPaths(): serverSocketPaths {
		return this._socketPaths;
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
	public stop(): void {
		super.stop();
	}
}
