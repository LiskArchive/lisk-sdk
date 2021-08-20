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

import { Dealer, Publisher, Subscriber } from 'zeromq';
import { IPCSocket } from './ipc_socket';
import { IPC_CONNECTION_TIME_OUT } from '../constants';

interface clientSocketPaths {
	readonly pub: string;
	readonly sub: string;
	readonly rpcServer: string;
	readonly rpcClient: string;
}
export class IPCClient extends IPCSocket {
	protected readonly _clientRPCSocketPath: string;
	private readonly _rpcClient: Dealer;
	private readonly _socketPaths: clientSocketPaths;

	public constructor(options: { socketsDir: string; name: string; rpcServerSocketPath: string }) {
		super(options);

		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
		this._clientRPCSocketPath = options.rpcServerSocketPath;
		this._socketPaths = {
			pub: this._eventSubSocketPath,
			sub: this._eventPubSocketPath,
			rpcServer: this._rpcSeverSocketPath,
			rpcClient: this._clientRPCSocketPath,
		};
		this._rpcClient = new Dealer();
	}

	public get rpcClient(): Dealer {
		return this._rpcClient;
	}

	public get socketPaths(): clientSocketPaths {
		return this._socketPaths;
	}

	public async start(): Promise<void> {
		await super.start();

		try {
			this.pubSocket.connectTimeout = IPC_CONNECTION_TIME_OUT;
			this.subSocket.connectTimeout = IPC_CONNECTION_TIME_OUT;
			// Connect to sub socket of the server to publish
			this.pubSocket.connect(this._eventSubSocketPath);
			// Connect to pub socket of the server to receive subscribed events
			this.subSocket.connect(this._eventPubSocketPath);
			/* Wait briefly before publishing to avoid slow joiner syndrome,
			   where the subscriber loses messages as it connects to the server’s socket */
			await new Promise(resolve => setTimeout(resolve, 25));
			this.rpcClient.connect(this._clientRPCSocketPath);
		} catch (error) {
			this.pubSocket.close();
			this.subSocket.close();
			this.rpcClient.close();
			throw error;
		}
	}
}
