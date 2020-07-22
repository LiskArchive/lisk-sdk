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
import { IPCClient } from '../../../../../src/controller/ipc/ipc_client';
import { IPCChannel, BaseChannel } from '../../../../../src/controller/channels';
import { Event } from '../../../../../src/controller/event';
import { Action } from '../../../../../src/controller/action';

const getMockedCallback = (error: unknown, result: unknown) =>
	jest.fn().mockImplementation((...args) => {
		args[args.length - 1](error, result);
	});

const ipcClientMock = {
	stop: jest.fn(),
	start: jest.fn(),
	rpcClient: {
		call: getMockedCallback(undefined, true),
	},
	rpcServer: {
		expose: jest.fn().mockImplementation((_name, cb) => {
			cb(
				{
					handler: jest.fn(),
					module: 'moduleAlias',
					name: 'action1',
				},
				jest.fn(),
			);
		}),
	},
	subSocket: {
		on: getMockedCallback('message', getMockedCallback(undefined, true)),
	},
	pubSocket: {
		send: jest.fn(),
	},
};

jest.mock('../../../../../src/controller/ipc/ipc_client', () => {
	return {
		IPCClient: jest.fn().mockImplementation(() => {
			return ipcClientMock;
		}),
	};
});

const emitterMock = {
	on: jest.fn(),
	once: jest.fn(),
	emit: jest.fn(),
};

jest.mock('eventemitter2', () => {
	return {
		EventEmitter2: jest.fn().mockImplementation(() => {
			return emitterMock;
		}),
	};
});

describe('IPCChannel Channel', () => {
	// Arrange
	const socketsPath = {
		root: 'root',
		sub: 'sub',
		pub: 'pub',
		rpc: 'rpc',
	};

	const params = {
		moduleAlias: 'moduleAlias',
		events: ['event1', 'event2'],
		actions: {
			action1: {
				handler: jest.fn(),
			},
			action2: {
				handler: jest.fn(),
			},
			action3: {
				handler: jest.fn(),
			},
		},
		options: {
			socketsPath,
		},
	};

	const actionsInfo = {
		action1: {
			name: 'action1',
			module: 'moduleAlias',
		},
		action2: {
			name: 'action2',
			module: 'moduleAlias',
		},
		action3: {
			name: 'action3',
			module: 'moduleAlias',
		},
	};

	let ipcChannel: IPCChannel;

	beforeEach(() => {
		ipcChannel = new IPCChannel(params.moduleAlias, params.events, params.actions, params.options);
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
				params.moduleAlias,
				[...params.events, 'registeredToBus', 'loading:started', 'loading:finished'],
				actionsInfo,
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
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;
		beforeEach(async () => {
			await ipcChannel.registerToBus();
		});

		it('should call _emitter.on', () => {
			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			ipcChannel.subscribe(validEventName, () => {});
			// Assert
			expect(emitterMock.on).toHaveBeenCalledWith(validEventName, expect.any(Function));
		});
	});

	describe('#once', () => {
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;

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
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;

		beforeEach(async () => {
			// Arrange
			await ipcChannel.registerToBus();
		});

		it('should throw new Error when the module is not the same', () => {
			const invalidEventName = `invalidModule:${params.events[0]}`;

			expect(() => ipcChannel.publish(invalidEventName, () => {})).toThrow(
				`Event "${invalidEventName}" not registered in "${params.moduleAlias}" module.`,
			);
		});

		it('should throw new Error when the event name not registered', () => {
			const invalidEventName = `${params.moduleAlias}:invalidEvent`;

			expect(() => ipcChannel.publish(invalidEventName, () => {})).toThrow(
				`Event "${invalidEventName}" not registered in "${params.moduleAlias}" module.`,
			);
		});

		it('should call pubSocket.send with proper arguments', () => {
			// Arrange
			const data = { data: '#DATA' };
			const event = new Event(validEventName, data);

			// Act
			ipcChannel.publish(validEventName, data);

			// Assert
			expect(ipcClientMock.pubSocket.send).toHaveBeenCalledWith(event.key(), event.serialize());
		});
	});

	describe('#invoke', () => {
		const actionName = 'moduleAlias:action1';
		const actionParams = ['param1', 'param2'];

		it('should execute the action straight away if the plugins are the same and action is a string', async () => {
			// Act
			await ipcChannel.registerToBus();
			await ipcChannel.invoke(actionName, actionParams);

			// Assert
			expect(params.actions.action1.handler).toHaveBeenCalled();
		});

		it('should execute the action straight away if the plugins are the same and action is an Action object', async () => {
			// Act
			await ipcChannel.registerToBus();
			const action = new Action(actionName, actionParams);
			await ipcChannel.invoke(action.key(), actionParams);

			// Assert
			expect(params.actions.action1.handler).toHaveBeenCalledWith({
				...action.serialize(),
				source: ipcChannel.moduleAlias,
			});
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

		it('should clear process events', async () => {
			// Arrange
			jest.spyOn(process, 'removeAllListeners');
			await ipcChannel.registerToBus();

			// Act
			ipcChannel.cleanup();

			// Assert
			expect(ipcClientMock.stop).toHaveBeenCalled();
			expect(process.removeAllListeners).toHaveBeenCalledWith('SIGTERM');
			expect(process.removeAllListeners).toHaveBeenCalledWith('SIGINT');
			expect(process.removeAllListeners).toHaveBeenCalledWith('exit');
		});
	});
});
