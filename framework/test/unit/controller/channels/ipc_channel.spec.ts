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
import { IPCClient } from '../../../../src/controller/ipc/ipc_client';
import { IPCChannel, BaseChannel } from '../../../../src/controller/channels';
import { Event } from '../../../../src/controller/event';
import { fakeLogger } from '../../../utils/mocks';
import { Request } from '../../../../src/controller/request';

const getMockedCallback = (error: unknown, result: unknown) =>
	jest.fn().mockImplementation((...args) => {
		args[args.length - 1](error, result);
	});

// Need to keep this here as jest mock requires it
const emitterMock = {
	on: jest.fn(),
	once: jest.fn(),
	emit: jest.fn(),
};
const jsonrpcRequest = { id: 1, jsonrpc: '2.0', method: 'namespace_action1' };

const ipcClientMock = {
	stop: jest.fn(),
	start: jest.fn(),
	rpcClient: {
		call: getMockedCallback(undefined, true),
	},
	rpcServer: {
		expose: jest.fn().mockImplementation((_name, cb) => {
			cb(jsonrpcRequest, jest.fn());
		}),
	},
	subSocket: {
		on: getMockedCallback({ jsonrpc: '2.0', method: 'module_event', params: {} }, {}),
	},
	pubSocket: {
		send: jest.fn(),
	},
};

jest.mock('../../../../src/controller/ipc/ipc_client', () => {
	return {
		IPCClient: jest.fn().mockImplementation(() => {
			return ipcClientMock;
		}),
	};
});

jest.mock('eventemitter2', () => {
	return {
		EventEmitter2: jest.fn().mockImplementation(() => {
			return emitterMock;
		}),
	};
});

// FIXME: Update with zeroMQ mocking
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('IPCChannel Channel', () => {
	// Arrange

	const params = {
		namespace: 'namespace',
		logger: fakeLogger,
		events: ['event1', 'event2'],
		endpoints: {
			action1: jest.fn(),
			action2: jest.fn(),
			action3: jest.fn(),
		},
		options: {
			socketsPath: 'socketPath',
		},
	};

	const endpointsInfo = {
		action1: {
			methodName: 'action1',
			namespace: 'namespace',
		},
		action2: {
			methodName: 'action2',
			namespace: 'namespace',
		},
		action3: {
			methodName: 'action3',
			namespace: 'namespace',
		},
	};

	let ipcChannel: IPCChannel;

	beforeEach(() => {
		ipcChannel = new IPCChannel(
			params.logger,
			params.namespace,
			params.events,
			params.endpoints,
			params.options,
		);
	});

	afterEach(() => {
		ipcChannel.cleanup();
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(IPCChannel.prototype).toBeInstanceOf(BaseChannel);
		});
	});

	describe('#constructor', () => {
		it('should create a local bus based on EventEmitter2', () => {
			// Assert
			expect(EventEmitter2).toHaveBeenCalledTimes(1);
			expect(IPCClient).toHaveBeenCalledTimes(1);
		});
	});

	describe('#startAndListen', () => {
		beforeEach(async () => ipcChannel.startAndListen());

		it('should start ipc client', () => {
			// Assert
			expect(ipcClientMock.start).toHaveBeenCalledTimes(1);
		});

		it('should register "message" event on subSocket', () => {
			// Assert
			expect(ipcClientMock.subSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
		});
	});

	describe('#registerToBus', () => {
		beforeEach(async () => ipcChannel.registerToBus());

		it('should start ipc client', () => {
			// Assert
			expect(ipcClientMock.start).toHaveBeenCalledTimes(1);
		});

		it('should invoke "registerChannel" on rpc client', () => {
			// Assert
			expect(ipcClientMock.rpcClient.call).toHaveBeenCalledWith(
				'registerChannel',
				params.namespace,
				[...params.events],
				endpointsInfo,
				{
					rpcSocketPath: undefined,
					type: 'ipcSocket',
				},
				expect.any(Function),
			);
		});

		it('should expose "invoke" event on rpcServer', () => {
			// Assert
			expect(ipcClientMock.rpcServer.expose).toHaveBeenCalledWith('invoke', expect.any(Function));
		});

		it('should register "message" event on subSocket', () => {
			// Assert
			expect(ipcClientMock.subSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
		});
	});

	describe('#subscribe', () => {
		const validEventName = `${params.namespace}_${params.events[0]}`;
		beforeEach(async () => ipcChannel.registerToBus());

		it('should call _emitter.on', () => {
			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			ipcChannel.subscribe(validEventName, () => {});
			// Assert
			expect(emitterMock.on).toHaveBeenCalledWith(validEventName, expect.any(Function));
		});
	});

	describe('#once', () => {
		const validEventName = `${params.namespace}_${params.events[0]}`;

		beforeEach(async () => ipcChannel.registerToBus());

		it('should call _emitter.once', () => {
			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			ipcChannel.once(validEventName, () => {});

			// Assert
			expect(emitterMock.once).toHaveBeenCalledWith(validEventName, expect.any(Function));
		});
	});

	describe('#publish', () => {
		const validEventName = `${params.namespace}_${params.events[0]}`;

		beforeEach(async () => ipcChannel.registerToBus());

		it('should throw new Error when the module is not the same', () => {
			const invalidEventName = `invalidModule_${params.events[0]}`;

			expect(() => ipcChannel.publish(invalidEventName, {})).toThrow(
				`Event "${invalidEventName}" not registered in "${params.namespace}" module.`,
			);
		});

		it('should throw new Error when the event name not registered', () => {
			const invalidEventName = `${params.namespace}:invalidEvent`;

			expect(() => ipcChannel.publish(invalidEventName, {})).toThrow(
				`Event "${invalidEventName}" not registered in "${params.namespace}" module.`,
			);
		});

		it('should call pubSocket.send with proper arguments', () => {
			// Arrange
			const data = { data: '#DATA' };
			const event = new Event(validEventName, data);

			// Act
			ipcChannel.publish(validEventName, data);

			// Assert
			expect(ipcClientMock.pubSocket.send).toHaveBeenCalledWith(event.toJSONRPCNotification());
		});
	});

	describe('#invoke', () => {
		const actionName = 'namespace_action1';
		const actionParams = { myParams: ['param1', 'param2'] };

		it('should execute the action straight away if the plugins are the same and action is a string', async () => {
			// Act
			await ipcChannel.registerToBus();
			await ipcChannel.invoke({
				context: {},
				methodName: actionName,
				params: actionParams,
			});

			// Assert
			expect(params.endpoints.action1).toHaveBeenCalled();
		});

		it('should execute the action straight away if the plugins are the same and action is an Action object', async () => {
			// Act
			await ipcChannel.registerToBus();
			const action = new Request(null, actionName, actionParams);
			await ipcChannel.invoke({
				context: {},
				methodName: action.key(),
				params: actionParams,
			});

			// Assert
			expect(params.endpoints.action1).toHaveBeenCalledWith(action.params);
		});
	});

	describe('#cleanup', () => {
		it('should stop the ipc client', async () => {
			// Arrange
			await ipcChannel.registerToBus();

			// Act
			ipcChannel.cleanup();

			// Assert
			expect(ipcClientMock.stop).toHaveBeenCalled();
		});
	});
});
