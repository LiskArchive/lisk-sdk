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

jest.mock('../../../../src/controller/bus');

/* eslint-disable import/first  */

import { InMemoryChannel, BaseChannel } from '../../../../src/controller/channels';
import { Bus } from '../../../../src/controller/bus';
import { Event } from '../../../../src/controller/event';
import { fakeLogger } from '../../../utils/mocks';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';

describe('InMemoryChannel Channel', () => {
	// Arrange
	const params = {
		namespace: 'sample',
		logger: fakeLogger,
		db: {
			newReadWriter: jest.fn().mockReturnValue({ close: jest.fn() }),
		} as never,
		moduleDB: {
			write: jest.fn(),
		} as never,
		events: ['event1', 'event2'],
		endpoints: {
			action1: jest.fn(),
			action2: jest.fn(),
			action3: jest.fn(),
		},
		options: {},
	};
	const config: any = {};
	let inMemoryChannel: InMemoryChannel;
	const bus: Bus = new Bus(config);
	const chainID = Buffer.from('10000000', 'hex');

	beforeEach(() => {
		// Act
		inMemoryChannel = new InMemoryChannel(
			params.logger,
			params.db,
			params.moduleDB,
			params.namespace,
			params.events,
			params.endpoints,
			chainID,
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
			expect(inMemoryChannel).toHaveProperty('_db');
			expect(inMemoryChannel).toHaveProperty('namespace');
			expect(inMemoryChannel).toHaveProperty('eventsList');
			expect(inMemoryChannel).toHaveProperty('endpointsList');
		});
	});

	describe('#registerToBus', () => {
		it('should call `bus.registerChannel` method with given arguments', async () => {
			// Act
			await inMemoryChannel.registerToBus(bus);

			// Assert
			expect(inMemoryChannel['bus']).toBe(bus);
			expect(inMemoryChannel['bus'].registerChannel).toHaveBeenCalledWith(
				inMemoryChannel.namespace,
				inMemoryChannel.eventsList,
				Object.keys(params.endpoints).reduce(
					(prev, key) => ({
						...prev,
						[key]: {
							namespace: params.namespace,
							methodName: key,
						},
					}),
					{},
				),
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
			const eventName = 'module_anEventName';
			const event = new Event(eventName);
			await inMemoryChannel.registerToBus(bus);

			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			inMemoryChannel.once(eventName, () => {});

			// Assert
			expect(inMemoryChannel['bus'].once).toHaveBeenCalledWith(event.key(), expect.any(Function));
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.subscribe).toThrow(TypeError);
		});

		it('should call bus.once with the event key', async () => {
			// Arrange
			const eventName = 'module_anEventName';
			const event = new Event(eventName);

			// Act
			await inMemoryChannel.registerToBus(bus);
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			inMemoryChannel.once(eventName, () => {});

			// Assert
			expect(inMemoryChannel['bus'].once).toHaveBeenCalledWith(event.key(), expect.any(Function));
		});

		it.todo('write integration test to check if event is being listened');
	});

	describe('#publish', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.publish).toThrow(
				'Event name "undefined" must be a valid name with module name and event name.',
			);
		});

		it('should throw an Error if event module is different than moduleName', () => {
			const eventName = 'differentModule_eventName';
			expect(() => {
				inMemoryChannel.publish(eventName);
			}).toThrow(`Event "${eventName}" not registered in "${inMemoryChannel.namespace}" module.`);
		});

		it('should call bus.publish if the event module is equal to moduleName', async () => {
			// Arrange
			const eventFullName = `${inMemoryChannel.namespace}_eventName`;
			const event = new Event(eventFullName);

			// Act
			await inMemoryChannel.registerToBus(bus);
			inMemoryChannel.publish(eventFullName);

			// Assert
			expect(inMemoryChannel['bus'].publish).toHaveBeenCalledWith(event.toJSONRPCNotification());
		});

		it.todo('write integration test to check if event is being published');
	});

	describe('#invoke', () => {
		const actionName = 'action1';

		it('should execute the action straight away if the action module is equal to moduleName', async () => {
			// Arrange
			const actionFullName = `${inMemoryChannel.namespace}_${actionName}`;

			// Act
			await inMemoryChannel.invoke({ methodName: actionFullName, context: {} });

			// Assert
			expect(params.endpoints.action1).toHaveBeenCalled();
		});

		it('should execute the endpoint with PrefixedStateReadWriter', async () => {
			// Arrange
			const actionFullName = `${inMemoryChannel.namespace}_${actionName}`;

			// Act
			await inMemoryChannel.invoke({ methodName: actionFullName, context: {} });

			// Assert
			expect(
				params.endpoints.action1.mock.calls[0][0].getStore(
					Buffer.from([0, 0, 0, 0]),
					Buffer.from([0, 0, 0, 0]),
				),
			).toBeInstanceOf(PrefixedStateReadWriter);
			expect(
				params.endpoints.action1.mock.calls[0][0]
					.getImmutableMethodContext()
					.getStore(Buffer.from([0, 0, 0, 0]), Buffer.from([0, 0, 0, 0])),
			).toBeInstanceOf(PrefixedStateReadWriter);
		});

		it('should store changes to the module DB', async () => {
			// Arrange
			const actionFullName = `${inMemoryChannel.namespace}_${actionName}`;

			// Act
			await inMemoryChannel.invoke({ methodName: actionFullName, context: {} });

			// Assert
			expect(inMemoryChannel['_moduleDB'].write).toHaveBeenCalledTimes(1);
		});

		it('should call bus.invoke if the action module is different to moduleName', async () => {
			// Arrange
			const actionFullName = `aDifferentModule_${actionName}`;

			// Act
			await inMemoryChannel.registerToBus(bus);
			jest.spyOn(bus, 'invoke').mockResolvedValue({ result: {} } as never);

			await inMemoryChannel.invoke({ methodName: actionFullName, context: {} });

			// Assert
			expect(inMemoryChannel['bus'].invoke).toHaveBeenCalled();
		});

		it('should throw an error if the action does not exist', async () => {
			// Arrange
			const actionFullName = `${inMemoryChannel.namespace}_nonExistingAction`;

			// Act
			await inMemoryChannel.registerToBus(bus);

			// Assert
			await expect(
				inMemoryChannel.invoke({ methodName: actionFullName, context: {} }),
			).rejects.toThrow(`The action 'nonExistingAction' on module 'sample' does not exist.`);
		});
	});
});
