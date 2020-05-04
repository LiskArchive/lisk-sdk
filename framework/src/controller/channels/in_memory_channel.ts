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

export class InMemoryChannel extends BaseChannel {
	public bus: Bus | undefined;

	public async registerToBus(bus: Bus): Promise<void> {
		this.bus = bus;

		await this.bus.registerChannel(
			this.moduleAlias,
			this.eventsList,
			this.actions,
			{ type: 'inMemory', channel: this },
		);
	}

	public subscribe(eventName: string, cb: EventCallback): void {
		(this.bus as Bus).subscribe(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data)),
		);
	}

	public once(eventName: string, cb: EventCallback): void {
		(this.bus as Bus).once(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data)),
		);
	}

	public publish(eventName: string, data: object): void {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(
				`Event "${eventName}" not registered in "${this.moduleAlias}" module.`,
			);
		}

		(this.bus as Bus).publish(event.key(), event.serialize());
	}

	// eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-explicit-any
	public async invoke(actionName: string, params?: object): Promise<any> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			if (this.actions[action.key()] === undefined) {
				throw new Error(
					`The action '${action.key()}' on module '${
						this.moduleAlias
					}' does not exist.`,
				);
			}

			// eslint-disable-next-line
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return this.actions[action.key()].handler(action.serialize());
		}

		return (this.bus as Bus).invoke(action.serialize());
	}

	public async invokeFromNetwork(
		remoteMethod: string,
		params?: object,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		return this.invoke(`app:${remoteMethod}`, params);
	}

	public async publishToNetwork(
		actionName: string,
		data: object,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		return this.invoke(`app:${actionName}`, data);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async invokePublic(actionName: string, params?: object): Promise<any> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			if (!this.actions[action.name].isPublic) {
				throw new Error(
					`Action '${action.name}' is not allowed because it's not public.`,
				);
			}

			// eslint-disable-next-line
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return this.actions[action.name].handler(action.serialize());
		}

		return (this.bus as Bus).invokePublic(action.serialize());
	}
}
