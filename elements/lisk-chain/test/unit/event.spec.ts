/*
 * Copyright © 2022 Lisk Foundation
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
/* eslint-disable no-bitwise */

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { eventSchema } from '../../src/schema';
import { Event } from '../../src/event';
import { EVENT_TOPIC_HASH_LENGTH_BYTES, EVENT_TOTAL_INDEX_LENGTH_BYTES } from '../../src/constants';

describe('event', () => {
	const eventObj = {
		module: 'token',
		name: 'Token Event Name',
		topics: [utils.getRandomBytes(32), utils.getRandomBytes(20), utils.getRandomBytes(2)],
		index: 4,
		height: 10,
		data: utils.getRandomBytes(200),
	};
	const encodedEvent = codec.encode(eventSchema, eventObj);

	describe('fromBytes', () => {
		it('should create eventObject from encoded bytes', () => {
			expect(Event.fromBytes(encodedEvent).toObject()).toEqual(eventObj);
		});
	});

	describe('id', () => {
		it('should return event id and equals to SHA-256(encode(eventSchema, event))', () => {
			const event = Event.fromBytes(encodedEvent);
			const id = event.id();

			expect(id).toEqual(utils.hash(codec.encode(eventSchema, event.toObject())));
		});
	});

	describe('keyPair', () => {
		it('should return number of pairs for topics', () => {
			const event = Event.fromBytes(encodedEvent);
			const pairs = event.keyPair();

			expect(pairs).toHaveLength(eventObj.topics.length);
		});

		it('should return the values for all key pairs', () => {
			const event = Event.fromBytes(encodedEvent);
			const pairs = event.keyPair();

			expect.assertions(pairs.length - 1);
			for (let i = 1; i < pairs.length; i += 1) {
				expect(pairs[i].value).toEqual(pairs[0].value);
			}
		});

		it('should return key with correct size and index', () => {
			const event = Event.fromBytes(encodedEvent);
			const pairs = event.keyPair();
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let i = 0; i < pairs.length; i += 1) {
				const { key } = pairs[i];
				expect(key).toHaveLength(EVENT_TOPIC_HASH_LENGTH_BYTES + EVENT_TOTAL_INDEX_LENGTH_BYTES);

				const index = key.subarray(EVENT_TOPIC_HASH_LENGTH_BYTES);

				// Check index
				const indexNum = index.readUInt32BE(0);
				expect((indexNum - i) >> 2).toEqual(eventObj.index);

				// Check topic index
				const topicIndex = indexNum - (eventObj.index << 2);
				expect(topicIndex).toEqual(i);
			}
		});
	});

	describe('toJSON', () => {
		it('should return all values in JSON compatible format', () => {
			const event = Event.fromBytes(encodedEvent).toJSON();
			expect(event).toEqual({
				module: 'token',
				name: 'Token Event Name',
				index: 4,
				height: 10,
				topics: eventObj.topics.map(t => t.toString('hex')),
				data: expect.any(String),
			});
		});
	});

	describe('toObject', () => {
		it('should return all values contained', () => {
			const event = Event.fromBytes(encodedEvent);
			expect(event.toObject()).toEqual(eventObj);
		});
	});

	describe('_getIndexBytes', () => {
		const testCases = [
			{
				eventIndex: 0,
				index: 0,
				expected: '00000000',
			},
			{
				eventIndex: 100,
				index: 2,
				expected: '00000192',
			},
			{
				eventIndex: 2 ** 29,
				index: 1,
				expected: '80000001',
			},
			{
				eventIndex: 2 ** 30 - 1,
				index: 3,
				expected: 'ffffffff',
			},
		];

		it.each(testCases)(
			'given $eventIndex and $index should return $expected',
			({ eventIndex, index, expected }) => {
				const event = new Event({
					index: eventIndex,
					data: Buffer.from([7, 7, 8]),
					height: 10,
					module: 'random',
					name: 'event',
					topics: [],
				});
				expect(event['_getIndexBytes'](index)).toEqual(Buffer.from(expected, 'hex'));
			},
		);
	});
});
