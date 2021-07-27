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

interface Event {
	key: string;
	value: Buffer;
}

export class EventQueue {
	private _events: Event[];
	private _originalEvents: Event[];

	public constructor() {
		this._events = [];
		this._originalEvents = [];
	}

	public add(key: string, value: Buffer): void {
		this._events.push({ key, value });
	}

	public createSnapshot(): void {
		this._originalEvents = this._events.map(eventData => ({ ...eventData }));
	}

	public restoreSnapshot(): void {
		this._events = this._originalEvents;
		this._originalEvents = [];
	}

	public getEvents(): Event[] {
		return this._events;
	}
}
