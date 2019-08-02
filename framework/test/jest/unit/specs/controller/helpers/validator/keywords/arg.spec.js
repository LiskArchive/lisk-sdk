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

// To make sure to parse the command line args need to chn
process.argv.push('-p', 'changedShortValue');
process.argv.push('--port', 'changedLongValue');
process.argv.push('--this-hyphen', 'changedLongHyphenValue');

const {
	arg,
} = require('./../../../../../../../../src/controller/validator/keywords');

const formatters = require('../../../../../../../../src/controller/validator/keywords/formatters');

jest.mock(
	'../../../../../../../../src/controller/validator/keywords/formatters',
);

let validator;

describe('validator keyword "arg"', () => {
	beforeEach(() => {
		validator = new Ajv({ allErrors: true });
		validator.addKeyword('arg', arg);
	});

	it('should throw error if arg specified in wrong format', () => {
		const schema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: 'PROP1',
				},
			},
		};

		expect(() => validator.validate(schema, {})).toThrow(
			'keyword schema is invalid: data should match pattern "^([-]{2}[a-z][a-z0-9-]*)(,[-][a-z]{1,1})?$", data should be object, data should match some schema in anyOf',
		);
	});

	it('should accept arg if specified as string as single format', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: '--port',
				},
			},
		};

		const data = { prop1: 'originalValue' };

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe('changedLongValue');
	});

	it('should accept arg with extra hyphen if specified as string as single format', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: '--this-hyphen',
				},
			},
		};

		const data = { prop1: 'originalValue' };

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe('changedLongHyphenValue');
	});

	it('should accept arg if specified as string with alias format', () => {
		const envSchemaWithOutFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: '--port,-n',
				},
			},
		};

		const data = { prop1: 'originalValue' };

		validator.validate(envSchemaWithOutFormatter, data);

		expect(data.prop1).toBe('changedLongValue');
	});

	it('should format the value of env variable if specified as an object', () => {
		const envSchemaWithFormatter = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: {
						name: '--port',
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
			'changedLongValue',
		);
		expect(data.prop1).toBe('formattedValue');
	});

	it('should throw error if env variable specified as object without "name" key', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: {
						formatter: 'stringToDelegateList',
					},
				},
			},
		};

		expect(() => validator.validate(invalidSchema, {})).toThrow(
			"keyword schema is invalid: data should be string, data should have required property 'name', data should match some schema in anyOf",
		);
	});

	it('should throw error if env variable specified as object with additional attributes', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: {
						name: '--port',
						formatter: 'stringToDelegateList',
						extraKey: 'myKey',
					},
				},
			},
		};
		expect(() => validator.validate(invalidSchema, {})).toThrow(
			'keyword schema is invalid: data should be string, data should NOT have additional properties, data should match some schema in anyOf',
		);
	});

	it('should throw error if env variable specified as integer', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: 5,
				},
			},
		};
		const data = { prop1: 'originalValue' };

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			'keyword schema is invalid: data should be string, data should be object, data should match some schema in anyOf',
		);
	});

	it('should throw error if env variable specified as an array', () => {
		const invalidSchema = {
			type: 'object',
			properties: {
				prop1: {
					type: 'string',
					arg: ['PROP1'],
				},
			},
		};
		const data = { prop1: 'originalValue' };

		expect(() => validator.validate(invalidSchema, data)).toThrow(
			'keyword schema is invalid: data should be string, data should be object, data should match some schema in anyOf',
		);
	});
});
