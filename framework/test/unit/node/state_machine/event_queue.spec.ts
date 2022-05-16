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

import { EVENT_MAX_EVENT_SIZE_BYTES } from '@liskhq/lisk-chain';
import { getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { EventQueue } from '../../../../src/node/state_machine/event_queue';

describe('EventQueue', () => {
	// Arrange
	const events = [
		{
			moduleID: 3,
			typeID: Buffer.from([0, 0, 0, 0]),
			data: getRandomBytes(20),
			topics: [getRandomBytes(32), getRandomBytes(20)],
		},
		{
			moduleID: 4,
			typeID: Buffer.from([0, 0, 0, 0]),
			data: getRandomBytes(20),
			topics: [getRandomBytes(32), getRandomBytes(20)],
		},
		{
			moduleID: 2,
			typeID: Buffer.from([0, 0, 0, 0]),
			data: getRandomBytes(20),
			topics: [getRandomBytes(32)],
		},
		{
			moduleID: 1,
			typeID: Buffer.from([0, 0, 0, 0]),
			data: getRandomBytes(20),
			topics: [getRandomBytes(32), getRandomBytes(20), getRandomBytes(20), getRandomBytes(20)],
		},
	];
	let eventQueue: EventQueue;

	beforeEach(() => {
		eventQueue = new EventQueue();
	});

	it('should throw error if data size exceeds maximum allowed', () => {
		expect(() =>
			eventQueue.add(2, Buffer.from([0, 0, 0, 1]), getRandomBytes(EVENT_MAX_EVENT_SIZE_BYTES + 1), [
				getRandomBytes(32),
			]),
		).toThrow('Max size of event data is');
	});

	it('should throw error if topics is empty', () => {
		expect(() =>
			eventQueue.add(2, Buffer.from([0, 0, 0, 1]), getRandomBytes(EVENT_MAX_EVENT_SIZE_BYTES), []),
		).toThrow('Topics must have at least one element');
	});

	it('should throw error if topics length exceeds maxumum allowed', () => {
		expect(() =>
			eventQueue.add(
				2,
				Buffer.from([0, 0, 0, 1]),
				getRandomBytes(EVENT_MAX_EVENT_SIZE_BYTES),
				new Array(5).fill(0).map(() => getRandomBytes(32)),
			),
		).toThrow('Max topics per event is');
	});

	it('should be able to add events to queue', () => {
		// Act
		events.map(e => eventQueue.add(e.moduleID, e.typeID, e.data, e.topics));
		const addedEvents = eventQueue.getEvents();

		// Asset
		expect(addedEvents).toHaveLength(events.length);
		addedEvents.forEach((e, i) => {
			expect(e.toObject()).toEqual({
				...events[i],
				moduleID: intToBuffer(events[i].moduleID, 4),
				index: i,
			});
		});
	});

	it('should return original set of events when create and restore snapshot', () => {
		events.map(e => eventQueue.add(e.moduleID, e.typeID, e.data, e.topics));
		expect(eventQueue.getEvents()).toHaveLength(events.length);

		eventQueue.createSnapshot();
		eventQueue.add(3, Buffer.from([0, 0, 0, 1]), getRandomBytes(100), [getRandomBytes(32)]);
		eventQueue.restoreSnapshot();

		expect(eventQueue.getEvents()).toHaveLength(events.length);
		eventQueue.getEvents().forEach((e, i) => {
			expect(e.toObject()).toEqual({
				...events[i],
				moduleID: intToBuffer(events[i].moduleID, 4),
				index: i,
			});
		});
	});

	it('should maintain new nonRevertible events when restoring the snapshot', () => {
		events.map(e => eventQueue.add(e.moduleID, e.typeID, e.data, e.topics));
		expect(eventQueue.getEvents()).toHaveLength(events.length);

		eventQueue.createSnapshot();
		eventQueue.add(3, Buffer.from([0, 0, 0, 1]), getRandomBytes(100), [getRandomBytes(32)], false);
		eventQueue.add(3, Buffer.from([0, 0, 0, 1]), getRandomBytes(100), [getRandomBytes(32)], true);
		eventQueue.add(3, Buffer.from([0, 0, 0, 1]), getRandomBytes(100), [getRandomBytes(32)], false);
		eventQueue.restoreSnapshot();

		expect(eventQueue.getEvents()).toHaveLength(events.length + 1);
		const queuedEvents = eventQueue.getEvents();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < queuedEvents.length; i += 1) {
			expect(queuedEvents[i].toObject().index).toEqual(i);
		}
	});
});
