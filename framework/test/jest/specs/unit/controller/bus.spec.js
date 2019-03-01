const Bus = require('../../../../../src/controller/bus');
const Controller = require('../../../../../src/controller/controller');

jest.mock('../../../../../src/controller/controller');

const controller = new Controller();
const options = {};

describe('Bus', () => {
	let bus = null;
	beforeEach(() => {
		bus = new Bus(controller, options);
	});

	describe('#constructor', () => {
		it('should create the Bus istance with given arguments.', () => {
			// Assert
			expect(bus.controller).toBe(controller);
			expect(bus.actions).toEqual({});
			expect(bus.events).toEqual({});
		});
	});

	describe('#setup', () => {
		it('should resolve with "will be implemented" message.', () => {
			expect(bus.setup()).resolves.toBe('will be implemented');
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
				expect(bus.events[`${moduleAlias}:${actionName}`]).toBe(true);
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
});
