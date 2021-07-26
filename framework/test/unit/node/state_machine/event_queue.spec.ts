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

import { EventQueue } from '../../../../src/node/state_machine/event_queue';

describe('EventQueue', () => {
	const events = [
		{ key: 'moduleA:beforeX', value: Buffer.from('Module A Before X started', 'utf-8') },
		{ key: 'moduleB:beforeX', value: Buffer.from('Module B Before X started', 'utf-8') },
		{ key: 'moduleB:afterX', value: Buffer.from('Module B Before X end', 'utf-8') },
		{ key: 'moduleA:afterX', value: Buffer.from('Module A Before X end', 'utf-8') },
	];
	let eventQueue: EventQueue;

	beforeEach(() => {
		eventQueue = new EventQueue();
	});

	it('should expose interface for add, createSnapshot, restoreSnapshot, and getEvents', () => {
		expect(eventQueue.add).toBeFunction();
		expect(eventQueue.createSnapshot).toBeFunction();
		expect(eventQueue.restoreSnapshot).toBeFunction();
		return expect(eventQueue.getEvents).toBeFunction();
	});

	// eslint-disable-next-line @typescript-eslint/require-await
	it('should be able to add events to queue', async () => {
		events.map(e => eventQueue.add(e.key, e.value));
		const addedEvents = eventQueue.getEvents();

		addedEvents.forEach((e, i) => {
			expect(e.key).toEqual(events[i].key);
			expect(e.value.equals(events[i].value)).toBeTrue();
		});
		return expect(addedEvents.length === events.length);
	});

	// eslint-disable-next-line @typescript-eslint/require-await
	it('should be able to createSnapshot for events', async () => {
		events.map(e => eventQueue.add(e.key, e.value));
		const originalEvents = eventQueue['_originalEvents'];
		eventQueue.createSnapshot();

		originalEvents.forEach((e, i) => {
			expect(e.key).toEqual(events[i].key);
			expect(e.value.equals(events[i].value)).toBeTrue();
		});
		return expect(originalEvents.length === events.length);
	});

	// eslint-disable-next-line @typescript-eslint/require-await
	it('should be able to restoreSnapshot for events', async () => {
		events.map(e => eventQueue.add(e.key, e.value));
		const addedEvents = eventQueue.getEvents();
		eventQueue.restoreSnapshot();

		expect(eventQueue['_originalEvents']).toBeEmpty();
		addedEvents.forEach((e, i) => {
			expect(e.key).toEqual(events[i].key);
			expect(e.value.equals(events[i].value)).toBeTrue();
		});
		return expect(addedEvents.length === events.length);
	});

	// eslint-disable-next-line @typescript-eslint/require-await
	it('should be able to getEvents added', async () => {
		events.map(e => eventQueue.add(e.key, e.value));
		const addedEvents = eventQueue.getEvents();

		addedEvents.forEach((e, i) => {
			expect(e.key).toEqual(events[i].key);
			expect(e.value.equals(events[i].value)).toBeTrue();
		});
		return expect(addedEvents.length === events.length);
	});
});
