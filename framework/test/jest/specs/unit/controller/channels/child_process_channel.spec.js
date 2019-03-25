const EventEmitter2 = require('eventemitter2');
const ChildProcessChannel = require('../../../../../../src/controller/channels/child_process_channel');
const BaseChannel = require('../../../../../../src/controller/channels/base_channel');
const Event = require('../../../../../../src/controller/event');

jest.mock('../../../../../../src/controller/channels/child_process');

jest.mock('eventemitter2');

jest.mock('axon-rpc', () => ({
	Client: jest.fn(() => ({
		call: jest.fn(),
	})),
	Server: jest.fn(() => ({
		expose: jest.fn(),
	})),
}));

jest.mock('axon');

describe('ChildProcessChannel Channel', () => {
	// Arrange
	const params = {
		moduleAlias: 'moduleAlias',
		events: ['event1', 'event2'],
		actions: {
			action1: jest.fn(),
			action2: jest.fn(),
			action3: jest.fn(),
		},
		options: {},
	};
	const socketsPath = {
		root: 'root',
		sub: 'sub',
		pub: 'pub',
		rpc: 'rpc',
	};

	let childProcessChannel;
	let spies;
	beforeEach(() => {
		childProcessChannel = new ChildProcessChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options
		);

		spies = {
			setupSockets: jest
				.spyOn(childProcessChannel, 'setupSockets')
				.mockResolvedValue(),
		};
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
		beforeEach(() => {
			childProcessChannel.registerToBus(socketsPath);
		});

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

		it('should call setupSockets', () => {
			// Assert
			expect(spies.setupSockets).toHaveBeenCalledTimes(1);
		});
	});

	describe('#setupSockets', () => {
		it.todo('stuff');
	});

	describe('#subscribe', () => {
		const validEventName = `${params.moduleAlias}:anEventName`;
		beforeEach(async () => {
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should call localBus.on when the module is the same', async () => {
			// Act
			childProcessChannel.subscribe(validEventName, () => {});
			// Assert
			expect(childProcessChannel.localBus.on).toHaveBeenCalledWith(
				validEventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			// Arrange
			const invalidEventName = 'invalidModule:anEventName';

			// Act
			childProcessChannel.subscribe(invalidEventName, () => {});

			// Assert
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				invalidEventName,
				expect.any(Function)
			);
		});
	});

	describe('#once', () => {
		const validEventName = `${params.moduleAlias}:anEventName`;

		beforeEach(() => childProcessChannel.registerToBus(socketsPath));

		it('should call localBus.once when the module is the same', async () => {
			// Act
			childProcessChannel.once(validEventName, () => {});
			// Assert
			expect(childProcessChannel.localBus.once).toHaveBeenCalledWith(
				validEventName,
				expect.any(Function)
			);
		});

		it('should call subSocket.on when the module is not the same', async () => {
			// Arrange
			const invalidEventName = 'invalidModule:anEventName';

			// Act
			childProcessChannel.once(invalidEventName, () => {});

			// Assert
			expect(childProcessChannel.subSocket.on).toHaveBeenCalledWith(
				invalidEventName,
				expect.any(Function)
			);
		});
	});

	describe('#publish', () => {
		const validEventName = `${params.moduleAlias}:anEventName`;
		const invalidEventName = 'invalidModule:anEventName';

		beforeEach(async () => {
			// Arrange
			await childProcessChannel.registerToBus(socketsPath);
		});

		it('should throw new Error when the module is not the same', async () => {
			expect(() =>
				childProcessChannel.publish(invalidEventName, () => {})
			).toThrow(
				`Event "${invalidEventName}" not registered in "${
					params.moduleAlias
				}" module.`
			);
		});

		it('should call localBus.emit with proper arguments', async () => {
			// Arrange
			const data = '#DATA';
			const event = new Event(validEventName, data);

			// Act
			childProcessChannel.publish(validEventName, data);

			// Assert
			expect(childProcessChannel.localBus.emit).toHaveBeenCalledWith(
				event.key(),
				event.serialize()
			);
		});

		it('should call pubSocket.emit with proper arguments', async () => {
			// Arrange
			const data = '#DATA';
			const event = new Event(validEventName, data);

			// Act
			childProcessChannel.publish(validEventName, data);

			// Assert
			expect(childProcessChannel.pubSocket.emit).toHaveBeenCalledWith(
				event.key(),
				event.serialize()
			);
		});

		it.todo('should not call pubSocket.emit when eventList is empty');
	});

	describe('#invoke', () => {
		const actionName = 'firstAction';
		const actionParams = ['param1', 'param2'];
		const actionSerializationResult = 'serialized';
		const busRpcClientCallResult = 'resultOfCallingBusRpcClient.call()';

		let ActionStub;
		let IsolatedChildProcessChannel;
		let isolatedChildProcessChannelInstance;

		beforeEach(() => {
			jest.doMock('../../../../../../src/controller/action', () =>
				jest.fn((anActionName, parameters, moduleAlias) => ({
					name: anActionName,
					params: parameters,
					source: moduleAlias,
					module: params.moduleAlias,
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
			isolatedChildProcessChannelInstance.moduleAlias = params.moduleAlias;
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

			childProcessChannel._resolveWhenAllSocketsBound();
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
