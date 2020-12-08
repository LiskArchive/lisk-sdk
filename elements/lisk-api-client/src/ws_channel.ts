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
import { JSONRPCMessage, JSONRPCNotification, EventCallback } from './types';
import { convertRPCError } from './utils';

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
		// this._ws.onclose = this._handleClose.bind(this);
		this._ws.onmessage = this._handleMessage.bind(this);
		this._ws.addEventListener('ping', this._handlePing.bind(this));

		const connectHandler = new Promise<void>(resolve => {
			const onOpen = () => {
				this.isAlive = true;
				this._ws?.removeEventListener('open', onOpen);
				resolve();
			};

			this._ws?.addEventListener('open', onOpen);
		});

		const errorHandler = new Promise<void>((_, reject) => {
			const onError = (error: WebSocket.ErrorEvent) => {
				this.isAlive = false;
				this._ws?.removeEventListener('error', onError);
				reject(error.error);
			};

			this._ws?.addEventListener('error', onError);
		});

		try {
			await Promise.race([
				connectHandler,
				errorHandler,
				timeout(CONNECTION_TIMEOUT, `Could not connect in ${CONNECTION_TIMEOUT}ms`),
			]);
		} catch (err) {
			this._ws.close();

			throw err;
		}
	}

	public async disconnect(): Promise<void> {
		this._requestCounter = 0;
		this._pendingRequests = {};

		if (!this._ws) {
			return;
		}

		if (this._ws.readyState === WebSocket.CLOSED) {
			this.isAlive = false;
			this._ws = undefined;
			return;
		}

		const closeHandler = new Promise<void>(resolve => {
			const onClose = () => {
				this.isAlive = false;
				this._ws?.removeEventListener('close', onClose);
				resolve();
			};

			this._ws?.addEventListener('close', onClose);
		});

		this._ws.close();
		await Promise.race([
			closeHandler,
			timeout(CONNECTION_TIMEOUT, `Could not disconnect in ${CONNECTION_TIMEOUT}ms`),
		]);
	}

	public async invoke<T = Record<string, unknown>>(
		actionName: string,
		params?: Record<string, unknown>,
	): Promise<T> {
		const request = {
			jsonrpc: '2.0',
			id: this._requestCounter,
			method: actionName,
			params: params ?? {},
		};

		const send = new Promise(resolve => {
			this._ws?.send(JSON.stringify(request));
			resolve();
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

	public subscribe<T = Record<string, unknown>>(eventName: string, cb: EventCallback<T>): void {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._emitter.on(eventName, cb);
	}

	// private _handleClose(): void {
	// 	this.isAlive = false;
	// }

	private _handlePing(): void {
		this.isAlive = true;
	}

	private _handleMessage(event: WebSocket.MessageEvent): void {
		const res = JSON.parse(event.data as string) as JSONRPCMessage<unknown>;

		// Its an event
		if (messageIsNotification(res)) {
			this._emitter.emit(res.method, res.params);

			// Its a response for a request
		} else {
			const id = typeof res.id === 'number' ? res.id : parseInt(res.id as string, 10);

			if (this._pendingRequests[id]) {
				if (res.error) {
					this._pendingRequests[id].reject(convertRPCError(res.error));
				} else {
					this._pendingRequests[id].resolve(res.result);
				}

				delete this._pendingRequests[id];
			}
		}
	}
}
