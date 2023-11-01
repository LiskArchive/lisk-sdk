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
import { IPC_CONNECTION_TIMEOUT } from '../constants';

interface ClientSocketPaths {
	readonly pub: string;
	readonly sub: string;
	readonly rpcServer: string;
	readonly rpcClient: string;
}
export class IPCClient extends IPCSocket {
	public readonly socketPaths: ClientSocketPaths;
	protected readonly _clientRPCSocketPath: string;
	private _rpcClient?: Dealer;

	public constructor(options: { socketsDir: string; name: string; rpcServerSocketPath: string }) {
		super(options);
		this._clientRPCSocketPath = options.rpcServerSocketPath;
		this.socketPaths = {
			pub: this._eventSubSocketPath,
			sub: this._eventPubSocketPath,
			rpcServer: this._rpcSeverSocketPath,
			rpcClient: this._clientRPCSocketPath,
		};
	}

	public get rpcClient(): Dealer {
		if (!this._rpcClient) {
			throw new Error('RPC client has not been initialized.');
		}
		return this._rpcClient;
	}

	public async start(): Promise<void> {
		await super.start();
		this.pubSocket = new Publisher();
		this.subSocket = new Subscriber();
		this._rpcClient = new Dealer();
		try {
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'IPC Pub Socket client connection timeout. Please check if IPC server is running.',
						),
					);
				}, IPC_CONNECTION_TIMEOUT);

				this.pubSocket.events.on('bind:error', err => {
					reject(err);
				});
				this.pubSocket.events.on('connect', () => {
					clearTimeout(timeout);
					resolve();
				});

				this.pubSocket.connect(this._eventSubSocketPath);
			});
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'IPC Sub Socket client connection timeout. Please check if IPC server is running.',
						),
					);
				}, IPC_CONNECTION_TIMEOUT);

				this.subSocket.events.on('bind:error', err => {
					reject(err);
				});
				this.subSocket.events.on('connect', () => {
					clearTimeout(timeout);
					resolve();
				});
				this.subSocket.connect(this._eventPubSocketPath);
			});
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'IPC Sub Socket client connection timeout. Please check if IPC server is running.',
						),
					);
				}, IPC_CONNECTION_TIMEOUT);

				this.rpcClient.events.on('bind:error', err => {
					reject(err);
				});
				this.rpcClient.events.on('connect', () => {
					clearTimeout(timeout);
					resolve();
				});
				this.rpcClient.connect(this._clientRPCSocketPath);
			});
		} catch (error) {
			this.pubSocket.close();
			this.subSocket.close();
			this.rpcClient.close();
			throw error;
		}
	}
	public stop(): void {
		super.stop();
		this.rpcClient.close();
	}
}
