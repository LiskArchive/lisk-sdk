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
			$id: '/mySchema',
			$schema: 'http://lisk.com/lisk-schema/schema#',
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
			expect(() => validator.validateSchema(validSchema)).not.toThrow();
		});

		it('should return error on schema with type other than "object"', () => {
			const invalidSchema = {
				$id: '/myInvalidSchema',
				$schema: 'http://lisk.com/lisk-schema/schema#',
				type: 'string',
				properties: {},
			};

			const msg = 'Lisk validator found 1 error[s]:\nmust be equal to constant';
			expect(() => validator.validateSchema(invalidSchema)).toThrow(msg);
		});

		it('should return error when "type" is not defined', () => {
			const invalidSchema = { ...validSchema };
			delete (invalidSchema as any).type;

			const msg =
				"Lisk validator found 1 error[s]:\nMissing property, must have required property 'type'";
			expect(() => validator.validateSchema(invalidSchema)).toThrow(msg);
		});

		it('should return error when "$id" is not defined', () => {
			const invalidSchema = { ...validSchema };
			delete (invalidSchema as any).$id;

			const msg =
				"Lisk validator found 1 error[s]:\nMissing property, must have required property '$id'";
			expect(() => validator.validateSchema(invalidSchema)).toThrow(msg);
		});

		// As the schema is always overridden
		it('should not return error when "$schema" is not defined', () => {
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.$schema;

			expect(() => validator.validateSchema(invalidSchema)).not.toThrow();
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
			const invalidSchema = cloneDeep(validSchema);
			delete invalidSchema.properties;

			const msg =
				"Lisk validator found 1 error[s]:\nMissing property, must have required property 'properties'";
			expect(() => validator.validateSchema(invalidSchema)).toThrow(msg);
		});

		it('should return error when "properties" are not camelcase', () => {
			// Arrange
			const invalidSchema = {
				...validSchema,
				...{
					properties: { 'my-custom-prop': { fieldNumber: 1, type: 'string' } },
				},
			};

			const msg =
				'Lisk validator found 2 error[s]:\nProperty \'.properties\' must match format "camelCase"';
			expect(() => validator.validateSchema(invalidSchema)).toThrow(msg);
		});

		it('should not return error when "properties" are empty object', () => {
			const emptySchema = cloneDeep(validSchema);
			delete emptySchema.properties.myProp;

			expect(() => validator.validateSchema(emptySchema)).not.toThrow();
		});
	});
});
