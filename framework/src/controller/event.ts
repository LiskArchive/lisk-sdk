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
 */

import { strict as assert } from 'assert';
import { eventWithModuleNameReg } from '../constants';
import * as JSONRPC from './jsonrpc';

export interface EventInfoObject {
	readonly module: string;
	readonly name: string;
	readonly data: object;
}

export type EventCallback = (action: EventInfoObject) => void | Promise<void>;

export type EventsArray = ReadonlyArray<string>;

export class Event {
	public jsonrpc = JSONRPC.VERSION;
	public method: string;
	public result!: JSONRPC.Result;

	public constructor(method: string, result?: JSONRPC.Result) {
		assert(
			eventWithModuleNameReg.test(method),
			`Event name "${method}" must be a valid name with module name and action name.`,
		);

		this.method = method;
		if (result) {
			this.result = result;
		}
	}

	public static fromJSONRPC(data: JSONRPC.NotificationObject | string): Event {
		const parsedEvent =
			typeof data === 'string' ? (JSON.parse(data) as JSONRPC.NotificationObject) : data;

		return new Event(parsedEvent.method, parsedEvent.result);
	}

	public toJSONRPC(): JSONRPC.NotificationObject {
		if (this.result) {
			return {
				jsonrpc: this.jsonrpc,
				method: this.method,
				result: this.result,
			};
		}
		return {
			jsonrpc: this.jsonrpc,
			method: this.method,
		};
	}

	public get module(): string {
		const [moduleName] = this.method.split(':');
		return moduleName;
	}

	public get name(): string {
		const [, ...eventName] = this.method.split(':');

		return eventName.join(':');
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
