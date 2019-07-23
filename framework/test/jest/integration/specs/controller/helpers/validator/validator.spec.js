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

const {
	validate,
	parseEnvArgAndValidate,
} = require('../../../../../../../src/controller/validator');

describe('validator.js', () => {
	describe('Ajv instance', () => {
		describe('const', () => {
			it('should not throw error if value for "const" defined attribute is same', () => {
				const schema = {
					type: 'object',
					properties: {
						prop1: { type: 'integer', const: 5 },
					},
				};

				expect(() => validate(schema, { prop1: 5 })).not.toThrow();
			});

			it('should throw error if value for "const" defined attribute is different', () => {
				let errorThrown;

				const schema = {
					type: 'object',
					properties: {
						prop1: { type: 'integer', const: 5 },
					},
				};

				try {
					validate(schema, { prop1: 2 });
				} catch (error) {
					errorThrown = error;
				}

				expect(errorThrown.message).toBe('Schema validation error');
				expect(errorThrown.errors).toEqual([
					{
						dataPath: '.prop1',
						keyword: 'const',
						message: 'should be equal to constant',
						params: { allowedValue: 5 },
						schemaPath: '#/properties/prop1/const',
					},
				]);
			});
		});
	});
	describe('Ajv instance with keyword parser', () => {
		describe('parseEnvArgAndValidate()', () => {
			it('should populate default values if provided through schema', () => {
				const schema = {
					type: 'object',
					properties: {
						prop1: { type: 'string' },
						prop2: { type: 'string' },
					},
					required: ['prop1', 'prop2'],
					default: { prop1: 'prop1Default', prop2: 'prop2Default' },
				};

				const data = { prop2: 'prop2' };
				const result = parseEnvArgAndValidate(schema, data);

				expect(result).toEqual({ prop1: 'prop1Default', prop2: 'prop2' });
			});

			it('should populate default values if custom default is provided', () => {
				const schema = {
					type: 'object',
					properties: {
						prop1: { type: 'string' },
						prop2: { type: 'string' },
					},
					required: ['prop1', 'prop2'],
					default: { prop1: 'prop1Default', prop2: 'prop2Default' },
				};

				const customDefault = {
					prop1: 'prop1CustomDefault',
					prop2: 'prop2CustomDefault',
				};
				const data = { prop2: 'prop2' };
				const result = parseEnvArgAndValidate(schema, data, customDefault);

				expect(result).toEqual({ prop1: 'prop1CustomDefault', prop2: 'prop2' });
			});
		});
	});
});
