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

import { Event } from '../../../../src/controller/event';

import {
	EVENT_NAME,
	MODULE_NAME,
	VALID_EVENT_NAME_ARG,
	INVALID_EVENT_NAME_ARG,
	DATA,
} from './constants';

describe('Event Class', () => {
	describe('#constructor', () => {
		it('should throw error when invalid name argument was provided.', () => {
			// Act & Assert
			expect(() => new Event(INVALID_EVENT_NAME_ARG)).toThrow(
				`Event name "${INVALID_EVENT_NAME_ARG}" must be a valid name with module name and event name.`,
			);
		});

		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Act
			const event = new Event(VALID_EVENT_NAME_ARG, DATA);

			// Assert
			expect(event.module).toBe(MODULE_NAME);
			expect(event.name).toBe(EVENT_NAME);
			expect(event.data).toEqual(DATA);
		});

		it('should not set source property when source is not provided.', () => {
			// Act
			const event = new Event(VALID_EVENT_NAME_ARG, DATA);

			// Assert
			expect(event).not.toHaveProperty('source');
		});
	});

	describe('methods', () => {
		let event: Event;

		beforeEach(() => {
			// Act
			event = new Event(VALID_EVENT_NAME_ARG, DATA);
		});

		describe('#toJSONRPCNotification', () => {
			it('should return jsonrpc object.', () => {
				// Arrange
				const expectedResult = {
					jsonrpc: '2.0',
					method: 'module_event',
					params: {
						data: '#data',
					},
				};

				// Act
				const serializedEvent = event.toJSONRPCNotification();

				// Assert
				expect(serializedEvent).toEqual(expectedResult);
			});
		});

		describe('static #fromJSONRPCNotification', () => {
			it('should return action instance for given jsonrpc string.', () => {
				// Arrange
				const jsonData = {
					jsonrpc: '2.0',
					method: `${MODULE_NAME}_${EVENT_NAME}`,
					params: DATA,
				};
				const config = JSON.stringify(jsonData);

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const event = Event.fromJSONRPCNotification(config);

				// Assert
				expect(event).toBeInstanceOf(Event);
				expect(event.module).toBe(MODULE_NAME);
				expect(event.name).toBe(EVENT_NAME);
				expect(event.data).toStrictEqual(DATA);
			});

			it('should return action instance for given jsonrpc request object.', () => {
				// Arrange
				const config = {
					jsonrpc: '2.0',
					method: `${MODULE_NAME}_${EVENT_NAME}`,
					params: DATA,
				};

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const event = Event.fromJSONRPCNotification(config);

				// Assert
				expect(event).toBeInstanceOf(Event);
				expect(event.module).toBe(MODULE_NAME);
				expect(event.name).toBe(EVENT_NAME);
				expect(event.data).toBe(DATA);
			});
		});

		describe('#key', () => {
			it('should return method name.', () => {
				// Arrange
				const expectedResult = `${MODULE_NAME}_${EVENT_NAME}`;

				// Act
				const key = event.key();

				// Assert
				expect(key).toBe(expectedResult);
			});
		});
	});
});
