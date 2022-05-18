/*
 * Copyright © 2021 Lisk Foundation
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

import { StateStore, EVENT_STANDARD_TYPE_ID } from '@liskhq/lisk-chain';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { EventQueue } from './event_queue';
import { SubStore, ImmutableSubStore, ImmutableAPIContext, EventQueueAdder } from './types';

interface Params {
	stateStore: StateStore;
	eventQueue: EventQueueAdder;
}

export const createAPIContext = (params: Params) => new APIContext(params);

export const createNewAPIContext = (db: KVStore | InMemoryKVStore) =>
	new APIContext({ stateStore: new StateStore(db), eventQueue: new EventQueue() });

interface ImmutableSubStoreGetter {
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
}

export const createImmutableAPIContext = (
	immutableSubstoreGetter: ImmutableSubStoreGetter,
): ImmutableAPIContext => ({
	getStore: (moduleID: number, storePrefix: number) =>
		immutableSubstoreGetter.getStore(moduleID, storePrefix),
});

export const wrapEventQueue = (eventQueue: EventQueue, topic: Buffer): EventQueueAdder => ({
	add: (
		moduleID: number,
		typeID: Buffer,
		data: Buffer,
		topics?: Buffer[],
		noRevert?: boolean,
	): void => {
		if (typeID.equals(EVENT_STANDARD_TYPE_ID)) {
			throw new Error('Event type ID 0 is reserved for standard event.');
		}
		const topicsWithDefault = [topic, ...(topics ?? [])];
		eventQueue.add(moduleID, typeID, data, topicsWithDefault, noRevert);
	},
});

export class APIContext {
	private readonly _stateStore: StateStore;
	private readonly _eventQueue: EventQueueAdder;

	public constructor(params: Params) {
		this._eventQueue = params.eventQueue;
		this._stateStore = params.stateStore;
	}

	public getStore(moduleID: number, storePrefix: number): SubStore {
		return this._stateStore.getStore(moduleID, storePrefix);
	}

	public get eventQueue(): EventQueueAdder {
		return this._eventQueue;
	}
}
