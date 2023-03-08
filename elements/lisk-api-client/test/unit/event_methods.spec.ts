/*
 * Copyright © 2023 Lisk Foundation
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
 *
 */

import { Channel } from '../../src/types';
import { EventMethods } from '../../src/event_methods';
import { metadata } from '../utils/transaction';
import { events as encodedEventsJSON } from '../fixtures/encoded_events.json';

describe('event', () => {
	const BLOCK_HEIGHT = encodedEventsJSON[0].height;
	let channel: Channel;
	let event: EventMethods;

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn().mockResolvedValue(encodedEventsJSON),
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			subscribe: jest.fn((_, callback) => callback({ blockHeader: { BLOCK_HEIGHT } })),
		};
		event = new EventMethods(channel, metadata);
	});

	describe('get', () => {
		it('should decode all events', async () => {
			expect(await event.get(BLOCK_HEIGHT)).toMatchSnapshot();
		});

		it('should return only decoded events that match specified module name', async () => {
			const decodedEvents = await event.get(BLOCK_HEIGHT, { module: 'pos' });

			expect(decodedEvents).toHaveLength(2);
			expect(decodedEvents[0].module).toBe('pos');
			expect(decodedEvents[0].name).toBe('validatorStaked');
			expect(decodedEvents[1].module).toBe('pos');
			expect(decodedEvents[1].name).toBe('commandExecutionResult');
		});

		it('should return only decoded events that match specified module and event name', async () => {
			const decodedEvents = await event.get(BLOCK_HEIGHT, {
				module: 'pos',
				name: 'validatorStaked',
			});

			expect(decodedEvents).toHaveLength(1);
			expect(decodedEvents[0].module).toBe('pos');
			expect(decodedEvents[0].name).toBe('validatorStaked');
		});
	});

	describe('subscribe', () => {
		it('should subscribe to all events', async () => {
			const decodedEvents = await event.get(BLOCK_HEIGHT);

			event.subscribe(events => {
				expect(events).toEqual(decodedEvents);
			});

			expect.assertions(1);
		});
	});
});
