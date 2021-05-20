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
 *
 */
import { validator } from '../src';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloneDeep = require('lodash.clonedeep');

describe('validator', () => {
	describe('validateSchema', () => {
		const validSchema = {
			$id: '/my-schema',
			$schema: 'http://lisk.io/lisk-schema/schema#',
			type: 'object',
			properties: {
				myProp: {
					dataType: 'string',
					fieldNumber: 1,
				},
			},
			required: ['myProp'],
		};

		it('should pass on for "object" type', () => {
			// Assert
			expect(validator.validateSchema(validSchema)).toEqual([]);
		});

		it('should return error on schema with type other than "object"', () => {
			// Arrange
			const invalidSchema = {
				$id: '/my-invalid-schema',
				$schema: 'http://lisk.io/lisk-schema/schema#',
				type: 'string',
				properties: {},
			};

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.type',
				keyword: 'const',
				message: 'must be equal to constant',
				schemaPath: '#/properties/type/const',
				params: { allowedValue: 'object' },
			});
		});
		it('should return error when "type" is not defined', () => {
			// Arrange
			const invalidSchema = { ...validSchema };
			delete (invalidSchema as any).type;

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "must have required property 'type'",
				schemaPath: '#/required',
				params: { missingProperty: 'type' },
			});
		});
		it('should return error when "$id" is not defined', () => {
			// Arrange
			const invalidSchema = { ...validSchema };
			delete (invalidSchema as any).$id;

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "must have required property '$id'",
				schemaPath: '#/required',
				params: { missingProperty: '$id' },
			});
		});

		// As the schema is always overridden
		it('should not return error when "$schema" is not defined', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.$schema;

			// Assert
			expect(validator.validateSchema(invalidSchema)).toEqual([]);
		});

		it('should throw error when "$schema" value is defined other than lisk-schema uri', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			invalidSchema.$schema = 'my-custom-schema';

			// Act & Assert
			expect(() => validator.validateSchema(invalidSchema)).toThrow(
				'no schema with key or ref "my-custom-schema"',
			);
		});

		it('should return error when "properties" is not defined', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.properties;

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "must have required property 'properties'",
				schemaPath: '#/required',
				params: { missingProperty: 'properties' },
			});
		});

		it('should return error when "properties" are not camelcase', () => {
			// Arrange
			const invalidSchema = {
				...validSchema,
				...{
					properties: { 'my-custom-prop': { fieldNumber: 1, type: 'string' } },
				},
			};

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.properties',
				keyword: 'format',
				message: 'must match format "camelCase"',
				schemaPath: '#/properties/properties/propertyNames/format',
				params: { format: 'camelCase' },
				propertyName: 'my-custom-prop',
			});
		});

		it('should return error when "properties" are empty object', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.properties.myProp;

			// Act
			const errors = validator.validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.properties',
				keyword: 'minProperties',
				message: 'must NOT have fewer than 1 items',
				schemaPath: '#/properties/properties/minProperties',
				params: { limit: 1 },
			});
		});
	});
});
