/*
 * Copyright © 2020 Lisk Foundation
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

import { validateSchema } from '../../src';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloneDeep = require('lodash.clonedeep');

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

describe('lisk_meta_schema', () => {
	describe('top level schema', () => {
		it('should pass on for "object" type', () => {
			// Assert
			expect(validateSchema(validSchema)).toEqual([]);
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
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.type',
				keyword: 'const',
				message: 'should be equal to constant',
				schemaPath: '#/properties/type/const',
				params: { allowedValue: 'object' },
			});
		});
		it('should return error when "type" is not defined', () => {
			// Arrange
			const invalidSchema = { ...validSchema };
			delete invalidSchema.type;

			// Act
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "should have required property 'type'",
				schemaPath: '#/required',
				params: { missingProperty: 'type' },
			});
		});
		it('should return error when "$id" is not defined', () => {
			// Arrange
			const invalidSchema = { ...validSchema };
			delete invalidSchema.$id;

			// Act
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "should have required property '$id'",
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
			expect(validateSchema(invalidSchema)).toEqual([]);
		});

		it('should return error when "$schema" value is defined other than lisk-schema uri', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			invalidSchema.$schema = 'my-custom-schema';

			// Act
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: '',
				message: 'no schema with key or ref "my-custom-schema"',
				schemaPath: '',
				params: {},
			});
		});

		it('should return error when "properties" is not defined', () => {
			// Arrange
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.properties;

			// Act
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '',
				keyword: 'required',
				message: "should have required property 'properties'",
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
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.properties',
				keyword: 'format',
				message: 'should match format "camelCase"',
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
			const errors = validateSchema(invalidSchema);

			// Assert
			expect(errors).toContainEqual({
				dataPath: '.properties',
				keyword: 'minProperties',
				message: 'should NOT have fewer than 1 properties',
				schemaPath: '#/properties/properties/minProperties',
				params: { limit: 1 },
			});
		});
	});

	describe('properties', () => {
		describe('dataType', () => {
			it.each([
				'bytes',
				'uint32',
				'sint32',
				'uint64',
				'sint64',
				'string',
				'boolean',
			])('should be ok with "dataType=%s"', dataType => {
				// Arrange
				const schema = cloneDeep(validSchema);
				schema.properties.myProp.dataType = dataType;

				// Assert
				expect(validateSchema(schema)).toEqual([]);
			});
			it('should return error when "dataType" and "type" both present', () => {
				// Arrange
				const schema = {
					...validSchema,
					...{
						properties: {
							myProp: {
								dataType: 'string',
								type: 'string',
							},
						},
					},
				};

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: 'dataType',
					message: 'Either "dataType" or "type" can be presented in schema',
					params: { dataType: 'string' },
					schemaPath: '.properties.myProp',
					dataPath: '',
				});
			});
		});

		describe('fieldNumber', () => {
			it('should only accept integer values', () => {
				// Arrange
				const schema = cloneDeep(validSchema);
				// eslint-disable-next-line
				// @ts-ignore
				schema.properties.myProp.fieldNumber = '1';

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: '',
					message: 'keyword schema is invalid: data should be number',
					params: {},
					schemaPath: '',
					dataPath: '',
				});
			});

			it('should not return error if fieldNumber does not start from 1', () => {
				// Arrange
				const schema = cloneDeep(validSchema);
				schema.properties.myProp.fieldNumber = 5;

				// Assert
				expect(validateSchema(schema)).toEqual([]);
			});

			it('should return error when fieldNumber less than 1', () => {
				// Arrange
				const schema = cloneDeep(validSchema);
				schema.properties.myProp.fieldNumber = 0;

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: '',
					message: 'keyword schema is invalid: data should be >= 1',
					params: {},
					schemaPath: '',
					dataPath: '',
				});
			});

			it('should return error when fieldNumber greater than 18999', () => {
				// Arrange
				const schema = cloneDeep(validSchema);
				schema.properties.myProp.fieldNumber = 19000;

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: '',
					message: 'keyword schema is invalid: data should be <= 18999',
					params: {},
					schemaPath: '',
					dataPath: '',
				});
			});

			it('should return error when fieldNumber is repeated on same level', () => {
				// Arrange
				const schema = {
					...validSchema,
					...{
						properties: {
							myProp: {
								dataType: 'string',
								fieldNumber: 5,
							},
							mySecondProp: {
								dataType: 'string',
								fieldNumber: 5,
							},
							myThirdProp: {
								dataType: 'string',
								fieldNumber: 6,
							},
						},
					},
				};

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: 'fieldNumber',
					message: 'Value must be unique across all properties on same level',
					params: { fieldNumbers: [5, 5, 6] },
					schemaPath: '.properties.myProp',
					dataPath: '',
				});
			});

			it('should fail when fieldNumber on other level is repeated on child level', () => {
				// Arrange
				const schema = {
					...validSchema,
					...{
						properties: {
							myProp: {
								dataType: 'string',
								fieldNumber: 5,
							},
							mySecondProp: {
								dataType: 'string',
								fieldNumber: 6,
							},
							myThirdProp: {
								type: 'object',
								fieldNumber: 8,
								properties: {
									childProp: {
										dataType: 'string',
										fieldNumber: 5,
									},
									childProp2: {
										dataType: 'string',
										fieldNumber: 8,
									},
									childProp3: {
										dataType: 'string',
										fieldNumber: 5,
									},
								},
							},
						},
					},
				};

				// Assert
				expect(validateSchema(schema)).toContainEqual({
					keyword: 'fieldNumber',
					message: 'Value must be unique across all properties on same level',
					params: { fieldNumbers: [5, 8, 5] },
					schemaPath: '.properties.myThirdProp.properties.childProp',
					dataPath: '',
				});
			});

			it('should not fail when fieldNumber is repeated on different level', () => {
				// Arrange
				const schema = {
					...validSchema,
					...{
						properties: {
							myProp: {
								dataType: 'string',
								fieldNumber: 5,
							},
							mySecondProp: {
								dataType: 'string',
								fieldNumber: 6,
							},
							myThirdProp: {
								type: 'object',
								fieldNumber: 8,
								properties: {
									childProp: {
										dataType: 'string',
										fieldNumber: 5,
									},
									childProp2: {
										dataType: 'string',
										fieldNumber: 8,
									},
									childProp3: {
										dataType: 'string',
										fieldNumber: 10,
									},
								},
							},
						},
					},
				};

				// Assert
				expect(validateSchema(schema)).toEqual([]);
			});
		});
	});
});
