const Ajv = require('ajv');
const {
	env,
} = require('./../../../../../../../src/controller/helpers/validator/keywords');

const formatters = require('../../../../../../../src/controller/helpers/validator/keywords/formatters');

jest.mock(
	'../../../../../../../src/controller/helpers/validator/keywords/formatters'
);

let validator;

describe('validator keyword "env"', () => {
	beforeEach(() => {
		validator = new Ajv({ allErrors: true });
		validator.addKeyword('env', env);
	});

	it('should accept env variable if specified as string', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: 'PROP1',
				},
			},
		};

		const data = { prop1: 'originalValue' };
		process.env.PROP1 = 'changedValue';

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe('changedValue');
	});

	it('should format the value of env variable if specified as an object', () => {
		const envSchemaWithFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: {
						variable: 'PROP1',
						formatter: 'stringToDelegateList',
					},
				},
			},
		};

		const data = { prop1: 'originalValue' };
		process.env.PROP1 = 'changedValue';
		formatters.stringToDelegateList.mockReturnValue('formattedValue');

		validator.validate(envSchemaWithFormatter, data);

		expect(formatters.stringToDelegateList).toHaveBeenCalledWith(
			'changedValue'
		);
		expect(data.prop1).toBe('formattedValue');
	});

	it('should throw error if env variable specified as object without variable key', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: {
						formatter: 'stringToDelegateList',
					},
				},
			},
		};
		const data = { prop1: 'originalValue' };

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			"keyword schema is invalid: data should be string, data should have required property 'variable', data should match some schema in anyOf"
		);
	});

	it('should throw error if env variable specified as object with additional attributes', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: {
						variable: 'PROP1',
						formatter: 'stringToDelegateList',
						extraKey: 'myKey',
					},
				},
			},
		};
		expect(() => validator.validate(invalidSchema, {})).toThrow(
			'keyword schema is invalid: data should be string, data should NOT have additional properties, data should match some schema in anyOf'
		);
	});

	it('should throw error if env variable specified as integer', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: 5,
				},
			},
		};
		const data = { prop1: 'originalValue' };

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			'keyword schema is invalid: data should be string, data should be object, data should match some schema in anyOf'
		);
	});

	it('should throw error if env variable specified as an array', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					env: ['PROP1'],
				},
			},
		};
		const data = { prop1: 'originalValue' };

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			'keyword schema is invalid: data should be string, data should be object, data should match some schema in anyOf'
		);
	});
});
