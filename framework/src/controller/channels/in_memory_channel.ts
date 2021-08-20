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

import { Event, EventCallback } from '../event';
import { Action } from '../action';
import { BaseChannel } from './base_channel';
import { Bus } from '../bus';
import * as JSONRPC from '../jsonrpc/types';

export class InMemoryChannel extends BaseChannel {
	private bus!: Bus;

	public registerToBus(bus: Bus): void {
		this.bus = bus;

		this.bus.registerChannel(this.moduleAlias, this.eventsList, this.actions, {
			type: 'inMemory',
			channel: this,
		});
	}

	public subscribe(eventName: string, cb: EventCallback): void {
		this.bus.subscribe(eventName, (notificationObject: JSONRPC.NotificationRequest) =>
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setImmediate(cb, Event.fromJSONRPCNotification(notificationObject).data),
		);
	}

	public once(eventName: string, cb: EventCallback): void {
		this.bus.once(eventName, (notificationObject: JSONRPC.NotificationRequest) =>
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setImmediate(cb, Event.fromJSONRPCNotification(notificationObject).data),
		);
	}

	public publish(eventName: string, data?: Record<string, unknown>): void {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(`Event "${eventName}" not registered in "${this.moduleAlias}" module.`);
		}

		this.bus.publish(event.toJSONRPCNotification());
	}

	public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
		const action = new Action(this._getNextRequestId(), actionName, params);

		if (action.module === this.moduleAlias) {
			if (this.actions[action.name] === undefined) {
				throw new Error(
					`The action '${action.name}' on module '${this.moduleAlias}' does not exist.`,
				);
			}

			const handler = this.actions[action.name]?.handler;
			if (!handler) {
				throw new Error('Handler does not exist.');
			}

			return handler(action.params) as T;
		}

		return (await this.bus.invoke<T>(action.toJSONRPCRequest())).result;
	}
}
