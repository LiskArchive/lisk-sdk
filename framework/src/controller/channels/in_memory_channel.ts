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

import { ListenerFn } from 'eventemitter2';
import { Event, EventCallback } from '../event';
import { Action } from '../action';
import { BaseChannel } from './base_channel';
import { Bus } from '../bus';
import * as JSONRPC from '../jsonrpc/types';
import { ChannelType } from '../../types';

export class InMemoryChannel extends BaseChannel {
	private bus!: Bus;

	public async registerToBus(bus: Bus): Promise<void> {
		this.bus = bus;

		await this.bus.registerChannel(this.moduleName, this.eventsList, this.actions, {
			type: ChannelType.InMemory,
			channel: this,
		});
	}

	public subscribe(eventName: string, cb: EventCallback): void {
		this.bus.subscribe(eventName, (notificationObject: JSONRPC.NotificationRequest) =>
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setImmediate(cb, Event.fromJSONRPCNotification(notificationObject).data),
		);
	}

	public unsubscribe(eventName: string, cb: ListenerFn): void {
		this.bus.unsubscribe(eventName, cb);
	}

	public once(eventName: string, cb: EventCallback): void {
		this.bus.once(eventName, (notificationObject: JSONRPC.NotificationRequest) =>
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setImmediate(cb, Event.fromJSONRPCNotification(notificationObject).data),
		);
	}

	public publish(eventName: string, data?: Record<string, unknown>): void {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleName) {
			throw new Error(`Event "${eventName}" not registered in "${this.moduleName}" module.`);
		}

		this.bus.publish(event.toJSONRPCNotification());
	}

	public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
		const action = new Action(this._getNextRequestId(), actionName, params);

		if (action.module === this.moduleName) {
			if (this.actions[action.name] === undefined) {
				throw new Error(
					`The action '${action.name}' on module '${this.moduleName}' does not exist.`,
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
