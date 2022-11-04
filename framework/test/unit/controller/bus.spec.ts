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

import { EventEmitter2 } from 'eventemitter2';
import * as fs from 'fs-extra';
import { Bus } from '../../../src/controller/bus';
import { Request } from '../../../src/controller/request';
import { IPCServer } from '../../../src/controller/ipc/ipc_server';
import { EndpointInfo } from '../../../src';

jest.mock('ws');
jest.mock('eventemitter2');
jest.mock('zeromq', () => {
	return {
		Publisher: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Subscriber: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Router: jest.fn().mockReturnValue({ bind: jest.fn(), close: jest.fn() }),
	};
});

describe('Bus', () => {
	const channelMock: any = {};
	const chainID = Buffer.from('10000000', 'hex');

	const channelOptions = {
		type: 'inMemory',
		channel: channelMock,
	};

	const loggerMock: any = {
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};

	const busConfig = {
		internalIPCServer: new IPCServer({ socketsDir: '/unit/bus', name: 'bus' }),
		chainID,
	};

	let bus: Bus;

	beforeEach(async () => {
		jest.spyOn(fs, 'ensureDirSync').mockReturnValue();
		bus = new Bus(busConfig);
		await bus.start(loggerMock);
	});

	afterEach(async () => {
		await bus.cleanup();
	});

	describe('#constructor', () => {
		it('should create the Bus instance with given arguments.', () => {
			// Assert
			expect(bus['_endpointInfos']).toEqual({});
			expect(bus['_events']).toEqual({});
		});
	});

	describe('#start', () => {
		it('should resolve with true.', async () => {
			return expect(bus.start(loggerMock)).resolves.toBeUndefined();
		});

		it('should setup ipc server if rpc is enabled', async () => {
			// Arrange
			bus = new Bus({ ...busConfig });
			jest.spyOn(bus['_internalIPCServer'], 'start');
			(bus['_internalIPCServer'].start as jest.Mock).mockReset();
			// Act
			await bus.start(loggerMock);

			// Assert
			return expect(bus['_internalIPCServer']?.start).toHaveBeenCalledTimes(1);
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
			expect(Object.keys(bus['_events'])).toHaveLength(2);
			events.forEach(eventName => {
				expect(bus['_events'][`${moduleName}_${eventName}`]).toBe(true);
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
			const endpointInfo: { [key: string]: EndpointInfo } = {
				action1: {
					namespace: 'name',
					method: 'action1',
				},
				action2: {
					namespace: 'name',
					method: 'action2',
				},
			};

			// Act
			await bus.registerChannel(moduleName, [], endpointInfo, channelOptions);

			// Assert
			expect(Object.keys(bus['_endpointInfos'])).toHaveLength(2);
			Object.keys(endpointInfo).forEach(actionName => {
				expect(bus['_endpointInfos'][`${moduleName}_${actionName}`]).toBe(endpointInfo[actionName]);
			});
		});

		it('should throw error when trying to register duplicate actions.', async () => {
			// Arrange
			const moduleName = 'name';
			const endpointInfo: { [key: string]: EndpointInfo } = {
				action1: {
					namespace: 'name',
					method: 'action1',
				},
			};

			// Act && Assert
			await bus.registerChannel(moduleName, [], endpointInfo, channelOptions);
			await expect(
				bus.registerChannel(moduleName, [], endpointInfo, channelOptions),
			).rejects.toThrow();
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
				method: 'app_nonExistentRequest',
			};
			const action = Request.fromJSONRPCRequest(jsonrpcRequest);

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest)).rejects.toThrow(
				`Request '${action.namespace}_${action.name}' is not registered to bus.`,
			);
		});

		it('should throw error if module does not exist', async () => {
			// Arrange
			const jsonrpcRequest = {
				id: 1,
				jsonrpc: '2.0',
				method: 'invalidModule_getComponentConfig',
			};
			const action = Request.fromJSONRPCRequest(jsonrpcRequest);

			// Act && Assert
			await expect(bus.invoke(jsonrpcRequest)).rejects.toThrow(
				`Request '${action.namespace}_${action.name}' is not registered to bus.`,
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
			const eventName = `${moduleName}_${events[0]}`;
			const eventData = { data: '#DATA' };
			const JSONRPCData = { jsonrpc: '2.0', method: 'name_registeredEvent', params: eventData };
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
				method: 'module_event',
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

	describe('#getRequests', () => {
		it('should return the registered actions', async () => {
			// Arrange
			const moduleName = 'name';
			const endpointInfo: { [key: string]: EndpointInfo } = {
				action1: {
					namespace: 'name',
					method: 'action1',
				},
				action2: {
					namespace: 'name',
					method: 'action2',
				},
			};
			const expectedRequests = Object.keys(endpointInfo).map(
				actionName => `${moduleName}_${actionName}`,
			);

			await bus.registerChannel(moduleName, [], endpointInfo, channelOptions);

			// Act
			const registeredRequests = bus.getEndpoints();

			// Assert
			expect(registeredRequests).toEqual(expectedRequests);
		});
	});

	describe('#getEvents', () => {
		it('should return the registered events.', async () => {
			// Arrange
			const moduleName = 'name';
			const events = ['event1', 'event2'];
			const expectedEvents = events.map(event => `${moduleName}_${event}`);

			await bus.registerChannel(moduleName, events, {}, channelOptions);

			// Act
			const registeredEvent = bus.getEvents();

			// Assert
			expect(registeredEvent).toEqual(expectedEvents);
		});
	});
});
