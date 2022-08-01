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

import { Event, EVENT_MAX_EVENT_SIZE_BYTES, EVENT_MAX_TOPICS_PER_EVENT } from '@liskhq/lisk-chain';

interface RevertibleEvent {
	event: Event;
	noRevert: boolean;
}

export class EventQueue {
	private readonly _events: RevertibleEvent[];

	public constructor() {
		this._events = [];
	}

	public add(
		moduleID: Buffer,
		typeID: Buffer,
		data: Buffer,
		topics: Buffer[],
		noRevert?: boolean,
	): void {
		if (data.length > EVENT_MAX_EVENT_SIZE_BYTES) {
			throw new Error(
				`Max size of event data is ${EVENT_MAX_EVENT_SIZE_BYTES} but received ${data.length}`,
			);
		}
		if (!topics.length) {
			throw new Error('Topics must have at least one element.');
		}
		if (topics.length > EVENT_MAX_TOPICS_PER_EVENT) {
			throw new Error(
				`Max topics per event is ${EVENT_MAX_TOPICS_PER_EVENT} but received ${topics.length}`,
			);
		}
		this._events.push({
			event: new Event({
				moduleID,
				typeID,
				index: this._events.length,
				data,
				topics,
			}),
			noRevert: noRevert ?? false,
		});
	}

	public createSnapshot(): number {
		return this._events.length;
	}

	public restoreSnapshot(snapshotID: number): void {
		const newEvents = this._events.splice(snapshotID);
		const nonRevertableEvents = newEvents
			.filter(eventData => eventData.noRevert)
			.map((eventData, i) => ({
				event: new Event({
					...eventData.event.toObject(),
					index: snapshotID + i,
				}),
				noRevert: false,
			}));
		this._events.push(...nonRevertableEvents);
	}

	public getEvents(): Event[] {
		return this._events.map(e => e.event);
	}
}
