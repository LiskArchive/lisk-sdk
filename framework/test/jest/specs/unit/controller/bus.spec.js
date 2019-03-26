const { EventEmitter2 } = require('eventemitter2');

const Bus = require('../../../../../src/controller/bus');
const Controller = require('../../../../../src/controller/controller');

jest.mock('../../../../../src/controller/controller');
jest.mock('eventemitter2');
jest.mock('pm2-axon');
jest.mock('pm2-axon-rpc');

describe('Bus', () => {
	const controller = new Controller();
	const options = {};
	const config = {
		ipc: {
			enabled: false,
		},
	};

	let bus = null;
	beforeEach(() => {
		bus = new Bus(controller, options, config);
	});

	describe('#constructor', () => {
		it('should create the Bus istance with given arguments.', () => {
			// Assert
			expect(bus.actions).toEqual({});
			expect(bus.events).toEqual({});
		});
	});

	describe('#setup', () => {
		it('should resolve with true.', () => {
			expect(bus.setup()).resolves.toBe(true);
		});
	});

	describe('#registerChannel', () => {
		it('should register events.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event2'];

			// Act
			await bus.registerChannel(moduleAlias, events, []);

			// Assert
			expect(Object.keys(bus.events)).toHaveLength(2);
			events.forEach(eventName => {
				expect(bus.events[`${moduleAlias}:${eventName}`]).toBe(true);
			});
		});

		it('should throw error when trying to register duplicate events', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event1'];

			// Act && Assert
			expect(
				bus.registerChannel(moduleAlias, events, [])
			).rejects.toBeInstanceOf(Error);
		});

		it('should register actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = ['action1', 'action2'];

			// Act
			await bus.registerChannel(moduleAlias, [], actions);

			// Assert
			expect(Object.keys(bus.actions)).toHaveLength(2);
			actions.forEach(actionName => {
				expect(bus.actions[`${moduleAlias}:${actionName}`]).toBe(true);
			});
		});

		it('should throw error when trying to register duplicate actions.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = ['action1', 'action1'];

			// Act && Assert
			expect(
				bus.registerChannel(moduleAlias, [], actions)
			).rejects.toBeInstanceOf(Error);
		});
	});

	describe('#invoke', () => {
		it.todo('should invoke controller channel action.');
		it.todo('should invoke module channel action.');
		it.todo('should throw error if action was not registered.');
	});

	describe('#publish', () => {
		it('should throw Error when unregistered event name was provided.', () => {
			expect(() => bus.publish('unregisteredEvent')).toThrow();
		});

		it("should call eventemitter2 library's emit method", async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['registeredEvent'];
			const eventName = `${moduleAlias}:${events[0]}`;
			const eventData = '#DATA';

			await bus.registerChannel(moduleAlias, events, []);

			// Act
			bus.publish(eventName, eventData);

			// Assert
			expect(EventEmitter2.prototype.emit).toHaveBeenCalledWith(
				eventName,
				eventData
			);
		});
	});

	describe('#getActions', () => {
		it('should return the registered actions', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const actions = ['action1', 'action2'];
			const expectedActions = actions.map(action => `${moduleAlias}:${action}`);

			await bus.registerChannel(moduleAlias, [], actions);

			// Act
			const registeredActions = bus.getActions();

			// Assert
			expect(registeredActions).toEqual(expectedActions);
		});
	});

	describe('#getEvents', () => {
		it('should return the registered events.', async () => {
			// Arrange
			const moduleAlias = 'alias';
			const events = ['event1', 'event2'];
			const expectedEvents = events.map(event => `${moduleAlias}:${event}`);

			await bus.registerChannel(moduleAlias, events, []);

			// Act
			const registeredEvent = bus.getEvents();

			// Assert
			expect(registeredEvent).toEqual(expectedEvents);
		});
	});
});
