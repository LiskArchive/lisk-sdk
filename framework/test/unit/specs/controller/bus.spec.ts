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

jest.mock('eventemitter2');
jest.mock('pm2-axon');
jest.mock('pm2-axon-rpc');

// eslint-disable-next-line import/first
import { EventEmitter2 } from 'eventemitter2';
// eslint-disable-next-line import/first
import { Bus } from '../../../../src/controller/bus';
// eslint-disable-next-line import/first
import { Action, ActionInfoObject } from '../../../../src/controller/action';

describe('Bus', () => {
	const config: any = {
		ipc: {
			enabled: false,
		},
		socketsPath: {
			root: '',
		},
	};

	const channelMock: any = {};

	const channelOptions = {
		type: 'inMemory',
		channel: channelMock,
	};
	const logger: any = {
		info: jest.fn(),
	};

	let bus: Bus;

	beforeEach(() => {
		bus = new Bus(logger, config);
	});

	describe('#constructor', () => {
		it('should create the Bus instance with given arguments.', () => {
			// Assert
			expect(bus['actions']).toEqual({});
			expect(bus['events']).toEqual({});
		});
	});

	describe('#setup', () => {
		it('should resolve with true.', async () => {
			return expect(bus.setup()).resolves.toBe(true);
		});
	});

	describe('#registerChannel', () => {
		it('should register events.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event2'];

			// Act
			await bus.registerChannel(moduleAlias, events, {}, channelOptions);

			// Assert
			expect(Object.keys(bus['events'])).toHaveLength(2);
			events.forEach(eventName => {
				expect(bus['events'][`${moduleAlias}:${eventName}`]).toBe(true);
			});
		});

		it('should throw error when trying to register duplicate events', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event1'];

			// Act && Assert
			await expect(
				bus.registerChannel(moduleAlias, events, {}, channelOptions),
			).rejects.toThrow(Error);
		});

		it('should register actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions: any = {
				action1: new Action('alias:action1', {}, '', false, jest.fn()),
				action2: new Action('alias:action2', {}, '', false, jest.fn()),
			};

			// Act
			await bus.registerChannel(moduleAlias, [], actions, channelOptions);

			// Assert
			expect(Object.keys(bus['actions'])).toHaveLength(2);
			Object.keys(actions).forEach(actionName => {
				expect(bus['actions'][`${moduleAlias}:${actionName}`]).toBe(
					actions[actionName],
				);
			});
		});

		it('should throw error when trying to register duplicate actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = {
				action1: new Action('alias:action1', {}, '', false, jest.fn()),
			};

			// Act && Assert
			await bus.registerChannel(moduleAlias, [], actions, channelOptions);
			await expect(
				bus.registerChannel(moduleAlias, [], actions, channelOptions),
			).rejects.toThrow(Error);
		});
	});

	describe('#invoke', () => {
		it.todo('should invoke controller channel action.');
		it.todo('should invoke module channel action.');

		it('should throw error if action was not registered', async () => {
			// Arrange
			const actionData: ActionInfoObject = {
				name: 'nonExistentAction',
				module: 'app',
				source: 'chain',
				params: {},
			};

			// Act && Assert
			await expect(bus.invoke(actionData)).rejects.toThrow(
				`Action '${actionData.module}:${actionData.name}' is not registered to bus.`,
			);
		});

		it('should throw error if module does not exist', async () => {
			// Arrange
			const actionData: ActionInfoObject = {
				name: 'getComponentConfig',
				module: 'invalidModule',
				source: 'chain',
				params: {},
			};

			// Act && Assert
			await expect(bus.invoke(actionData)).rejects.toThrow(
				`Action '${actionData.module}:${actionData.name}' is not registered to bus.`,
			);
		});
	});

	describe('#invokePublic', () => {
		it('should throw error if action was not registered', async () => {
			// Arrange
			const actionData: ActionInfoObject = {
				name: 'nonExistentAction',
				module: 'app',
				source: 'chain',
				params: {},
			};

			// Act && Assert
			await expect(bus.invokePublic(actionData)).rejects.toThrow(
				`Action '${actionData.module}:${actionData.name}' is not registered to bus.`,
			);
		});

		it('should throw error if module does not exist', async () => {
			// Arrange
			const actionData: ActionInfoObject = {
				name: 'getComponentConfig',
				module: 'invalidModule',
				source: 'chain',
				params: {},
			};

			// Act && Assert
			await expect(bus.invokePublic(actionData)).rejects.toThrow(
				`Action '${actionData.module}:${actionData.name}' is not registered to bus.`,
			);
		});

		it('should throw error if action is not public', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = {
				action1: new Action('alias:action1', {}, '', false, jest.fn()),
			};
			const actionData: ActionInfoObject = {
				name: 'action1',
				module: moduleAlias,
				source: 'chain',
				params: {},
			};

			// Act
			await bus.registerChannel(moduleAlias, [], actions, channelOptions);

			// Assert
			await expect(bus.invokePublic(actionData)).rejects.toThrow(
				`Action '${actionData.module}:${actionData.name}' is not allowed because it's not public.`,
			);
		});
	});

	describe('#publish', () => {
		it("should call eventemitter2 library's emit method", async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['registeredEvent'];
			const eventName = `${moduleAlias}:${events[0]}`;
			const eventData = '#DATA';

			await bus.registerChannel(moduleAlias, events, {}, channelOptions);

			// Act
			bus.publish(eventName, eventData as any);

			// Assert
			expect(EventEmitter2.prototype.emit).toHaveBeenCalledWith(
				eventName,
				eventData,
			);
		});
	});

	describe('#getActions', () => {
		it('should return the registered actions', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions: any = {
				action1: new Action('alias:action1', {}, '', false, jest.fn()),
				action2: new Action('alias:action2', {}, '', false, jest.fn()),
			};
			const expectedActions = Object.keys(actions).map(
				actionName => `${moduleAlias}:${actionName}`,
			);

			await bus.registerChannel(moduleAlias, [], actions, channelOptions);

			// Act
			const registeredActions = bus.getActions();

			// Assert
			expect(registeredActions).toEqual(expectedActions);
		});
	});

	describe('#getEvents', () => {
		it('should return the registered events.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event2'];
			const expectedEvents = events.map(event => `${moduleAlias}:${event}`);

			await bus.registerChannel(moduleAlias, events, {}, channelOptions);

			// Act
			const registeredEvent = bus.getEvents();

			// Assert
			expect(registeredEvent).toEqual(expectedEvents);
		});
	});
});
