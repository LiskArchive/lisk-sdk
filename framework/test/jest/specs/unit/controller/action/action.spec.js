const Action = require('../../../../../../src/controller/action');
const {
	ACTION_NAME,
	MODULE_NAME,
	INVALID_ACTION_NAME_ARG,
	INVALID_ACTION_SOURCE_ARG,
	VALID_ACTION_NAME_ARG,
	VALID_ACTION_SOURCE_ARG,
	PARAMS,
} = require('./constants');

describe('Action class', () => {
	describe('#constructor', () => {
		// Act & Assert
		it('should throw an error when name argument was not provided.', () => {
			expect(() => new Action()).toThrow(
				'Action name "undefined" must be a valid name with module name.'
			);
		});
		it('should throw an error when invalid name was provided.', () => {
			// Act & Assert
			expect(() => new Action(INVALID_ACTION_NAME_ARG)).toThrow(
				`Action name "${INVALID_ACTION_NAME_ARG}" must be a valid name with module name.`
			);
		});

		it('should throw an error when invalid source was provided.', () => {
			// Act & Assert
			expect(
				() => new Action(VALID_ACTION_NAME_ARG, null, INVALID_ACTION_SOURCE_ARG)
			).toThrow(
				`Source name "${INVALID_ACTION_SOURCE_ARG}" must be a valid module name.`
			);
		});

		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Act
			const action = new Action(
				VALID_ACTION_NAME_ARG,
				PARAMS,
				VALID_ACTION_SOURCE_ARG
			);

			// Assert
			expect(action.module).toBe(MODULE_NAME);
			expect(action.name).toBe(ACTION_NAME);
			expect(action.params).toBe(PARAMS);
			expect(action.source).toBe(VALID_ACTION_SOURCE_ARG);
		});

		it('should not set source property when source is not provided.', () => {
			// Act
			const action = new Action(VALID_ACTION_NAME_ARG, PARAMS);

			// Assert
			expect(action).not.toHaveProperty('source');
		});
	});

	describe('methods', () => {
		let action;
		beforeEach(() => {
			// Arrange
			action = new Action(
				VALID_ACTION_NAME_ARG,
				PARAMS,
				VALID_ACTION_SOURCE_ARG
			);
		});

		describe('#serialize', () => {
			it('should serialize the instance with given data.', () => {
				// Arrange
				const expectedResult = {
					name: ACTION_NAME,
					module: MODULE_NAME,
					params: PARAMS,
					source: VALID_ACTION_SOURCE_ARG,
				};

				// Act
				const serializedAction = action.serialize();

				// Assert
				expect(serializedAction).toEqual(expectedResult);
			});
		});

		describe('#toString', () => {
			it('should return Action as string.', () => {
				// Arrange
				const expectedResult = `${VALID_ACTION_SOURCE_ARG} -> ${MODULE_NAME}:${ACTION_NAME}`;

				// Act
				const stringifiedAction = action.toString();

				// Assert
				expect(stringifiedAction).toBe(expectedResult);
			});
		});

		describe('#key', () => {
			it('should return key as string.', () => {
				// Arrange
				const expectedResult = `${MODULE_NAME}:${ACTION_NAME}`;

				// Act
				const key = action.key();

				// Assert
				expect(key).toBe(expectedResult);
			});
		});

		describe('static #deserialize', () => {
			it('should return action instance with given stringified JSON config.', () => {
				// Arrange
				const jsonData = {
					name: ACTION_NAME,
					module: MODULE_NAME,
					params: PARAMS,
					source: VALID_ACTION_SOURCE_ARG,
				};
				const config = JSON.stringify(jsonData);

				// Act
				// eslint-disable-next-line no-shadow
				const action = Action.deserialize(config);

				// Assert
				expect(action).toBeInstanceOf(Action);
				expect(action.module).toBe(MODULE_NAME);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toBe(PARAMS);
				expect(action.source).toBe(VALID_ACTION_SOURCE_ARG);
			});

			it('should return action instance with given object config.', () => {
				// Arrange
				const config = {
					name: ACTION_NAME,
					module: MODULE_NAME,
					params: PARAMS,
					source: VALID_ACTION_SOURCE_ARG,
				};

				// Act
				// eslint-disable-next-line no-shadow
				const action = Action.deserialize(config);

				// Assert
				expect(action).toBeInstanceOf(Action);
				expect(action.module).toBe(MODULE_NAME);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toBe(PARAMS);
				expect(action.source).toBe(VALID_ACTION_SOURCE_ARG);
			});
		});
	});
});
