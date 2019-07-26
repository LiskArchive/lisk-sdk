/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const Ajv = require('ajv');
const {
	env,
} = require('./../../../../../../../../src/controller/validator/keywords');

const formatters = require('../../../../../../../../src/controller/validator/keywords/formatters');

jest.mock(
	'../../../../../../../../src/controller/validator/keywords/formatters'
);

let validator;

describe('validator keyword "env"', () => {
	beforeEach(() => {
		validator = new Ajv({ allErrors: true });
		validator.addKeyword('env', env);
	});

	afterEach(() => {
		delete process.env.PROP1;
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

	it('should accept env variable if specified as integer and format accordingly', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'integer',
					env: 'PROP1',
				},
			},
		};

		const data = { prop1: '999' };
		process.env.PROP1 = '999';

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe(999);
	});

	it('should accept env variable if specified as boolean and format accordingly', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'boolean',
					env: 'PROP1',
				},
			},
		};

		const data = { prop1: 'true' };
		process.env.PROP1 = 'true';

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe(true);
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

	it('should throw error if env variable for type boolean is incorrect', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'boolean',
					env: 'PROP1',
				},
			},
		};

		const data = { prop1: 'true-wrong' };
		process.env.PROP1 = 'true-wrong';

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			'Failed to apply value for option PROP1, use "true" or "false"'
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
