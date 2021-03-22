/*
 * Copyright © 2019 Lisk Foundation
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
import { DEFAULT_MESSAGE_ENCODING_FORMAT } from './constants';
import { RPCResponseAlreadySentError } from './errors';
import { P2PResponsePacket, RequestOptions } from './types';

export class P2PRequest {
	private readonly _procedure: string;
	private readonly _data: Buffer | undefined;
	private readonly _respondCallback: (
		responseError?: Error,
		responseData?: P2PResponsePacket,
	) => void;
	private readonly _peerId: string;
	private _wasResponseSent: boolean;
	private readonly _rate: number;

	public constructor(
		options: RequestOptions,
		respondCallback: (responseError?: Error, responseData?: unknown) => void,
	) {
		this._procedure = options.procedure;
		this._data = this._getBufferData(options);
		this._peerId = options.id;
		this._rate = options.rate;
		// eslint-disable-next-line no-param-reassign
		options.productivity.requestCounter += 1;
		this._respondCallback = (responseError?: Error, responsePacket?: P2PResponsePacket): void => {
			if (this._wasResponseSent) {
				throw new RPCResponseAlreadySentError(
					`A response has already been sent for the request procedure <<${options.procedure}>>`,
				);
			}
			this._wasResponseSent = true;
			// We assume peer performed useful work and update peer response rate
			if (!responseError && responsePacket) {
				// eslint-disable-next-line no-param-reassign
				options.productivity.lastResponded = Date.now();
				// eslint-disable-next-line no-param-reassign
				options.productivity.responseCounter += 1;
			}
			// eslint-disable-next-line no-param-reassign
			options.productivity.responseRate =
				options.productivity.responseCounter / options.productivity.requestCounter;

			respondCallback(responseError, responsePacket);
		};
		this._wasResponseSent = false;
	}

	public get procedure(): string {
		return this._procedure;
	}

	public get data(): Buffer | undefined {
		return this._data;
	}

	public get rate(): number {
		return this._rate;
	}

	public get peerId(): string {
		return this._peerId;
	}

	public get wasResponseSent(): boolean {
		return this._wasResponseSent;
	}

	public end(responseData?: unknown): void {
		const data = this._getBase64Data(responseData);
		const responsePacket: P2PResponsePacket = {
			data,
			peerId: this.peerId,
		};
		this._respondCallback(undefined, responsePacket);
	}

	public error(responseError: Error): void {
		this._respondCallback(responseError);
	}

	// eslint-disable-next-line class-methods-use-this
	private _getBase64Data(data: unknown): string | undefined {
		if (!data) {
			return undefined;
		}

		if (Buffer.isBuffer(data)) {
			return data.toString(DEFAULT_MESSAGE_ENCODING_FORMAT);
		}

		return Buffer.from(JSON.stringify(data), 'utf8').toString(DEFAULT_MESSAGE_ENCODING_FORMAT);
	}

	// eslint-disable-next-line class-methods-use-this
	private _getBufferData(options: RequestOptions): Buffer | undefined {
		return typeof options.data === 'string'
			? Buffer.from(options.data, DEFAULT_MESSAGE_ENCODING_FORMAT)
			: undefined;
	}
}
