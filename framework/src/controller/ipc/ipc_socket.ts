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

import { Publisher, Subscriber, Router } from 'zeromq';
import { join } from 'path';

export abstract class IPCSocket {
	public pubSocket!: Publisher;
	public subSocket!: Subscriber;

	protected readonly _eventPubSocketPath: string;
	protected readonly _eventSubSocketPath: string;
	protected readonly _rpcSeverSocketPath: string;
	private readonly _rpcServer: Router;

	protected constructor(options: { socketsDir: string; name: string; externalSocket?: boolean }) {
		const sockFileName = options.externalSocket ? 'external': 'internal';
		this._eventPubSocketPath = `ipc://${join(options.socketsDir, `${sockFileName}.pub.ipc`)}`;
		this._eventSubSocketPath = `ipc://${join(options.socketsDir, `${sockFileName}.sub.ipc`)}`;
		this._rpcSeverSocketPath = `ipc://${join(
			options.socketsDir,
			`${options.name}.${sockFileName}.rpc.ipc`,
		)}`;

		this._rpcServer = new Router();
	}

	public get rpcServer(): Router {
		return this._rpcServer;
	}

	public async start(): Promise<void> {
		await this.rpcServer.bind(this._rpcSeverSocketPath);
	}

	public stop(): void {
		this.pubSocket.close();
		this.subSocket.close();
		this.rpcServer.close();
	}
}
