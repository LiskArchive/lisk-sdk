const EventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
const BaseChannel = require('../../../../../../src/controller/channels/base');
const Bus = require('../../../../../../src/controller/bus');

jest.mock('../../../../../../src/controller/bus');

// Arrange
const params = {
	moduleAlias: 'moduleAlias',
	events: ['event1', 'event2'],
	actions: {
		action1: jest.fn(),
		action2: jest.fn(),
		action3: jest.fn(),
	},
	bus: new Bus(),
	options: {},
};

describe('EventEmitterChannel Channel', () => {
	let eventEmitterChannel = null;

	beforeEach(() => {
		// Act
		eventEmitterChannel = new EventEmitterChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.bus,
			params.options
		);
	});

	describe('inheritance', () => {
		it('should be extended from BaseChannel class', () => {
			// Assert
			expect(EventEmitterChannel.prototype).toBeInstanceOf(BaseChannel);
		});

		it('should call BaseChannel class constructor with arguments', () => {
			// Arrange
			let IsolatedEventEmitterChannel;
			let IsolatedBaseChannel;

			/**
			 * Since `event_emitter` and `BaseChannel` was required on top of the test file,
			 * we have to isolate the modules to using the same module state from previous
			 * require calls.
			 */
			jest.isolateModules(() => {
				// no need to restore mock since, `restoreMocks` option was set to true in unit test config file.
				jest.doMock('../../../../../../src/controller/channels/base');
				IsolatedEventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
				IsolatedBaseChannel = require('../../../../../../src/controller/channels/base');
			});

			// Act
			eventEmitterChannel = new IsolatedEventEmitterChannel(
				params.moduleAlias,
				params.events,
				params.actions,
				params.bus,
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
			expect(eventEmitterChannel.bus).toBe(params.bus);
		});
	});

	describe('#registerToBus', () => {
		it('should call `bus.registerChannel` method with given arguments', async () => {
			// Act
			await eventEmitterChannel.registerToBus();

			// Assert
			expect(eventEmitterChannel.bus.registerChannel).toHaveBeenCalledWith(
				eventEmitterChannel.moduleAlias,
				eventEmitterChannel.eventsList.map(event => event.name),
				eventEmitterChannel.actionsList.map(action => action.name),
				{}
			);
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(eventEmitterChannel.subscribe).toThrow(TypeError);
		});

		it.todo('write integration test to check if event is being listened');
	});

	describe('#publish', () => {
		it('should throw TypeError when eventName was not provided', () => {
			// Assert
			expect(eventEmitterChannel.publish).toThrow(
				'Event name "undefined" must be a valid name with module name.'
			);
		});

		it.todo('write integration test to check if event is being published');
	});

	describe('#invoke', () => {
		it('should throw TypeError when action name was not provided', () => {
			// Assert
			expect(eventEmitterChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});
});
