const Event = require('../../../../../../src/controller/event');
const {
	EVENT_NAME,
	MODULE_NAME,
	VALID_EVENT_NAME_ARG,
	INVALID_EVENT_NAME_ARG,
	DATA,
} = require('./constants');

describe('Event Class', () => {
	describe('#constructor', () => {
		it('should throw error when no name argument was provided.', () => {
			expect(() => new Event()).toThrow(
				'Event name "undefined" must be a valid name with module name.'
			);
		});

		it('should throw error when invalid name argument was provided.', () => {
			// Act & Assert
			expect(() => new Event(INVALID_EVENT_NAME_ARG)).toThrow(
				`Event name "${INVALID_EVENT_NAME_ARG}" must be a valid name with module name.`
			);
		});

		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Act
			const event = new Event(VALID_EVENT_NAME_ARG, DATA);

			// Assert
			expect(event.module).toBe(MODULE_NAME);
			expect(event.name).toBe(EVENT_NAME);
			expect(event.data).toBe(DATA);
		});

		it('should not set source property when source is not provided.', () => {
			// Act
			const event = new Event(VALID_EVENT_NAME_ARG, DATA);

			// Assert
			expect(event).not.toHaveProperty('source');
		});
	});

	describe('methods', () => {
		let event;
		beforeEach(() => {
			// Act
			event = new Event(VALID_EVENT_NAME_ARG, DATA);
		});

		describe('#serialize', () => {
			it('should serialize the instance with given data.', () => {
				// Arrange
				const expectedResult = {
					name: EVENT_NAME,
					module: MODULE_NAME,
					data: DATA,
				};

				// Act
				const serializedEvent = event.serialize();

				// Assert
				expect(serializedEvent).toEqual(expectedResult);
			});
		});

		describe('#toString', () => {
			it('should return Event as string.', () => {
				// Arrange
				const expectedResult = `${MODULE_NAME}:${EVENT_NAME}`;

				// Act
				const stringifiedEvent = event.toString();

				// Assert
				expect(stringifiedEvent).toBe(expectedResult);
			});
		});

		describe('#key', () => {
			it('should return key as string.', () => {
				// Arrange
				const expectedResult = `${MODULE_NAME}:${EVENT_NAME}`;

				// Act
				const key = event.key();

				// Assert
				expect(key).toBe(expectedResult);
			});
		});

		describe('static #deserialize', () => {
			it('should return event instance with given stringified JSON config.', () => {
				// Arrange
				const jsonData = {
					name: EVENT_NAME,
					module: MODULE_NAME,
					data: DATA,
				};
				const config = JSON.stringify(jsonData);

				// Act
				// eslint-disable-next-line no-shadow
				const event = Event.deserialize(config);

				// Assert
				expect(event).toBeInstanceOf(Event);
				expect(event.module).toBe(MODULE_NAME);
				expect(event.name).toBe(EVENT_NAME);
				expect(event.data).toBe(DATA);
			});

			it('should return event instance with given object config.', () => {
				// Arrange
				const config = {
					name: EVENT_NAME,
					module: MODULE_NAME,
					data: DATA,
				};

				// Act
				// eslint-disable-next-line no-shadow
				const event = Event.deserialize(config);

				// Assert
				expect(event).toBeInstanceOf(Event);
				expect(event.module).toBe(MODULE_NAME);
				expect(event.name).toBe(EVENT_NAME);
				expect(event.data).toBe(DATA);
			});
		});
	});
});
