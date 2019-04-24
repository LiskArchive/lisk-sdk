const BaseChannel = require('../../../../../../src/controller/channels/base_channel');
const {
	INTERNAL_EVENTS,
} = require('../../../../../../src/controller/channels/base/constants');
const Action = require('../../../../../../src/controller/action');
const Event = require('../../../../../../src/controller/event');

jest.mock('../../../../../../src/controller/action');
jest.mock('../../../../../../src/controller/event');

describe('Base Channel', () => {
	// Arrange
	const params = {
		moduleAlias: 'alias',
		events: ['event1', 'event2'],
		actions: {
			action1: jest.fn(),
			action2: jest.fn(),
			action3: jest.fn(),
		},
		options: {},
	};
	let baseChannel = null;

	beforeEach(() => {
		// Act
		baseChannel = new BaseChannel(
			params.moduleAlias,
			params.events,
			params.actions,
			params.options
		);
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(baseChannel.moduleAlias).toBe(params.moduleAlias);
			expect(baseChannel.options).toBe(params.options);

			params.events.forEach(event => {
				expect(Event).toHaveBeenCalledWith(`${params.moduleAlias}:${event}`);
			});

			Object.keys(params.actions).forEach(action => {
				expect(Action).toHaveBeenCalledWith(`${params.moduleAlias}:${action}`);
			});
		});
	});

	describe('getters', () => {
		it('base.actionList should contain list of Action Objects', () => {
			// Assert
			expect(baseChannel.actionsList).toHaveLength(3);
			baseChannel.actionsList.forEach(action => {
				expect(action).toBeInstanceOf(Action);
			});
		});

		it('base.eventsList should contain list of Event Objects with internal events', () => {
			// Arrange & Act
			baseChannel = new BaseChannel(
				params.moduleAlias,
				params.events,
				params.actions
			);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(
				params.events.length + INTERNAL_EVENTS.length
			);
			baseChannel.eventsList.forEach(event => {
				expect(event).toBeInstanceOf(Event);
			});
		});

		it('base.eventsList should contain internal events when skipInternalEvents option was set to FALSE', () => {
			// Arrange & Act
			baseChannel = new BaseChannel(
				params.moduleAlias,
				params.events,
				params.actions,
				{
					skipInternalEvents: false,
				}
			);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(
				params.events.length + INTERNAL_EVENTS.length
			);
		});

		it('base.eventsList should NOT contain internal events when skipInternalEvents option was set TRUE', () => {
			// Arrange & Act
			baseChannel = new BaseChannel(
				params.moduleAlias,
				params.events,
				params.actions,
				{
					skipInternalEvents: true,
				}
			);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(params.events.length);
		});

		it('base.actions should return given actions object as it is', () => {
			// Assert
			expect(baseChannel.actions).toEqual(params.actions);
		});
	});

	describe('#registerToBus', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.registerToBus()).rejects.toBeInstanceOf(TypeError);
		});
	});

	describe('#subscribe', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.subscribe).toThrow(TypeError);
		});
	});

	describe('#publish', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.publish).toThrow(TypeError);
		});
	});

	describe('#invoke', () => {
		it('should throw TypeError', () => {
			// Assert
			expect(baseChannel.invoke()).rejects.toBeInstanceOf(TypeError);
		});
	});

	describe('#isValidEventName', () => {
		// Arrange
		const eventName = params.events[0];

		it('should return false when invalid event name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidEventName(eventName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidEventName(eventName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(
				baseChannel.isValidEventName(`${params.moduleAlias}:${eventName}`)
			).toBe(true);
		});
	});

	describe('#isValidActionName', () => {
		// Arrange
		const actionName = 'actionName';

		it('should return false when invalid action name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidActionName(actionName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidActionName(actionName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(
				baseChannel.isValidActionName(`${params.moduleAlias}:${actionName}`)
			).toBe(true);
		});
	});
});
