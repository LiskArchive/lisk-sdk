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

import { EventQueue } from './event_queue';
import { PrefixedStateReadWriter, StateDBReadWriter } from './prefixed_state_read_writer';
import { SubStore, ImmutableSubStore, ImmutableAPIContext } from './types';

interface Params {
	stateStore: PrefixedStateReadWriter;
	eventQueue: EventQueue;
}

export const createAPIContext = (params: Params) => new APIContext(params);

export const createNewAPIContext = (db: StateDBReadWriter) =>
	new APIContext({ stateStore: new PrefixedStateReadWriter(db), eventQueue: new EventQueue() });

interface ImmutableSubStoreGetter {
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
}

export const createImmutableAPIContext = (
	immutableSubstoreGetter: ImmutableSubStoreGetter,
): ImmutableAPIContext => ({
	getStore: (moduleID: Buffer, storePrefix: Buffer) =>
		immutableSubstoreGetter.getStore(moduleID, storePrefix),
});

export class APIContext {
	private readonly _stateStore: PrefixedStateReadWriter;
	private readonly _eventQueue: EventQueue;

	public constructor(params: Params) {
		this._eventQueue = params.eventQueue;
		this._stateStore = params.stateStore;
	}

	public getStore(moduleID: Buffer, storePrefix: Buffer): SubStore {
		return this._stateStore.getStore(moduleID, storePrefix);
	}

	public get eventQueue(): EventQueue {
		return this._eventQueue;
	}
}
