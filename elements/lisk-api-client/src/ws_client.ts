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
 *
 */

import * as WebSocket from 'isomorphic-ws';

const CONNECTION_TIMEOUT = 2000;
const ACKNOWLEDGMENT_TIMEOUT = 2000;

const timeout = async (ms: number, message?: string): Promise<void> =>
	new Promise((_, reject) => {
		const id = setTimeout(() => {
			clearTimeout(id);
			reject(message ?? `Timed out in ${ms}ms.`);
		}, ms);
	});

export class WSClient {
	public isAlive = false;
	private readonly _url: string;
	private _ws?: WebSocket;

	public constructor(url: string) {
		this._url = url;
	}

	public async connect(): Promise<void> {
		this._ws = new WebSocket(this._url);

		const connect = new Promise<void>(resolve => {
			this._ws?.on('open', () => {
				this.isAlive = true;
				resolve();
			});
		});

		this._ws.on('ping', () => {
			this.isAlive = true;
		});

		return Promise.race([
			connect,
			timeout(CONNECTION_TIMEOUT, `Could not connect in ${CONNECTION_TIMEOUT}ms`),
		]);
	}

	public async disconnect(): Promise<void> {
		if (!this._ws) {
			return Promise.resolve();
		}

		return new Promise<void>(resolve => {
			this._ws?.on('close', () => {
				this.isAlive = false;
				this._ws = undefined;
				resolve();
			});
			this._ws?.close();
		});
	}

	// public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
	// }

	// public subscribe(eventName: string, cb: EventCallback): void {}
}
