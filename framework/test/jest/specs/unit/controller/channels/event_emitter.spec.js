const EventEmitterChannel = require('../../../../../../src/controller/channels/event_emitter');
const Action = require('../../../../../../src/controller/action');
const Event = require('../../../../../../src/controller/event');
const Bus = require('../../../../../../src/controller/bus');

jest.mock('../../../../../../src/controller/action');
jest.mock('../../../../../../src/controller/event');
jest.mock('../../../../../../src/controller/bus');

// Arrange
const params = {
	alias: 'alias',
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
			params.alias,
			params.events,
			params.actions,
			params.bus,
			params.options
		);
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(eventEmitterChannel.moduleAlias).toBe(params.alias);
			expect(eventEmitterChannel.options).toBe(params.options);
			expect(eventEmitterChannel.bus).toBe(params.bus);

			params.events.forEach(event => {
				expect(Event).toHaveBeenCalledWith(`${params.alias}:${event}`);
			});

			Object.keys(params.actions).forEach(action => {
				expect(Action).toHaveBeenCalledWith(`${params.alias}:${action}`);
			});
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
			expect(eventEmitterChannel.publish).toThrow(TypeError);
		});
	});

	describe('#invoke', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(eventEmitterChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});

	describe('#isValidEventName', () => {
		// Arrange
		const eventName = params.events[0];

		it('should return false when invalid event name was provided', () => {
			//  Act & Assert
			expect(eventEmitterChannel.isValidEventName(eventName, false)).toBe(
				false
			);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => eventEmitterChannel.isValidEventName(eventName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(
				eventEmitterChannel.isValidEventName(`${params.alias}:${eventName}`)
			).toBe(true);
		});
	});

	describe('#isValidActionName', () => {
		// Arrange
		const actionName = 'actionName';

		it('should return false when invalid action name was provided', () => {
			//  Act & Assert
			expect(eventEmitterChannel.isValidActionName(actionName, false)).toBe(
				false
			);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => eventEmitterChannel.isValidActionName(actionName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(
				eventEmitterChannel.isValidActionName(`${params.alias}:${actionName}`)
			).toBe(true);
		});
	});
});
