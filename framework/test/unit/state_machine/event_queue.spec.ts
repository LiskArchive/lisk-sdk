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
import { utils } from '@liskhq/lisk-cryptography';
import { EventQueue } from '../../../src/state_machine/event_queue';

describe('EventQueue', () => {
	// Arrange
	const events = [
		{
			module: 'auth',
			name: 'Auth Event Name',
			height: 12,
			data: utils.getRandomBytes(20),
			topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
		},
		{
			module: 'pos',
			name: 'POS Event Name',
			height: 12,
			data: utils.getRandomBytes(20),
			topics: [utils.getRandomBytes(32), utils.getRandomBytes(20)],
		},
		{
			module: 'token',
			name: 'Token Event Name',
			height: 12,
			data: utils.getRandomBytes(20),
			topics: [utils.getRandomBytes(32)],
		},
		{
			module: 'random',
			name: 'Random Event Name',
			height: 12,
			data: utils.getRandomBytes(20),
			topics: [
				utils.getRandomBytes(32),
				utils.getRandomBytes(20),
				utils.getRandomBytes(20),
				utils.getRandomBytes(20),
			],
		},
	];
	let eventQueue: EventQueue;

	beforeEach(() => {
		eventQueue = new EventQueue(12);
	});

	it('should throw error if data size exceeds maximum allowed', () => {
		expect(() =>
			eventQueue.add(
				'token',
				'Token Event Name',
				utils.getRandomBytes(EVENT_MAX_EVENT_SIZE_BYTES + 1),
				[utils.getRandomBytes(32)],
			),
		).toThrow('Max size of event data is');
	});

	it('should throw error if topics length exceeds maxumum allowed', () => {
		expect(() =>
			eventQueue.add(
				'token',
				'Token Event Name',
				utils.getRandomBytes(EVENT_MAX_EVENT_SIZE_BYTES),
				new Array(5).fill(0).map(() => utils.getRandomBytes(32)),
			),
		).toThrow('Max topics per event is');
	});

	it('should be able to add events to queue', () => {
		// Act
		events.map(e => eventQueue.unsafeAdd(e.module, e.name, e.data, e.topics));
		const addedEvents = eventQueue.getEvents();

		// Asset
		expect(addedEvents).toHaveLength(events.length);
		addedEvents.forEach((e, i) => {
			expect(e.toObject()).toEqual({
				...events[i],
				module: events[i].module,
				index: i,
			});
		});
	});

	it('should be able to get events from child queue', () => {
		for (const e of events) {
			eventQueue.unsafeAdd(e.module, e.name, e.data, e.topics);
		}
		const childQueue = eventQueue.getChildQueue(events[0].topics[0]);

		expect(childQueue.getEvents()).toHaveLength(events.length);
	});

	it('should return original set of events when create and restore snapshot', () => {
		events.map(e => eventQueue.unsafeAdd(e.module, e.name, e.data, e.topics));
		expect(eventQueue.getEvents()).toHaveLength(events.length);

		const snapshotID = eventQueue.createSnapshot();
		eventQueue.add('auth', 'Auth Event Name', utils.getRandomBytes(100), [
			utils.getRandomBytes(32),
		]);
		eventQueue.restoreSnapshot(snapshotID);

		expect(eventQueue.getEvents()).toHaveLength(events.length);
		eventQueue.getEvents().forEach((e, i) => {
			expect(e.toObject()).toEqual({
				...events[i],
				module: events[i].module,
				index: i,
			});
		});
	});

	it('should maintain new nonRevertible events when restoring the snapshot', () => {
		events.map(e => eventQueue.unsafeAdd(e.module, e.name, e.data, e.topics));
		expect(eventQueue.getEvents()).toHaveLength(events.length);

		const snapshotID = eventQueue.createSnapshot();
		eventQueue.add(
			'auth',
			'Auth Event Name',
			utils.getRandomBytes(100),
			[utils.getRandomBytes(32)],
			false,
		);
		eventQueue.add(
			'auth',
			'Auth Event Name',
			utils.getRandomBytes(100),
			[utils.getRandomBytes(32)],
			true,
		);
		eventQueue.add(
			'auth',
			'Auth Event Name',
			utils.getRandomBytes(100),
			[utils.getRandomBytes(32)],
			false,
		);
		eventQueue.restoreSnapshot(snapshotID);

		expect(eventQueue.getEvents()).toHaveLength(events.length + 1);
		const queuedEvents = eventQueue.getEvents();
		// eslint-disable-next-line @typescript-eslint/prefer-for-of
		for (let i = 0; i < queuedEvents.length; i += 1) {
			expect(queuedEvents[i].toObject().index).toEqual(i);
		}
	});
});
