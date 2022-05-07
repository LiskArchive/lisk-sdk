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
import { StateStore } from '@liskhq/lisk-chain';
import { KVStore } from '@liskhq/lisk-db';
import { Event, EventCallback } from '../event';
import { Request } from '../request';
import { BaseChannel } from './base_channel';
import { Bus } from '../bus';
import * as JSONRPC from '../jsonrpc/types';
import { ChannelType, EndpointHandlers } from '../../types';
import { Logger } from '../../logger';
import { createImmutableAPIContext } from '../../node/state_machine';

export class InMemoryChannel extends BaseChannel {
	private bus!: Bus;
	private readonly _db: KVStore;
	private readonly _networkIdentifier: Buffer | undefined;

	public constructor(
		logger: Logger,
		db: KVStore,
		namespace: string,
		events: ReadonlyArray<string>,
		endpoints: EndpointHandlers,
		networkIdentifier?: Buffer,
	) {
		super(logger, namespace, events, endpoints);
		this._db = db;
		if (networkIdentifier) {
			this._networkIdentifier = networkIdentifier;
		}
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
				getStore: (moduleID: number, storePrefix: number) => {
					const stateStore = new StateStore(this._db);
					return stateStore.getStore(moduleID, storePrefix);
				},
				getImmutableAPIContext: () => createImmutableAPIContext(new StateStore(this._db)),
				...(this._networkIdentifier && { networkIdentifier: this._networkIdentifier }),
			}) as Promise<T>;
		}

		const { result } = await this.bus.invoke<T>(request.toJSONRPCRequest());
		return result;
	}
}
