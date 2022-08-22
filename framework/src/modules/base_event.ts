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
import { codec, Schema } from '@liskhq/lisk-codec';
import { EventQueue } from '../state_machine';

export interface EventQueuer {
	eventQueue: EventQueue;
}

export class BaseEvent<T> {
	public schema?: Schema;
	private readonly _moduleName: string;

	public get key(): Buffer {
		return Buffer.from(this._moduleName + this.name, 'utf-8');
	}

	public get name(): string {
		const name = this.constructor.name.replace('Store', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	public constructor(moduleName: string) {
		this._moduleName = moduleName;
	}

	public add(ctx: EventQueuer, data: T, topics?: Buffer[], noRevert?: boolean): void {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		// TODO: Update name to be directly as an input with https://github.com/LiskHQ/lisk-sdk/issues/7385
		ctx.eventQueue.add(
			this._moduleName,
			Buffer.from(this.name, 'utf-8'),
			codec.encode(this.schema, data as Record<string, unknown>),
			topics,
			noRevert,
		);
	}
}
