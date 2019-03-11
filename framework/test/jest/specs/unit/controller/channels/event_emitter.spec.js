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
	let EventEmitterChannel;
	let eventEmitterChannel = null;

	beforeEach(() => {
		// Arrange
		jest.isolateModules(() => {
			EventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
		});
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
			let IsolatedEventEmitterChannel;
			let IsolatedBaseChannel;
			// Assert
			jest.isolateModules(() => {
				IsolatedBaseChannel = require('../../../../../../src/controller/channels/base');
				IsolatedEventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
			});
			expect(IsolatedEventEmitterChannel.prototype).toBeInstanceOf(
				IsolatedBaseChannel
			);
		});

		it('should call BaseChannel class constructor with arguments', () => {
			jest.doMock('../../../../../../src/controller/channels/base');
			const BaseChannel = require('../../../../../../src/controller/channels/base');

			let IsolatedEventEmitterChannel;
			jest.isolateModules(() => {
				IsolatedEventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
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
			expect(BaseChannel).toHaveBeenCalledWith(
				params.moduleAlias,
				params.events,
				params.actions,
				params.options
			);

			jest.dontMock('../../../../../../src/controller/channels/base');
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
		it('should throw TypeError', () => {
			// Assert
			expect(eventEmitterChannel.subscribe).toThrow(TypeError);
		});
	});

	describe('#publish', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(eventEmitterChannel.publish).toThrow(
				'Event name "undefined" must be a valid name with module name.'
			);
		});
	});

	describe('#invoke', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(eventEmitterChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});
});
