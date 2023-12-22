/*
 * Copyright © 2022 Lisk Foundation
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
import { codec, emptySchema, Schema } from '@liskhq/lisk-codec';
import { EventQueue } from '../state_machine/event_queue';

export interface EventQueuer {
	eventQueue: EventQueue;
}

export abstract class BaseEvent<T> {
	public schema: Schema = emptySchema;

	private readonly _moduleName: string;

	public get key(): Buffer {
		return Buffer.from(this._moduleName + this.name, 'utf-8');
	}

	public get name(): string {
		const name = this.constructor.name.replace('Event', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	public constructor(moduleName: string) {
		this._moduleName = moduleName;
	}

	public add(ctx: EventQueuer, data: T, topics?: Buffer[], noRevert?: boolean): void {
		ctx.eventQueue.add(
			this._moduleName,
			this.name,
			this.schema ? codec.encode(this.schema, data as Record<string, unknown>) : Buffer.alloc(0),
			topics,
			noRevert,
		);
	}
}
