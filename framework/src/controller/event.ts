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

import { eventWithModuleNameReg } from './constants';

export interface EventInfoObject {
	readonly module: string;
	readonly name: string;
	readonly data?: object;
}

export type EventCallback = (action: EventInfoObject) => void;

export type EventsArray = ReadonlyArray<string>;

export class Event {
	public module: string;
	public name: string;
	public data?: object;

	public constructor(name: string, data?: object) {
		assert(
			eventWithModuleNameReg.test(name),
			`Event name "${name}" must be a valid name with module name.`,
		);

		const [moduleName, ...eventName] = name.split(':');
		this.module = moduleName;
		this.name = eventName.join(':');
		this.data = data;
	}

	public static deserialize(data: EventInfoObject | string): Event {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const parsedEvent: EventInfoObject =
			typeof data === 'string' ? JSON.parse(data) : data;

		return new Event(
			`${parsedEvent.module}:${parsedEvent.name}`,
			parsedEvent.data,
		);
	}

	public serialize(): EventInfoObject {
		return {
			name: this.name,
			module: this.module,
			data: this.data,
		};
	}

	public toString(): string {
		return `${this.module}:${this.name}`;
	}

	public key(): string {
		return `${this.module}:${this.name}`;
	}
}
