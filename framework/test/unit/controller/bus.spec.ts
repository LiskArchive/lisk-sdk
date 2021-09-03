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
jest.mock('zeromq');
jest.mock('../../../src/controller/ws/ws_server');
jest.mock('../../../src/controller/ipc/ipc_server');

describe('Bus', () => {
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

	const busConfig = { internalIPCServer: new IPCServer({ socketsDir: '/unit/bus', name: 'bus' }) };

	let bus: Bus;

	beforeEach(() => {
		bus = new Bus(loggerMock, busConfig);
	});

	afterEach(async () => {
		if (bus) {
			await bus.cleanup();
		}
		(IPCServer as any).mockClear();
	});

	describe('#constructor', () => {
		it('should create the Bus instance with given arguments.', () => {
			// Assert
			expect(bus['actions']).toEqual({});
			expect(bus['events']).toEqual({});
			expect(bus['_wsServer']).toBeUndefined();
		});
	});

	describe('#setup', () => {
		it('should resolve with true.', async () => {
			return expect(bus.init()).resolves.toBe(true);
		});

		it('should setup ipc server if rpc is enabled', async () => {
			// Arrange
			bus = new Bus(loggerMock, busConfig);
			// Act
			await bus.init();

			// Assert
			return expect(IPCServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should setup only ws server if ws is only enabled', async () => {
			// Arrange

			bus = new Bus(loggerMock, {
				...busConfig,
				wsServer: new WSServer({ logger: loggerMock, path: '/ws', port: 5000 }),
			});

			// Act
			await bus.init();

			// Assert
			return expect(WSServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should not setup external ipc server if ipc mode is not enabled', async () => {
			// Arrange
			bus = new Bus(loggerMock, busConfig);

			// Act
			await bus.init();

			// Assert
			return expect(IPCServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should not setup ws server if rpc is not enabled', async () => {
			// Arrange
			bus = new Bus(loggerMock, busConfig);

			// Act
			await bus.init();

			// Assert
			return expect(WSServer.prototype.start).not.toHaveBeenCalled();
		});
	});

	describe('#registerChannel', () => {
		it('should register events.', async () => {
			// Arrange
			const moduleName = 'name';
			const events = ['event1', 'event2'];

			// Act
			await bus.registerChannel(moduleName, events, {}, channelOptions);

			// Assert
			expect(Object.keys(bus['events'])).toHaveLength(2);
			events.forEach(eventName => {
				expect(bus['events'][`${moduleName}:${eventName}`]).toBe(true);
			});
		});

		it('should throw error when trying to register duplicate events', async () => {
			// Arrange
			const moduleName = 'name';
			const events = ['event1', 'event1'];

			// Act && Assert
			await expect(bus.registerChannel(moduleName, events, {}, channelOptions)).rejects.toThrow(
				Error,
			);
		});

		it('should register actions.', async () => {
			// Arrange
			const moduleName = 'name';
			const actions: any = {
				action1: new Action(null, 'name:action1', {}, jest.fn()),
				action2: new Action(null, 'name:action2', {}, jest.fn()),
			};

			// Act
			await bus.registerChannel(moduleName, [], actions, channelOptions);

			// Assert
			expect(Object.keys(bus['actions'])).toHaveLength(2);
			Object.keys(actions).forEach(actionName => {
				expect(bus['actions'][`${moduleName}:${actionName}`]).toBe(actions[actionName]);
			});
		});

		it('should throw error when trying to register duplicate actions.', async () => {
			// Arrange
			const moduleName = 'name';
			const actions = {
				action1: new Action(null, 'name:action1', {}, jest.fn()),
			};

			// Act && Assert
			await bus.registerChannel(moduleName, [], actions, channelOptions);
			await expect(bus.registerChannel(moduleName, [], actions, channelOptions)).rejects.toThrow(
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

		it('should throw error if invoked without request', async () => {
			// Act && Assert
			await expect(bus.invoke(undefined as never)).rejects.toThrow('Invalid invoke request.');
		});

		it('should throw error if invoked with invalid json', async () => {
			// Act && Assert
			await expect(bus.invoke('\n')).rejects.toThrow('Invalid invoke request.');
		});

		it('should throw error if invoked with empty string', async () => {
			// Act && Assert
			await expect(bus.invoke('')).rejects.toThrow('Invalid invoke request.');
		});

		it('should throw error if invoked without method', async () => {
			// Arrange
			const jsonrpcRequest = {
				id: 1,
				jsonrpc: '2.0',
			};

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest as never)).rejects.toThrow('Invalid invoke request.');
		});

		it('should throw error if invoked without id', async () => {
			// Arrange
			const jsonrpcRequest = {
				jsonrpc: '2.0',
				method: 'module:action',
			};

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest as never)).rejects.toThrow('Invalid invoke request.');
		});
	});

	describe('#publish', () => {
		it("should call eventemitter2 library's emit method", async () => {
			// Arrange
			const moduleName = 'name';
			const events = ['registeredEvent'];
			const eventName = `${moduleName}:${events[0]}`;
			const eventData = { data: '#DATA' };
			const JSONRPCData = { jsonrpc: '2.0', method: 'name:registeredEvent', params: eventData };
			const mockIPCServer = {
				pubSocket: { send: jest.fn().mockResolvedValue(jest.fn()) },
				stop: jest.fn(),
			};
			(bus as any)['_internalIPCServer'] = mockIPCServer;
			await bus.registerChannel(moduleName, events, {}, channelOptions);

			// Act
			bus.publish(JSONRPCData);

			// Assert
			expect(EventEmitter2.prototype.emit).toHaveBeenCalledWith(eventName, JSONRPCData);
		});

		it('should throw error if called without notification', () => {
			// Act && Assert
			expect(() => bus.publish(undefined as never)).toThrow('Invalid publish request.');
		});

		it('should throw error if called with invalid json', () => {
			// Act && Assert
			expect(() => bus.publish('\n')).toThrow('Invalid publish request.');
		});

		it('should throw error if called with empty string', () => {
			// Act && Assert
			expect(() => bus.publish('')).toThrow('Invalid publish request.');
		});

		it('should throw error if called with id', () => {
			// Arrange
			const jsonrpcRequest = {
				id: 1,
				jsonrpc: '2.0',
				method: 'module:event',
			};

			// Act && Assert
			expect(() => bus.publish(jsonrpcRequest as never)).toThrow('Invalid publish request.');
		});

		it('should throw error if called without method', () => {
			// Arrange
			const jsonrpcRequest = {
				jsonrpc: '2.0',
			};

			// Act && Assert
			expect(() => bus.publish(jsonrpcRequest as never)).toThrow('Invalid publish request.');
		});
	});

	describe('#getActions', () => {
		it('should return the registered actions', async () => {
			// Arrange
			const moduleName = 'name';
			const actions: any = {
				action1: new Action(null, 'name:action1', {}, jest.fn()),
				action2: new Action(null, 'name:action2', {}, jest.fn()),
			};
			const expectedActions = Object.keys(actions).map(actionName => `${moduleName}:${actionName}`);

			await bus.registerChannel(moduleName, [], actions, channelOptions);

			// Act
			const registeredActions = bus.getActions();

			// Assert
			expect(registeredActions).toEqual(expectedActions);
		});
	});

	describe('#getEvents', () => {
		it('should return the registered events.', async () => {
			// Arrange
			const moduleName = 'name';
			const events = ['event1', 'event2'];
			const expectedEvents = events.map(event => `${moduleName}:${event}`);

			await bus.registerChannel(moduleName, events, {}, channelOptions);

			// Act
			const registeredEvent = bus.getEvents();

			// Assert
			expect(registeredEvent).toEqual(expectedEvents);
		});
	});
});
