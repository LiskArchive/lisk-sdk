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
import { EventEmitter } from 'events';
import { EventInfoObject, JSONRPCMessage, JSONRPCNotification, EventCallback } from './types';

const CONNECTION_TIMEOUT = 2000;
const ACKNOWLEDGMENT_TIMEOUT = 2000;
const RESPONSE_TIMEOUT = 3000;

const timeout = async <T = void>(ms: number, message?: string): Promise<T> =>
	new Promise((_, reject) => {
		const id = setTimeout(() => {
			clearTimeout(id);
			reject(new Error(message ?? `Timed out in ${ms}ms.`));
		}, ms);
	});

interface Defer<T> {
	promise: Promise<T>;
	resolve: (result: T) => void;
	reject: (error?: Error) => void;
}

const defer = <T>(): Defer<T> => {
	let resolve!: (res: T) => void;
	let reject!: (error?: Error) => void;

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return { promise, resolve, reject };
};

const messageIsNotification = <T = unknown>(
	input: JSONRPCMessage<T>,
): input is JSONRPCNotification<T> =>
	!!((input.id === undefined || input.id === null) && input.method);

export class WSChannel {
	public isAlive = false;
	private readonly _url: string;
	private _ws?: WebSocket;
	private _requestCounter = 0;
	private _pendingRequests: {
		[key: number]: Defer<any>;
	} = {};
	private readonly _emitter: EventEmitter;

	public constructor(url: string) {
		this._url = url;
		this._emitter = new EventEmitter();
	}

	public async connect(): Promise<void> {
		this._ws = new WebSocket(this._url);

		const connect = new Promise<void>(resolve => {
			this._ws?.on('open', () => {
				this.isAlive = true;
				resolve();
			});
		});

		const error = new Promise<void>((_, reject) => {
			this._ws?.on('error', err => {
				this.isAlive = false;
				reject(err);
			});
		});

		await Promise.race([
			connect,
			error,
			timeout(CONNECTION_TIMEOUT, `Could not connect in ${CONNECTION_TIMEOUT}ms`),
		]);

		this._ws.on('ping', () => {
			this.isAlive = true;
		});

		this._ws.on('message', data => {
			this._handleMessage(data as string);
		});
	}

	public async disconnect(): Promise<void> {
		this._requestCounter = 0;
		this._pendingRequests = {};

		if (!this._ws) {
			return Promise.resolve();
		}

		return new Promise<void>(resolve => {
			this._ws?.on('close', () => {
				this._ws?.terminate();
				this.isAlive = false;
				this._ws = undefined;
				resolve();
			});
			this._ws?.close();
		});
	}

	public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
		const request = {
			jsonrpc: '2.0',
			id: this._requestCounter,
			method: actionName,
			params: params ?? {},
		};

		const send = new Promise((resolve, reject) => {
			this._ws?.send(JSON.stringify(request), (err): void => {
				if (err) {
					return reject(err);
				}

				return resolve();
			});
		});

		await Promise.race([
			send,
			timeout(ACKNOWLEDGMENT_TIMEOUT, `Request is not acknowledged in ${ACKNOWLEDGMENT_TIMEOUT}ms`),
		]);

		const response = defer<T>();
		this._pendingRequests[this._requestCounter] = response;
		this._requestCounter += 1;

		return Promise.race<T>([
			response.promise,
			timeout<T>(RESPONSE_TIMEOUT, `Response not received in ${RESPONSE_TIMEOUT}ms`),
		]);
	}

	public subscribe<T>(eventName: string, cb: EventCallback<T>): void {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._emitter.on(eventName, cb);
	}

	private _handleMessage(message: string): void {
		const res = JSON.parse(message) as JSONRPCMessage<unknown>;

		// Its an event
		if (messageIsNotification(res)) {
			this._emitter.emit(res.method, this._prepareEventInfo(res));

			// Its a response for a request
		} else {
			const id = typeof res.id === 'number' ? res.id : parseInt(res.id as string, 10);

			if (this._pendingRequests[id]) {
				if (res.error) {
					this._pendingRequests[id].reject(res.error);
				} else {
					this._pendingRequests[id].resolve(res.result);
				}

				delete this._pendingRequests[id];
			}
		}
	}

	// eslint-disable-next-line class-methods-use-this
	private _prepareEventInfo(res: JSONRPCNotification<unknown>): EventInfoObject<unknown> {
		const { method } = res;
		const [moduleName, ...eventName] = method.split(':');
		const module = moduleName;
		const name = eventName.join(':');
		const data = res.params ?? {};

		return { module, name, data };
	}
}
