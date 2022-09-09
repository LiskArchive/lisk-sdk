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
import { Database, StateDB } from '@liskhq/lisk-db';
import { StateStore } from '@liskhq/lisk-chain';
import { Event, EventCallback } from '../event';
import { Request } from '../request';
import { BaseChannel } from './base_channel';
import { Bus } from '../bus';
import * as JSONRPC from '../jsonrpc/types';
import { ChannelType, EndpointHandlers } from '../../types';
import { Logger } from '../../logger';
import { createImmutableMethodContext } from '../../state_machine';
import { PrefixedStateReadWriter } from '../../state_machine/prefixed_state_read_writer';

export class InMemoryChannel extends BaseChannel {
	private bus!: Bus;
	private readonly _db: StateDB;
	private readonly _moduleDB: Database;

	public constructor(
		logger: Logger,
		db: StateDB,
		moduleDB: Database,
		namespace: string,
		events: ReadonlyArray<string>,
		endpoints: EndpointHandlers,
	) {
		super(logger, namespace, events, endpoints);
		this._db = db;
		this._moduleDB = moduleDB;
	}

	public async registerToBus(bus: Bus): Promise<void> {
		this.bus = bus;
		const endpointInfo = Object.keys(this.endpointHandlers).reduce(
			(prev, methodName) => ({
				...prev,
				[methodName]: {
					namespace: this.namespace,
					methodName,
				},
			}),
			{},
		);

		await this.bus.registerChannel(this.namespace, this.eventsList, endpointInfo, {
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

		if (event.module !== this.namespace) {
			throw new Error(`Event "${eventName}" not registered in "${this.namespace}" module.`);
		}

		this.bus.publish(event.toJSONRPCNotification());
	}

	public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
		const request = new Request(this._getNextRequestId(), actionName, params);

		if (request.namespace === this.namespace) {
			if (this.endpointHandlers[request.name] === undefined) {
				throw new Error(
					`The action '${request.name}' on module '${this.namespace}' does not exist.`,
				);
			}

			const handler = this.endpointHandlers[request.name];
			if (!handler) {
				throw new Error('Handler does not exist.');
			}

			return handler({
				logger: this._logger,
				params: request.params ?? {},
				getStore: (moduleID: Buffer, storePrefix: Buffer) => {
					const stateStore = new PrefixedStateReadWriter(this._db.newReadWriter());
					return stateStore.getStore(moduleID, storePrefix);
				},
				getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) => {
					const stateStore = new StateStore(this._moduleDB);
					return stateStore.getStore(moduleID, storePrefix);
				},
				getImmutableMethodContext: () =>
					createImmutableMethodContext(new PrefixedStateReadWriter(this._db.newReadWriter())),
			}) as Promise<T>;
		}

		const resp = await this.bus.invoke<T>(request.toJSONRPCRequest());
		return resp.result;
	}
}
