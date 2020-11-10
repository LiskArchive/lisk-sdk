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

// eslint-disable-next-line import/first
import { EventEmitter2 } from 'eventemitter2';
// eslint-disable-next-line import/first
import { Bus } from '../../../src/controller/bus';
// eslint-disable-next-line import/first
import { Action } from '../../../src/controller/action';
// eslint-disable-next-line import/first
import { WSServer } from '../../../src/controller/ws/ws_server';
import { IPCServer } from '../../../src/controller/ipc/ipc_server';

jest.mock('eventemitter2');
jest.mock('pm2-axon');
jest.mock('pm2-axon-rpc');
jest.mock('ws');

describe('Bus', () => {
	const config: any = {
		ipc: {
			enabled: false,
		},
		socketsPath: {
			root: '',
		},
		rpc: {
			enable: true,
			mode: 'ws',
			port: 8080,
		},
	};

	const channelMock: any = {};

	const channelOptions = {
		type: 'inMemory',
		channel: channelMock,
	};

	const loggerMock: any = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};

	let bus: Bus;

	beforeEach(() => {
		bus = new Bus(loggerMock, config);
	});

	afterEach(async () => {
		if (bus) {
			await bus.cleanup();
		}
	});

	describe('#constructor', () => {
		it('should create the Bus instance with given arguments.', () => {
			// Assert
			expect(bus['actions']).toEqual({});
			expect(bus['events']).toEqual({});
			expect(bus['_ipcServer']).toBeInstanceOf(IPCServer);
			expect(bus['_wsServer']).toBeInstanceOf(WSServer);
		});
	});

	describe('#setup', () => {
		beforeEach(() => {
			jest.spyOn(IPCServer.prototype, 'start');
			jest.spyOn(WSServer.prototype, 'start');
		});

		it('should resolve with true.', async () => {
			return expect(bus.setup()).resolves.toBe(true);
		});

		// TODO: Should be tested in integration tests as the mock is complex to handle here
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should setup ipc server if ipc is enabled', async () => {
			// Arrange
			const updatedConfig = { ...config };
			updatedConfig.ipc.enabled = true;
			bus = new Bus(loggerMock, updatedConfig);

			// Act
			await bus.setup();

			// Assert
			return expect(IPCServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should not setup ipc server if ipc is not enabled', async () => {
			// Arrange
			const updatedConfig = { ...config };
			updatedConfig.ipc.enabled = false;
			bus = new Bus(loggerMock, updatedConfig);

			// Act
			await bus.setup();

			// Assert
			return expect(IPCServer.prototype.start).not.toHaveBeenCalled();
		});

		it('should setup ws server if rpc is enabled', async () => {
			// Arrange
			const updatedConfig = { ...config };
			updatedConfig.rpc.enable = true;
			bus = new Bus(loggerMock, updatedConfig);

			// Act
			await bus.setup();

			// Assert
			return expect(WSServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should not setup ws server if rpc is not enabled', async () => {
			// Arrange
			const updatedConfig = { ...config };
			updatedConfig.rpc.enable = false;
			bus = new Bus(loggerMock, updatedConfig);

			// Act
			await bus.setup();

			// Assert
			return expect(WSServer.prototype.start).not.toHaveBeenCalled();
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
			await expect(bus.registerChannel(moduleAlias, events, {}, channelOptions)).rejects.toThrow(
				Error,
			);
		});

		it('should register actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions: any = {
				action1: new Action(null, 'alias:action1', {}, '', jest.fn()),
				action2: new Action(null, 'alias:action2', {}, '', jest.fn()),
			};

			// Act
			await bus.registerChannel(moduleAlias, [], actions, channelOptions);

			// Assert
			expect(Object.keys(bus['actions'])).toHaveLength(2);
			Object.keys(actions).forEach(actionName => {
				expect(bus['actions'][`${moduleAlias}:${actionName}`]).toBe(actions[actionName]);
			});
		});

		it('should throw error when trying to register duplicate actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = {
				action1: new Action(null, 'alias:action1', {}, '', jest.fn()),
			};

			// Act && Assert
			await bus.registerChannel(moduleAlias, [], actions, channelOptions);
			await expect(bus.registerChannel(moduleAlias, [], actions, channelOptions)).rejects.toThrow(
				Error,
			);
		});
	});

	describe('#invoke', () => {
		it.todo('should invoke controller channel action.');
		it.todo('should invoke module channel action.');

		it('should throw error if action was not registered', async () => {
			// Arrange
			const jsonrpcRequest = {
				id: 1,
				jsonrpc: '2.0',
				method: 'app:nonExistentAction',
			};
			const action = Action.fromJSONRPCRequest(jsonrpcRequest);

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest)).rejects.toThrow(
				`Action '${action.module}:${action.name}' is not registered to bus.`,
			);
		});

		it('should throw error if module does not exist', async () => {
			// Arrange
			const jsonrpcRequest = {
				id: 1,
				jsonrpc: '2.0',
				method: 'invalidModule:getComponentConfig',
			};
			const action = Action.fromJSONRPCRequest(jsonrpcRequest);

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest)).rejects.toThrow(
				`Action '${action.module}:${action.name}' is not registered to bus.`,
			);
		});
	});

	describe('#publish', () => {
		it("should call eventemitter2 library's emit method", async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['registeredEvent'];
			const eventName = `${moduleAlias}:${events[0]}`;
			const eventData = { data: '#DATA' };
			const JSONRPCData = { jsonrpc: '2.0', method: 'alias:registeredEvent', params: eventData };

			await bus.registerChannel(moduleAlias, events, {}, channelOptions);

			// Act
			bus.publish(JSONRPCData);

			// Assert
			expect(EventEmitter2.prototype.emit).toHaveBeenCalledWith(eventName, JSONRPCData);
		});
	});

	describe('#getActions', () => {
		it('should return the registered actions', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions: any = {
				action1: new Action(null, 'alias:action1', {}, '', jest.fn()),
				action2: new Action(null, 'alias:action2', {}, '', jest.fn()),
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
