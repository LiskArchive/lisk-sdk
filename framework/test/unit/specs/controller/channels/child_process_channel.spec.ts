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
jest.mock('pm2-axon-rpc', () => ({
	Client: jest.fn(() => ({
		call: jest.fn(),
	})),
	Server: jest.fn(() => ({
		expose: jest.fn(),
	})),
}));
jest.mock('pm2-axon');

// eslint-disable-next-line import/first
import { EventEmitter2 } from 'eventemitter2';
// eslint-disable-next-line import/first
import {
	ChildProcessChannel,
	BaseChannel,
} from '../../../../../src/controller/channels';
// eslint-disable-next-line import/first
import { Event } from '../../../../../src/controller/event';
// eslint-disable-next-line import/first
import { Action } from '../../../../../src/controller/action';

describe('ChildProcessChannel Channel', () => {
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
	const socketsPath = {
		root: 'root',
		sub: 'sub',
		pub: 'pub',
		rpc: 'rpc',
	};

	let childProcessChannel: ChildProcessChannel;
	let spies: any;

	beforeEach(() => {
		childProcessChannel = new ChildProcessChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options,
		);

		spies = {
			setupSockets: jest
				.spyOn(childProcessChannel, 'setupSockets')
				.mockResolvedValue(),
		};
	});

	afterEach(() => {
		childProcessChannel.cleanup();
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(ChildProcessChannel.prototype).toBeInstanceOf(BaseChannel);
		});
	});

	describe('#constructor', () => {
		it('should create a local bus based on EventEmitter2', () => {
			// Assert
			expect(childProcessChannel.localBus).toBeInstanceOf(EventEmitter2);
		});
	});

	describe('#registerToBus', () => {
		beforeEach(async () => childProcessChannel.registerToBus(socketsPath));

		it('should connect pubSocket', () => {
			// Assert
			expect(childProcessChannel.pubSocket?.connect).toHaveBeenCalledWith(
				socketsPath.sub,
			);
		});

		it('should connect subSocket', () => {
			// Assert
			expect(childProcessChannel.subSocket?.connect).toHaveBeenCalledWith(
				socketsPath.pub,
			);
		});

		it('should connect busRpcSocket', () => {
			// Assert
			expect(childProcessChannel.busRpcSocket?.connect).toHaveBeenCalledWith(
				socketsPath.rpc,
			);
		});

		it('should expose "invoke" event on rpcServer and call this.invoke with action', () => {
			// Assert
			expect(childProcessChannel.rpcServer?.expose).toHaveBeenCalledWith(
				'invoke',
				expect.any(Function),
			);
		});

		it('should bind the rpcSocket to rpcSocketPath', () => {
			// Assert
			expect(childProcessChannel.rpcSocket?.bind).toHaveBeenCalledWith(
				childProcessChannel.rpcSocketPath,
			);
		});

		it('should call setupSockets', () => {
			// Assert
			expect(spies.setupSockets).toHaveBeenCalledTimes(1);
		});
	});

	describe('#subscribe', () => {
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should call localBus.on when the module is the same', () => {
			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			childProcessChannel.subscribe(validEventName, () => {});
			// Assert
			expect(childProcessChannel.localBus.on).toHaveBeenCalledWith(
				validEventName,
				expect.any(Function),
			);
		});

		it('should call subSocket.on when the module is not the same', () => {
			// Arrange
			const invalidEventName = 'invalidModule:anEventName';

			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			childProcessChannel.subscribe(invalidEventName, () => {});

			// Assert
			expect(childProcessChannel.subSocket?.on).toHaveBeenCalledWith(
				invalidEventName,
				expect.any(Function),
			);
		});
	});

	describe('#once', () => {
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;

		beforeEach(async () => childProcessChannel.registerToBus(socketsPath));

		it('should call localBus.once when the module is the same', () => {
			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			childProcessChannel.once(validEventName, () => {});
			// Assert
			expect(childProcessChannel.localBus.once).toHaveBeenCalledWith(
				validEventName,
				expect.any(Function),
			);
		});

		it('should call subSocket.on when the module is not the same', () => {
			// Arrange
			const invalidEventName = 'invalidModule:anEventName';

			// Act
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			childProcessChannel.once(invalidEventName, () => {});

			// Assert
			expect(childProcessChannel.subSocket?.on).toHaveBeenCalledWith(
				invalidEventName,
				expect.any(Function),
			);
		});
	});

	describe('#publish', () => {
		const validEventName = `${params.moduleAlias}:${params.events[0]}`;
		const invalidEventName = 'invalidModule:anEventName';

		beforeEach(async () => {
			// Arrange
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should throw new Error when the module is not the same', () => {
			expect(() =>
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				childProcessChannel.publish(invalidEventName, () => {}),
			).toThrow(
				`Event "${invalidEventName}" not registered in "${params.moduleAlias}" module.`,
			);
		});

		it('should call localBus.emit with proper arguments', () => {
			// Arrange
			const data = { data: '#DATA' };
			const event = new Event(validEventName, data);

			// Act
			childProcessChannel.publish(validEventName, data);

			// Assert
			expect(childProcessChannel.localBus.emit).toHaveBeenCalledWith(
				event.key(),
				event.serialize(),
			);
		});

		it('should call pubSocket.emit with proper arguments', () => {
			// Arrange
			const data = { data: '#DATA' };
			const event = new Event(validEventName, data);

			// Act
			childProcessChannel.publish(validEventName, data);

			// Assert
			expect(childProcessChannel.pubSocket?.emit).toHaveBeenCalledWith(
				event.key(),
				event.serialize(),
			);
		});

		it('should not call pubSocket.emit when eventList is empty', async () => {
			// Arrange
			const data = { data: '#DATA' };
			const anotherChildProcessChannel = new ChildProcessChannel(
				params.moduleAlias,
				[],
				params.actions,
				{ skipInternalEvents: true },
			);

			jest
				.spyOn(anotherChildProcessChannel, 'setupSockets')
				.mockResolvedValue();

			// Act
			await anotherChildProcessChannel.registerToBus(socketsPath);
			anotherChildProcessChannel.publish(validEventName, data);

			// Assert
			expect(anotherChildProcessChannel.pubSocket).toBeUndefined();
		});
	});

	describe('#invoke', () => {
		const actionName = 'moduleAlias:action1';
		const actionParams = ['param1', 'param2'];

		it('should execute the action straight away if the modules are the same and action is a string', async () => {
			// Act
			await childProcessChannel.registerToBus(socketsPath);
			await childProcessChannel.invoke(actionName, actionParams);

			// Assert
			expect(params.actions.action1.handler).toHaveBeenCalled();
		});

		it('should execute the action straight away if the modules are the same and action is an Action object', async () => {
			// Act
			await childProcessChannel.registerToBus(socketsPath);
			const action = new Action(actionName, actionParams);
			await childProcessChannel.invoke(action.key(), actionParams);

			// Assert
			expect(params.actions.action1.handler).toHaveBeenCalledWith({
				...action.serialize(),
				source: childProcessChannel.moduleAlias,
			});
		});
	});

	describe('#cleanup', () => {
		it('should close the rpcSocket if rpcSocket is not undefined and it has been correctly initialized', async () => {
			// Arrange
			await childProcessChannel.registerToBus(socketsPath);

			// Act
			childProcessChannel.cleanup();

			// Assert
			expect(childProcessChannel.rpcSocket?.close).toHaveBeenCalled();
		});
	});

	describe('#_resolveWhenAllSocketsBound', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			(childProcessChannel as any)._resolveWhenAllSocketsBound();
		});

		it('should call pubSocket.sock.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.pubSocket?.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function),
			);
		});

		it('should call subSocket.sock.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.subSocket?.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function),
			);
		});

		it('should call rpcSocket.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.rpcSocket?.once).toHaveBeenCalledWith(
				'bind',
				expect.any(Function),
			);
		});

		it('should call busRpcSocket.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.busRpcSocket?.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function),
			);
		});

		it('should call busRpcClient.call with proper arguments when busRpcSocket receives a "connect" event', () => {
			// Assert
			expect(childProcessChannel.busRpcClient?.call).toHaveBeenCalledWith(
				'registerChannel',
				childProcessChannel.moduleAlias,
				childProcessChannel.eventsList,
				childProcessChannel.actionsList,
				{ type: 'ipcSocket', rpcSocketPath: childProcessChannel.rpcSocketPath },
				expect.any(Function),
			);
		});
	});

	describe('#_rejectWhenAnySocketFailsToBind', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should reject if any of the sockets receive an "error" event', async () => {
			// Assert
			await expect(
				(childProcessChannel as any)._rejectWhenAnySocketFailsToBind(),
			).rejects.toBe('#MOCKED_ONCE');
		});

		it('should call pubSocket.sock.once with proper arguments', async () => {
			// Act && Assert
			await expect(
				(childProcessChannel as any)._rejectWhenAnySocketFailsToBind(),
			).toReject();

			expect(childProcessChannel.pubSocket?.sock.once).toHaveBeenCalledWith(
				'error',
				expect.any(Function),
			);
		});

		it('should call subSocket.sock.once with proper arguments', async () => {
			// Act && Assert
			await expect(
				(childProcessChannel as any)._rejectWhenAnySocketFailsToBind(),
			).toReject();

			expect(childProcessChannel.subSocket?.sock.once).toHaveBeenCalledWith(
				'error',
				expect.any(Function),
			);
		});

		it('should call rpcSocket.once with proper arguments', async () => {
			// Act && Assert
			await expect(
				(childProcessChannel as any)._rejectWhenAnySocketFailsToBind(),
			).toReject();

			expect(childProcessChannel.rpcSocket?.sock.once).toHaveBeenCalledWith(
				'error',
				expect.any(Function),
			);
		});
	});

	describe('#_rejectWhenTimeout', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should reject with an Error object with proper message', async () => {
			// Assert
			await expect(
				(childProcessChannel as any)._rejectWhenTimeout(1),
			).rejects.toThrow('ChildProcessChannel sockets setup timeout');
		});
	});

	describe('#_removeAllListeners', () => {
		beforeEach(async () => {
			// Arrange
			await childProcessChannel.registerToBus(socketsPath);

			// Act
			(childProcessChannel as any)._removeAllListeners();
		});

		it('should remove all listeners on subSocket ', () => {
			// Assert
			expect(
				childProcessChannel.subSocket?.sock.removeAllListeners,
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.subSocket?.sock.removeAllListeners,
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on pubSocket', () => {
			// Assert
			expect(
				childProcessChannel.pubSocket?.sock.removeAllListeners,
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.pubSocket?.sock.removeAllListeners,
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on busRpcSocket', () => {
			// Assert
			expect(
				childProcessChannel.busRpcSocket?.removeAllListeners,
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.busRpcSocket?.removeAllListeners,
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on rpcSocket', () => {
			// Assert
			expect(
				childProcessChannel.rpcSocket?.removeAllListeners,
			).toHaveBeenCalledWith('bind');
			expect(
				childProcessChannel.rpcSocket?.removeAllListeners,
			).toHaveBeenCalledWith('error');
		});
	});
});
