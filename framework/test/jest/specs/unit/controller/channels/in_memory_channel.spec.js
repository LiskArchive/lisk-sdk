const InMemoryChannel = require('../../../../../../src/controller/channels/in_memory_channel');
const BaseChannel = require('../../../../../../src/controller/channels/base_channel');
const Bus = require('../../../../../../src/controller/bus');

jest.mock('../../../../../../src/controller/bus');

describe('InMemoryChannel Channel', () => {
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
	let inMemoryChannel = null;
	const bus = new Bus();

	beforeEach(() => {
		// Act
		inMemoryChannel = new InMemoryChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options
		);
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(InMemoryChannel.prototype).toBeInstanceOf(BaseChannel);
		});

		it('should call BaseChannel class constructor with arguments', () => {
			// Arrange
			let IsolatedInMemoryChannel;
			let IsolatedBaseChannel;

			/**
			 * Since `event_emitter` and `BaseChannel` was required on top of the test file,
			 * we have to isolate the modules to using the same module state from previous
			 * require calls.
			 */
			jest.isolateModules(() => {
				// no need to restore mock since, `restoreMocks` option was set to true in unit test config file.
				jest.doMock('../../../../../../src/controller/channels/base_channel');
				IsolatedInMemoryChannel = require('../../../../../../src/controller/channels/in_memory_channel');
				IsolatedBaseChannel = require('../../../../../../src/controller/channels/base_channel');
			});

			// Act
			inMemoryChannel = new IsolatedInMemoryChannel(
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
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(inMemoryChannel).toHaveProperty('moduleAlias');
			expect(inMemoryChannel).toHaveProperty('options');
		});
	});

	describe('#registerToBus', () => {
		it('should call `bus.registerChannel` method with given arguments', async () => {
			// Act
			await inMemoryChannel.registerToBus(bus);

			// Assert
			expect(inMemoryChannel.bus).toBe(bus);
			expect(inMemoryChannel.bus.registerChannel).toHaveBeenCalledWith(
				inMemoryChannel.moduleAlias,
				inMemoryChannel.eventsList.map(event => event.name),
				inMemoryChannel.actionsList.map(action => action.name),
				{ type: 'inMemory', channel: inMemoryChannel }
			);
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.subscribe).toThrow(TypeError);
		});

		it.todo('write integration test to check if event is being listened');
	});

	describe('#publish', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(inMemoryChannel.publish).toThrow(
				'Event name "undefined" must be a valid name with module name.'
			);
		});

		it.todo('write integration test to check if event is being published');
	});

	describe('#invoke', () => {
		it('should throw TypeError when action name was not provided', () => {
			// Assert
			expect(inMemoryChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});
});
