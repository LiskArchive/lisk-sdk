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
import { LiskValidationError, validator } from '../src';

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

// TODO: Due to an issue Ajv, we have to use compile instead of validateSchema
// Validator don't validate keyword meta schema with validateSchema
// https://github.com/ajv-validator/ajv/issues/1221

describe('validator keywords', () => {
	beforeEach(() => {
		// As compile cache the schema
		validator.removeSchema(validSchema.$id);
	});

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
			expect(() => validator.compile(schema)).not.toThrow();
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
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: 'dataType',
						message: 'Either "dataType" or "type" can be presented in schema',
						params: { dataType: 'string' },
						schemaPath: '.properties.myProp',
						dataPath: '',
					},
				]),
			);
		});

		describe('dataType value validation', () => {
			describe('string', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'string', fieldNumber: 1 } },
						},
						{ myProp: 'string' },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if minLength is not satisfied', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'string', fieldNumber: 1, minLength: 3 },
							},
						},
						{ myProp: 'ch' },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if maxLength is not satisfied', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'string', fieldNumber: 1, maxLength: 3 },
							},
						},
						{ myProp: 'change' },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if not string', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'string', fieldNumber: 1, maxLength: 3 },
							},
						},
						{ myProp: 32 },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('bytes', () => {
				it('should  return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'bytes', fieldNumber: 1 } },
						},
						{ myProp: Buffer.from('value') },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if minLength is not satisfied', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'bytes', fieldNumber: 1, minLength: 10 },
							},
						},
						{ myProp: Buffer.alloc(9) },
					);
					expect(result).toHaveLength(1);
					expect(result[0].message).toEqual('minLength does not satisfied');
					expect(result[0].params).toEqual({
						dataType: 'bytes',
						minLength: 10,
						length: 9,
					});
				});

				it('should be invalid if maxLength is not satisfied', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'bytes', fieldNumber: 1, maxLength: 10 },
							},
						},
						{ myProp: Buffer.alloc(11) },
					);
					expect(result).toHaveLength(1);
					expect(result[0].message).toEqual('maxLength does not satisfied');
					expect(result[0].params).toEqual({
						dataType: 'bytes',
						maxLength: 10,
						length: 11,
					});
				});

				it('should be invalid if not Buffer', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: {
								myProp: { dataType: 'bytes', fieldNumber: 1, maxLength: 10 },
							},
						},
						{ myProp: 'string' },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('boolean', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'boolean', fieldNumber: 1 } },
						},
						{ myProp: true },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if not boolean', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'boolean', fieldNumber: 1 } },
						},
						{ myProp: 1 },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('uint32', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint32', fieldNumber: 1 } },
						},
						{ myProp: 0 },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if not number', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint32', fieldNumber: 1 } },
						},
						{ myProp: 'value' },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if number has decimal', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint32', fieldNumber: 1 } },
						},
						{ myProp: 1.23 },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if negative', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint32', fieldNumber: 1 } },
						},
						{ myProp: -1 },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if above uint32 range', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint32', fieldNumber: 1 } },
						},
						{ myProp: 4294967296 },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('uint64', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint64', fieldNumber: 1 } },
						},
						{ myProp: BigInt(32) },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if not bigint', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint64', fieldNumber: 1 } },
						},
						{ myProp: 32 },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if negative', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint64', fieldNumber: 1 } },
						},
						{ myProp: BigInt(-32) },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if above uint64 range', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'uint64', fieldNumber: 1 } },
						},
						{ myProp: BigInt('18446744073709551616') },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('sint32', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint32', fieldNumber: 1 } },
						},
						{ myProp: -32 },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if not number', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint32', fieldNumber: 1 } },
						},
						{ myProp: 'value' },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if number has decimal', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint32', fieldNumber: 1 } },
						},
						{ myProp: -1.23 },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if not sint32 range', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint32', fieldNumber: 1 } },
						},
						{ myProp: -2147483649 },
					);
					expect(result).toHaveLength(1);
				});
			});

			describe('sint64', () => {
				it('should return empty error if valid', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint64', fieldNumber: 1 } },
						},
						{ myProp: BigInt(-32) },
					);
					expect(result).toBeEmpty();
				});

				it('should be invalid if not bigint', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint64', fieldNumber: 1 } },
						},
						{ myProp: 32 },
					);
					expect(result).toHaveLength(1);
				});

				it('should be invalid if above sint64 range', () => {
					const result = validator.validate(
						{
							...validSchema,
							properties: { myProp: { dataType: 'sint64', fieldNumber: 1 } },
						},
						{ myProp: BigInt('-9223372036854775809') },
					);
					expect(result).toHaveLength(1);
				});
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
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: '',
						message: 'keyword schema is invalid: data should be number',
						params: {},
						schemaPath: '',
						dataPath: '',
					},
				]),
			);
		});

		it('should not return error if fieldNumber does not start from 1', () => {
			// Arrange
			const schema = cloneDeep(validSchema);
			schema.properties.myProp.fieldNumber = 5;

			// Assert
			expect(() => validator.compile(schema)).not.toThrow();
		});

		it('should return error when fieldNumber less than 1', () => {
			// Arrange
			const schema = cloneDeep(validSchema);
			schema.properties.myProp.fieldNumber = 0;

			// Assert
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: '',
						message: 'keyword schema is invalid: data should be >= 1',
						params: {},
						schemaPath: '',
						dataPath: '',
					},
				]),
			);
		});

		it('should return error when fieldNumber greater than 18999', () => {
			// Arrange
			const schema = cloneDeep(validSchema);
			schema.properties.myProp.fieldNumber = 19000;

			// Assert
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: '',
						message: 'keyword schema is invalid: data should be <= 18999',
						params: {},
						schemaPath: '',
						dataPath: '',
					},
				]),
			);
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
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: 'fieldNumber',
						message: 'Value must be unique across all properties on same level',
						params: { fieldNumbers: [5, 5, 6] },
						schemaPath: '.properties.myProp',
						dataPath: '',
					},
				]),
			);
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
			expect(() => validator.compile(schema)).toThrow(
				new LiskValidationError([
					{
						keyword: 'fieldNumber',
						message: 'Value must be unique across all properties on same level',
						params: { fieldNumbers: [5, 8, 5] },
						schemaPath: '.properties.myThirdProp.properties.childProp',
						dataPath: '',
					},
				]),
			);
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
			expect(() => validator.compile(schema)).not.toThrow();
		});
	});
});
