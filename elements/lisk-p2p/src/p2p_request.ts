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

import { RPCResponseAlreadySentError } from '.';
import { P2PResponsePacket } from './p2p_types';

interface RequestOptions {
	readonly procedure: string;
	readonly data: unknown;
	readonly id: string;
	readonly rate: number;
	productivity: {
		// tslint:disable-next-line: readonly-keyword
		requestCounter: number;
		// tslint:disable-next-line: readonly-keyword
		responseCounter: number;
		// tslint:disable-next-line: readonly-keyword
		responseRate: number;
		// tslint:disable-next-line: readonly-keyword
		lastResponded: number;
	};
}

export class P2PRequest {
	private readonly _procedure: string;
	private readonly _data: unknown;
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
		this._data = options.data;
		this._peerId = options.id;
		this._rate = options.rate;
		options.productivity.requestCounter += 1;
		this._respondCallback = (
			responseError?: Error,
			responsePacket?: P2PResponsePacket,
		) => {
			if (this._wasResponseSent) {
				throw new RPCResponseAlreadySentError(
					`A response has already been sent for the request procedure <<${
						options.procedure
					}>>`,
				);
			}
			this._wasResponseSent = true;
			// We assume peer performed useful work and update peer response rate
			if (!responseError && responsePacket) {
				options.productivity.lastResponded = Date.now();
				options.productivity.responseCounter += 1;
				options.productivity.responseRate =
					options.productivity.responseCounter /
					options.productivity.requestCounter;
			}
			respondCallback(responseError, responsePacket);
		};
		this._wasResponseSent = false;
	}

	public get procedure(): string {
		return this._procedure;
	}

	public get data(): unknown {
		return this._data;
	}

	public get rate(): unknown {
		return this._rate;
	}

	public get peerId(): unknown {
		return this._peerId;
	}

	public get wasResponseSent(): boolean {
		return this._wasResponseSent;
	}

	public end(responseData?: unknown): void {
		const responsePacket: P2PResponsePacket = {
			data: responseData,
		};
		this._respondCallback(undefined, responsePacket);
	}

	public error(responseError: Error): void {
		this._respondCallback(responseError);
	}
}
