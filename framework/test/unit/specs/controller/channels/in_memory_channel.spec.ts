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

jest.mock('../../../../../src/controller/bus');

/* eslint-disable import/first  */

import {
	InMemoryChannel,
	BaseChannel,
} from '../../../../../src/controller/channels';
import { Bus } from '../../../../../src/controller/bus';
import { Event } from '../../../../../src/controller/event';

describe('InMemoryChannel Channel', () => {
	// Arrange
	const params = {
		moduleAlias: 'moduleAlias',
		events: ['event1', 'event2'],
		actions: {
			action1: {
				handler: jest.fn(),
				isPublic: true,
			},
			action2: {
				handler: jest.fn(),
				isPublic: true,
			},
			action3: {
				handler: jest.fn(),
				isPublic: true,
			},
		},
		options: {},
	};
	const logger: any = {};
	const config: any = {};
	let inMemoryChannel: InMemoryChannel;
	const bus: Bus = new Bus(logger, config);

	beforeEach(() => {
		// Act
		inMemoryChannel = new InMemoryChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options,
		);
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(InMemoryChannel.prototype).toBeInstanceOf(BaseChannel);
		});
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(inMemoryChannel).toHaveProperty('moduleAlias');
			expect(inMemoryChannel).toHaveProperty('options');
		});
	});

	describe('#registerToBus', () => {
		it('should call `bus.registerChannel` method with given arguments', async () => {
			// Act
			await inMemoryChannel.registerToBus(bus);

			// Assert
			expect(inMemoryChannel['bus']).toBe(bus);
			expect(
				inMemoryChannel['bus'].registerChannel,
			).toHaveBeenCalledWith(
				inMemoryChannel['moduleAlias'],
				inMemoryChannel.eventsList,
				inMemoryChannel['actions'],
				{ type: 'inMemory', channel: inMemoryChannel },
			);
		});
	});

	describe('#once', () => {
		it('should throw TypeError when eventName was not provided', () => {
			expect(inMemoryChannel.once).toThrow(TypeError);
		});

		it('should call bus.once with the event key', async () => {
			// Arrange
			const eventName = 'module:anEventName';
			const event = new Event(eventName);
			await inMemoryChannel.registerToBus(bus);

			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			inMemoryChannel.once(eventName, () => {});

			// Assert
			expect(inMemoryChannel['bus'].once).toHaveBeenCalledWith(
				event.key(),
				expect.any(Function),
			);
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.subscribe).toThrow(TypeError);
		});

		it('should call bus.once with the event key', async () => {
			// Arrange
			const eventName = 'module:anEventName';
			const event = new Event(eventName);

			// Act
			await inMemoryChannel.registerToBus(bus);
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			inMemoryChannel.once(eventName, () => {});

			// Assert
			expect(inMemoryChannel['bus'].once).toHaveBeenCalledWith(
				event.key(),
				expect.any(Function),
			);
		});

		it.todo('write integration test to check if event is being listened');
	});

	describe('#publish', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.publish).toThrow(
				'Event name "undefined" must be a valid name with module name.',
			);
		});

		it('should throw an Error if event module is different than moduleAlias', () => {
			const eventName = 'differentModule:eventName';
			expect(() => {
				inMemoryChannel.publish(eventName);
			}).toThrow(
				`Event "${eventName}" not registered in "${inMemoryChannel['moduleAlias']}" module.`,
			);
		});

		it('should call bus.publish if the event module is equal to moduleAlias', async () => {
			// Arrange
			const eventFullName = `${inMemoryChannel['moduleAlias']}:eventName`;
			const event = new Event(eventFullName);

			// Act
			await inMemoryChannel.registerToBus(bus);
			inMemoryChannel.publish(eventFullName);

			// Assert
			expect(inMemoryChannel['bus'].publish).toHaveBeenCalledWith(
				event.key(),
				event.serialize(),
			);
		});

		it.todo('write integration test to check if event is being published');
	});

	describe('#invoke', () => {
		const actionName = 'action1';

		it('should execute the action straight away if the action module is equal to moduleAlias', async () => {
			// Arrange
			const actionFullName = `${inMemoryChannel['moduleAlias']}:${actionName}`;

			// Act
			await inMemoryChannel.invoke(actionFullName);

			// Assert
			expect(params.actions.action1.handler).toHaveBeenCalled();
		});

		it('should call bus.invoke if the atcion module is different to moduleAlias', async () => {
			// Arrange
			const actionFullName = `aDifferentModule:${actionName}`;

			// Act
			await inMemoryChannel.registerToBus(bus);
			await inMemoryChannel.invoke(actionFullName);

			// Assert
			expect(inMemoryChannel['bus'].invoke).toHaveBeenCalled();
		});
	});
});
