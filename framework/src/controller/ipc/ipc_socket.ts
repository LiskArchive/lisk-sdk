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

import { PubSocket, PullSocket, PushSocket, SubSocket } from 'pm2-axon';
import { EventEmitter2 } from 'eventemitter2';
import { join } from 'path';

export abstract class IPCSocket {
	protected readonly _eventPubSocketPath: string;
	protected readonly _eventSubSocketPath: string;
	protected readonly _emitter: EventEmitter2;

	protected _pubSocket!: PushSocket | PubSocket;
	protected _subSocket!: PullSocket | SubSocket;

	protected constructor(options: { socketsDir: string }) {
		this._eventPubSocketPath = `unix://${join(
			options.socketsDir,
			'push_socket.sock',
		)}`;
		this._eventSubSocketPath = `unix://${join(
			options.socketsDir,
			'pull_socket.sock',
		)}`;

		this._emitter = new EventEmitter2({
			// set this to `true` to use wildcards
			wildcard: true,

			// the delimiter used to segment namespaces
			delimiter: ':',

			// the maximum amount of listeners that can be assigned to an event
			maxListeners: 10,

			// show event name in memory leak message when more than maximum amount of listeners is assigned
			verboseMemoryLeak: true,
		});
	}

	public stop(): void {
		this._subSocket.removeAllListeners('message');
		this._pubSocket.close();
		this._subSocket.close();
	}

	public emit(eventName: string, eventValue: object): void {
		this._pubSocket.send(eventName, eventValue);
	}

	public abstract start(): Promise<void>;
}
