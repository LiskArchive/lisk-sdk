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
			close: jest.fn(),
			on: jest.fn(),
			once: jest.fn((event, callback) => {
				callback();
			}),
			bind: jest.fn(),
			emit: jest.fn(),
			removeAllListeners: jest.fn(),
			sock: {
				once: jest.fn((event, callback) => {
					callback();
				}),
				on: jest.fn((event, callback) => {
					callback();
				}),
				removeAllListeners: jest.fn(),
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
			let IsolatedChildProcessChannel = null;
			let IsolatedBaseChannel = null;

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
			// Assert
			expect(childProcessChannel.rpcServer.expose).toHaveBeenCalledWith(
				'invoke',
				expect.any(Function)
			);
			// TODO: Test callback
		});

		it('should bind the rpcSocket to rpcSocketPath', () => {
			// Assert
			expect(childProcessChannel.rpcSocket.bind).toHaveBeenCalledWith(
				childProcessChannel.rpcSocketPath
			);
		});

		it('should perform Promise.race with correct arguments', () => {
			// Assert
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
		const eventName = 'anEventName';

		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			return childProcessChannel.subscribe(eventName, eventHandler);
		});

		afterEach(() => {
			// Restore moduleAlias to its original value
			childProcessChannel.moduleAlias = originalModuleAlias;
		});

		it('should instantiate a new Event with eventName', () => {
			// Assert
			expect(Event).toHaveBeenCalledWith(eventName);
		});

		it('should call localBus.on when the module is the same', async () => {
			// Act
			childProcessChannel.subscribe(eventName, eventHandler);
			// Assert
			expect(childProcessChannel.localBus.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			// Arrange
			childProcessChannel.moduleAlias = 'differentModule';
			// Act
			childProcessChannel.subscribe(eventName, eventHandler);
			// Assert
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});
	});

	describe('#once', () => {
		const eventHandler = jest.fn();
		const eventName = 'anEvent';

		beforeEach(() => childProcessChannel.registerToBus(socketsPath));

		afterEach(() => {
			// Restore moduleAlias to its original value
			childProcessChannel.moduleAlias = originalModuleAlias;
		});

		it('should instantiate a new Event with eventName', () => {
			// Act
			childProcessChannel.once(eventName, eventHandler);
			// Assert
			expect(Event).toHaveBeenCalledWith(eventName);
		});

		it('should call localBus.once when the module is the same', async () => {
			// Act
			childProcessChannel.once(eventName, eventHandler);
			// Assert
			expect(childProcessChannel.localBus.once).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			// Arrange
			childProcessChannel.moduleAlias = 'differentModule';
			// Act
			childProcessChannel.once(eventName, eventHandler);
			// Assert
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				eventName,
				expect.any(Function)
			);
		});
	});

	describe('#publish', () => {
		const eventHandler = jest.fn();
		const eventName = 'anEventName';

		beforeEach(async () => {
			childProcessChannel.moduleAlias = originalModuleAlias;
			await childProcessChannel.registerToBus(socketsPath);
			return childProcessChannel.publish(eventName, eventHandler);
		});

		it('should instantiate a new Event with eventName', () => {
			// Assert
			expect(Event).toHaveBeenCalledWith(eventName, eventHandler);
		});

		it('should call localBus.emit with proper arguments', async () => {
			// Assert
			expect(childProcessChannel.localBus.emit).toHaveBeenCalledWith(
				'aKey',
				'serialized'
			);
		});

		it('should call pubSocket.emit with proper arguments', async () => {
			// Assert
			expect(childProcessChannel.pubSocket.emit).toHaveBeenCalledWith(
				'aKey',
				'serialized'
			);
		});

		it('should throw new Error when the module is not the same', async () => {
			// Arrange
			childProcessChannel.moduleAlias = 'differentModule';
			try {
				// Act
				childProcessChannel.publish(eventName, eventHandler);
			} catch (error) {
				// Assert
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
			// Act
			await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);
			// Assert
			expect(ActionStub).toHaveBeenCalledWith(
				actionName,
				actionParams,
				isolatedChildProcessChannelInstance.moduleAlias
			);
		});

		it('should execute the action straight away if the action module is the same as the ChildProcessChannel module', async () => {
			// Arrange
			const expectedResult = 'aResult';
			isolatedChildProcessChannelInstance.actions[actionName] = () =>
				expectedResult;
			isolatedChildProcessChannelInstance.busRpcClient = {
				call: jest.fn((name, serialized, callback) => {
					callback(null, true);
				}),
			};
			// Act
			const result = await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);
			// Assert
			expect(result).toBe(expectedResult);
			expect(
				isolatedChildProcessChannelInstance.busRpcClient.call
			).not.toHaveBeenCalled();
		});

		it('should call busRpcClient.call if the action module and invoker module are different', async () => {
			// Arrange
			const expectedResult = busRpcClientCallResult;
			isolatedChildProcessChannelInstance.moduleAlias = 'anotherModule';
			// Act
			const result = await isolatedChildProcessChannelInstance.invoke(
				actionName,
				actionParams
			);
			isolatedChildProcessChannelInstance.moduleAlias = originalModuleAlias;
			// Assert
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

	describe('#cleanup', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			return childProcessChannel.cleanup();
		});

		it('should close the rpcSocket if rpcSocket is not undefined and it has been correctly initialized', () => {
			// Assert
			expect(childProcessChannel.rpcSocket.close).toHaveBeenCalled();
		});
	});

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
						callback(null, true);
					}
				);

			return childProcessChannel._resolveWhenAllSocketsBound();
		});

		it('should call pubSocket.sock.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.pubSocket.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
		});

		it('should call subSocket.sock.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.subSocket.sock.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
		});

		it('should call rpcSocket.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.rpcSocket.once).toHaveBeenCalledWith(
				'bind',
				expect.any(Function)
			);
		});

		it('should call busRpcSocket.once with proper arguments', () => {
			// Assert
			expect(childProcessChannel.busRpcSocket.once).toHaveBeenCalledWith(
				'connect',
				expect.any(Function)
			);
		});

		it('should call busRpcClient.call with proper arguments when busRpcSocket receives a "connect" event', () => {
			// Assert
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
				// Act
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				// Assert
				return true;
			}
			// Assert
			return false;
		});

		it('should call pubSocket.sock.once with proper arguments', async () => {
			try {
				// Act
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				// Assert
				expect(childProcessChannel.pubSocket.sock.once).toHaveBeenCalledWith(
					'error',
					expect.any(Function)
				);
			}
		});

		it('should call subSocket.sock.once with proper arguments', async () => {
			try {
				// Act
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				// Assert
				expect(childProcessChannel.subSocket.sock.once).toHaveBeenCalledWith(
					'error',
					expect.any(Function)
				);
			}
		});

		it('should call rpcSocket.once with proper arguments', async () => {
			try {
				// Act
				await childProcessChannel._rejectWhenAnySocketFailsToBind();
			} catch (error) {
				// Assert
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
				// Act
				await childProcessChannel._rejectWhenTimeout(1);
			} catch (error) {
				// Assert
				expect(error).toBeInstanceOf(Error);
				expect(error.message).toBe('ChildProcessChannel sockets setup timeout');
			}
		});
	});

	describe('#_removeAllListeners', () => {
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
			childProcessChannel._removeAllListeners = removeAllListeners;
			childProcessChannel._removeAllListeners();
		});

		it('should remove all listeners on subSocket ', () => {
			// Assert
			expect(
				childProcessChannel.subSocket.sock.removeAllListeners
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.subSocket.sock.removeAllListeners
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on pubSocket', () => {
			// Assert
			expect(
				childProcessChannel.pubSocket.sock.removeAllListeners
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.pubSocket.sock.removeAllListeners
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on busRpcSocket', () => {
			// Assert
			expect(
				childProcessChannel.busRpcSocket.removeAllListeners
			).toHaveBeenCalledWith('connect');
			expect(
				childProcessChannel.busRpcSocket.removeAllListeners
			).toHaveBeenCalledWith('error');
		});

		it('should remove all listeners on rpcSocket', () => {
			// Assert
			expect(
				childProcessChannel.rpcSocket.removeAllListeners
			).toHaveBeenCalledWith('bind');
			expect(
				childProcessChannel.rpcSocket.removeAllListeners
			).toHaveBeenCalledWith('error');
		});
	});
});
