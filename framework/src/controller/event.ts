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
import { NotificationRequest, VERSION } from './jsonrpc';

export interface EventInfoObject {
	readonly module: string;
	readonly name: string;
	readonly data?: object;
}

export type EventCallback = (event: EventInfoObject) => void | Promise<void>;

export type EventsArray = ReadonlyArray<string>;

export class Event {
	public readonly module: string;
	public readonly name: string;
	public readonly data?: object;

	public constructor(name: string, data?: object) {
		assert(
			eventWithModuleNameReg.test(name),
			`Event name "${name}" must be a valid name with module name and event name.`,
		);

		const [moduleName, ...eventName] = name.split(':');
		this.module = moduleName;
		this.name = eventName.join(':');
		this.data = data;
	}

	public static fromJSONRPCNotification(data: NotificationRequest | string): Event {
		const { method, params } =
			typeof data === 'string' ? (JSON.parse(data) as NotificationRequest) : data;

		return new Event(method, params);
	}

	public toJSONRPCNotification(): NotificationRequest {
		return {
			jsonrpc: VERSION,
			method: `${this.module}:${this.name}`,
			params: this.data,
		};
	}

	public toObject(): EventInfoObject {
		return {
			module: this.module,
			name: this.name,
			data: this.data,
		};
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
