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

import { mkdirSync } from 'fs';
import * as path from 'path';
import { Publisher, Subscriber, Router, Dealer } from 'zeromq';

const getSocketsPath = (dataPath: string) => {
	const socketDir = path.join(dataPath, 'tmp', 'sockets');
	return {
		pub: `ipc://${socketDir}/external.pub.ipc`,
		sub: `ipc://${socketDir}/external.sub.ipc`,
		rpc: `ipc://${socketDir}/bus.external.rpc.ipc`,
	};
};

export class IPCServer {
	public rpcServer: Router;
	public rpcClient!: Dealer;
	public pubSocket!: Publisher;
	public subSocket!: Subscriber;
	public eventPubSocketPath: string;
	public eventSubSocketPath: string;
	public rpcServerSocketPath: string;

	public constructor(dataPath: string) {
		const socketsDir = getSocketsPath(dataPath);

		mkdirSync(path.join(dataPath, 'tmp', 'sockets'), { recursive: true });
		this.eventPubSocketPath = socketsDir.pub;
		this.eventSubSocketPath = socketsDir.sub;
		this.rpcServerSocketPath = socketsDir.rpc;

		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
		this.rpcServer = new Router();
	}

	public async start(): Promise<void> {
		try {
			await this.rpcServer.bind(this.rpcServerSocketPath);
			await this.pubSocket.bind(this.eventPubSocketPath);
			await this.subSocket.bind(this.eventSubSocketPath);
			// Subscribe to all the events
			this.subSocket.subscribe();
		} catch (error) {
			this.rpcServer.close();
			this.pubSocket.close();
			this.subSocket.close();
			throw error;
		}
	}

	public stop(): void {
		this.pubSocket.close();
		this.subSocket.close();
		this.rpcServer.close();
	}
}
