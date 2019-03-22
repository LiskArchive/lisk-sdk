const axon = require('axon');
const axonRpc = require('axon-rpc');

jest.mock('eventemitter2');
jest.mock('../../../../../../src/controller/event', () =>
	jest.fn().mockImplementation(name => ({
		name,
		module: 'moduleAlias',
		key: () => 'aKey',
		serialize: () => 'serialized',
	}))
);

axonRpc.Client = function() {
	return {
		call: jest.fn(),
	};
};
axonRpc.Server = function() {
	return {
		expose: jest.fn(),
	};
};

const EventEmitter2 = require('eventemitter2');
const Event = require('../../../../../../src/controller/event');
const Action = require('../../../../../../src/controller/action');
const ChildProcessChannel = require('../../../../../../src/controller/channels/child_process_channel');
const BaseChannel = require('../../../../../../src/controller/channels/base_channel');

describe('ChildProcessChannel Channel', () => {
	const originalModuleAlias = 'moduleAlias';
	const params = {
		moduleAlias: originalModuleAlias,
		events: ['event1', 'event2'],
		actions: {
			action1: jest.fn(),
			action2: jest.fn(),
			action3: jest.fn(),
		},
		options: {},
	};
	let childProcessChannel;
	const socketsPath = {
		root: 'root',
		sub: 'sub',
		pub: 'pub',
		rpc: 'rpc',
	};

	let resolveWhenAllSocketsBound;
	let rejectWhenAnySocketFailsToBind;
	let rejectWhenTimeout;
	let removeAllListeners;

	beforeEach(() => {
		axon.socket = jest.fn().mockReturnValue({
			connect: jest.fn(),
			on: jest.fn(),
			once: jest.fn((event, callback) => {
				callback();
			}),
			bind: jest.fn(),
			emit: jest.fn(),
			sock: {
				once: jest.fn((event, callback) => {
					callback();
				}),
				on: jest.fn((event, callback) => {
					callback();
				}),
			},
		});

		childProcessChannel = new ChildProcessChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options
		);

		resolveWhenAllSocketsBound =
			childProcessChannel._resolveWhenAllSocketsBound;
		rejectWhenAnySocketFailsToBind =
			childProcessChannel._rejectWhenAnySocketFailsToBind;
		rejectWhenTimeout = childProcessChannel._rejectWhenTimeout;
		removeAllListeners = childProcessChannel._removeAllListeners;

		childProcessChannel._resolveWhenAllSocketsBound = jest.fn();
		childProcessChannel._rejectWhenAnySocketFailsToBind = jest.fn();
		childProcessChannel._rejectWhenTimeout = jest.fn();
		childProcessChannel._removeAllListeners = jest.fn();
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(Object.getPrototypeOf(childProcessChannel)).toBeInstanceOf(
				BaseChannel
			);
		});

		it('should call BaseChannel class constructor with arguments', () => {
			// Arrange
			let IsolatedChildProcessChannel;
			let IsolatedBaseChannel;

			jest.isolateModules(() => {
				jest.doMock('../../../../../../src/controller/channels/base_channel');
				IsolatedChildProcessChannel = require('../../../../../../src/controller/channels/child_process_channel');
				IsolatedBaseChannel = require('../../../../../../src/controller/channels/base_channel');
			});

			// Act
			childProcessChannel = new IsolatedChildProcessChannel(
				params.moduleAlias,
				params.events,
				params.actions,
				params.options
			);

			// Assert
			expect(IsolatedBaseChannel).toHaveBeenCalledWith(
				params.moduleAlias,
				params.events,
				params.actions,
				params.options
			);
		});
	});

	describe('#constructor', () => {
		it('should create a local bus based on EventEmitter2', () => {
			// Assert
			expect(childProcessChannel.localBus).toBeInstanceOf(EventEmitter2);
		});

		// TODO: Test process.once
	});

	describe('#registerToBus', () => {
		beforeEach(() => childProcessChannel.registerToBus(socketsPath));

		it('should connect pubSocket', async () => {
			// Assert
			expect(childProcessChannel.pubSocket.connect).toHaveBeenCalledWith(
				socketsPath.sub
			);
		});

		it('should connect subSocket', () => {
			// Assert
			expect(childProcessChannel.subSocket.connect).toHaveBeenCalledWith(
				socketsPath.pub
			);
		});

		it('should connect busRpcSocket', () => {
			// Assert
			expect(childProcessChannel.busRpcSocket.connect).toHaveBeenCalledWith(
				socketsPath.rpc
			);
		});

		it('should expose "invoke" event on rpcServer and call this.invoke with action', () => {
			expect(childProcessChannel.rpcServer.expose).toHaveBeenCalledWith(
				'invoke',
				expect.any(Function)
			);
			// TODO: Test callback
		});

		it('should bind the rpcSocket to rpcSocketPath', () => {
			expect(childProcessChannel.rpcSocket.bind).toHaveBeenCalledWith(
				childProcessChannel.rpcSocketPath
			);
		});

		it('should perform Promise.race with correct arguments', () => {
			expect(
				childProcessChannel._rejectWhenAnySocketFailsToBind
			).toHaveBeenCalled();
			expect(
				childProcessChannel._resolveWhenAllSocketsBound
			).toHaveBeenCalled();
			expect(childProcessChannel._rejectWhenTimeout).toHaveBeenCalled();
			expect(childProcessChannel._removeAllListeners).toHaveBeenCalled();
		});
	});

	describe('#subscribe', () => {
		const eventHandler = jest.fn();

		beforeEach(() => childProcessChannel.registerToBus(socketsPath));

		it('should instantiate a new Event with eventName', () => {
			const eventName = 'firstEvent';
			childProcessChannel.subscribe(eventName, eventHandler);
			expect(Event).toHaveBeenCalledWith(eventName);
		});

		it('should call localBus.on when the module is the same', async () => {
			const eventName = 'secondEvent';
			childProcessChannel.moduleAlias = originalModuleAlias;
			childProcessChannel.subscribe(eventName, eventHandler);
			expect(childProcessChannel.localBus.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			childProcessChannel.moduleAlias = 'differentModule';
			const eventName = 'thirdEvent';
			childProcessChannel.subscribe(eventName, eventHandler);
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});
	});

	describe('#once', () => {
		const eventHandler = jest.fn();

		beforeEach(() => childProcessChannel.registerToBus(socketsPath));

		it('should instantiate a new Event with eventName', () => {
			const eventName = 'firstEvent';
			childProcessChannel.once(eventName, eventHandler);
			expect(Event).toHaveBeenCalledWith(eventName);
		});

		it('should call localBus.once when the module is the same', async () => {
			const eventName = 'secondEvent';
			childProcessChannel.moduleAlias = originalModuleAlias;
			childProcessChannel.once(eventName, eventHandler);
			expect(childProcessChannel.localBus.once).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			childProcessChannel.moduleAlias = 'differentModule';
			const eventName = 'thirdEvent';
			childProcessChannel.once(eventName, eventHandler);
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});
	});

	describe('#publish', () => {
		const eventHandler = jest.fn();

		beforeEach(() => {
			childProcessChannel.moduleAlias = originalModuleAlias;
			return childProcessChannel.registerToBus(socketsPath);
		});

		it('should instantiate a new Event with eventName', () => {
			const eventName = 'firstEvent';
			childProcessChannel.publish(eventName, eventHandler);
			expect(Event).toHaveBeenCalledWith(eventName);
		});

		it('should call localBus.emit with proper arguments', async () => {
			const eventName = 'secondEvent';
			childProcessChannel.publish(eventName, eventHandler);
			expect(childProcessChannel.localBus.emit).toHaveBeenCalledWith(
				'aKey',
				'serialized'
			);
		});

		it('should call pubSocket.emit with proper arguments', async () => {
			const eventName = 'thirdEvent';
			childProcessChannel.publish(eventName, eventHandler);
			expect(childProcessChannel.pubSocket.emit).toHaveBeenCalledWith(
				'aKey',
				'serialized'
			);
		});

		it('should throw new Error when the module is not the same', async () => {
			childProcessChannel.moduleAlias = 'differentModule';
			const eventName = 'fourthEvent';
			try {
				childProcessChannel.publish(eventName, eventHandler);
			} catch (error) {
				expect(error.message).toBe(
					`Event "${eventName}" not registered in "differentModule" module.`
				);
			}
		});
	});

	describe('#invoke', () => {
		let ActionStub;
		const actionName = 'firstAction';
		const actionParams = ['param1', 'param2'];
		const actionSerializationResult = 'serialized';

		let IsolatedChildProcessChannel;
		let isolatedChildProcessChannelInstance;

		const busRpcClientCallResult = 'resultOfCallingBusRpcClient.call()';

		beforeEach(() => {
			jest.doMock('../../../../../../src/controller/action', () =>
				jest.fn((anActionName, parameters, moduleAlias) => ({
					name: anActionName,
					params: parameters,
					source: moduleAlias,
					module: originalModuleAlias,
					serialize: jest.fn(() => actionSerializationResult),
				}))
			);
			jest.dontMock('../../../../../../src/controller/channels/base_channel');

			IsolatedChildProcessChannel = require('../../../../../../src/controller/channels/child_process_channel');
			ActionStub = require('../../../../../../src/controller/action');
			isolatedChildProcessChannelInstance = new IsolatedChildProcessChannel(
				params.moduleAlias,
				params.events,
				params.actions,
				params.options
			);

			isolatedChildProcessChannelInstance.busRpcClient = {
				call: jest.fn((name, serialized, callback) => {
					callback(null, busRpcClientCallResult);
				}),
			};
		});

		it('should instantiate a new Action if actionName parameters is a string', async () => {
			await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);
			expect(ActionStub).toHaveBeenCalledWith(
				actionName,
				actionParams,
				isolatedChildProcessChannelInstance.moduleAlias
			);
		});

		it('should execute the action straight away if the action module is the same as the ChildProcessChannel module', async () => {
			const expectedResult = 'aResult';

			const actionImplementationMock = () => expectedResult;

			isolatedChildProcessChannelInstance.actions[
				actionName
			] = actionImplementationMock;

			isolatedChildProcessChannelInstance.busRpcClient = {
				call: jest.fn((name, serialized, callback) => {
					callback(null, true);
				}),
			};

			const result = await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);

			expect(result).toBe('aResult');
			expect(
				isolatedChildProcessChannelInstance.busRpcClient.call
			).not.toHaveBeenCalled();
		});

		it('should call busRpcClient.call if the action module and invoker module are different', async () => {
			const expectedResult = busRpcClientCallResult;

			isolatedChildProcessChannelInstance.moduleAlias = 'anotherModule';

			const result = await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);

			isolatedChildProcessChannelInstance.moduleAlias = originalModuleAlias;

			expect(result).toBe(expectedResult);

			expect(
				isolatedChildProcessChannelInstance.busRpcClient.call
			).toHaveBeenCalledWith(
				'invoke',
				actionSerializationResult,
				expect.any(Function)
			);
		});
	});

	// describe('#cleanup');

	describe('#_resolveWhenAllSocketsBound', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			childProcessChannel._resolveWhenAllSocketsBound = resolveWhenAllSocketsBound;
			childProcessChannel.busRpcClient.call = jest
				.fn()
				.mockImplementation(
					(
						name,
						moduleAlias,
						eventList,
						actionsList,
						socketOptions,
						callback
					) => {
						console.log('call');
						callback(null, true);
					}
				);

			return childProcessChannel._resolveWhenAllSocketsBound();
		});

		it('should call pubSocket.sock.once with proper arguments', () => {
			expect(childProcessChannel.pubSocket.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
			// With('connect', expect.any(Function));
		});

		it('should call subSocket.sock.once with proper arguments', () => {
			expect(childProcessChannel.subSocket.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
		});

		it('should call rpcSocket.once with proper arguments', () => {
			expect(childProcessChannel.rpcSocket.once).toHaveBeenCalledWith(
				'bind',
				expect.any(Function)
			);
		});

		it('should call busRpcSocket.once with proper arguments', () => {
			expect(childProcessChannel.busRpcSocket.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
		});

		it('should call busRpcClient.call with proper arguments whrn busRpcSocket receives a "connect" event', () => {
			expect(childProcessChannel.busRpcClient.call).toHaveBeenCalledWith(
				'registerChannel',
				childProcessChannel.moduleAlias,
				childProcessChannel.eventsList.map(event => event.name),
				childProcessChannel.actionsList.map(action => action.name),
				{ type: 'ipcSocket', rpcSocketPath: childProcessChannel.rpcSocketPath },
				expect.any(Function)
			);
		});
	});

	describe('#_rejectWhenAnySocketFailsToBind', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			childProcessChannel._rejectWhenAnySocketFailsToBind = rejectWhenAnySocketFailsToBind;
		});

		it('should reject if any of the sockets receive an "error" event', async () => {
			try {
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				return true;
			}
		});

		it('should call pubSocket.sock.once with proper arguments', async () => {
			try {
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				expect(childProcessChannel.pubSocket.sock.once).toHaveBeenCalledWith(
					'error',
					expect.any(Function)
				);
			}
		});

		it('should call subSocket.sock.once with proper arguments', async () => {
			try {
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				expect(childProcessChannel.subSocket.sock.once).toHaveBeenCalledWith(
					'error',
					expect.any(Function)
				);
			}
		});

		it('should call rpcSocket.once with proper arguments', async () => {
			try {
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				expect(childProcessChannel.rpcSocket.once).toHaveBeenCalledWith(
					'error',
					expect.any(Function)
				);
			}
		});
	});

	describe('#_rejectWhenTimeout', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			childProcessChannel._rejectWhenTimeout = rejectWhenTimeout;
		});

		it('should reject with an Error object with proper message', async () => {
			try {
				await childProcessChannel._rejectWhenTimeout(1);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect(error.message).toBe('ChildProcessChannel sockets setup timeout');
			}
		});
	});

	describe('#_removeAllListeners', () => {
		beforeEach(() => {
			childProcessChannel._removeAllListeners = removeAllListeners;
			childProcessChannel._removeAllListeners();
		});

		it('should remove all listeners ', () => {
			expect(
				childProcessChannel.subSocket.sock.removeAllListeners
			).toHaveBeenCalledWith('connect');
		});
	});
});
