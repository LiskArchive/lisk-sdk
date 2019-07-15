/*
 * Copyright © 2018 Lisk Foundation
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
	validator,
	parserAndValidator,
	loadSchema,
	validate,
	parseEnvArgAndValidate,
	ZSchema,
} = require('../../../../../../../src/controller/validator');
const formats = require('../../../../../../../src/controller/validator/formats');
const {
	env,
	arg,
} = require('../../../../../../../src/controller/validator/keywords');
const { SchemaValidationError } = require('../../../../../../../src/errors');

jest.mock('ajv');
jest.mock('ajv-keywords');

describe('validator.js', () => {
	describe('Ajv instance', () => {
		it('should be created by given arguments.', () => {
			// Assert
			expect(Ajv).toHaveBeenCalledWith({
				allErrors: true,
				schemaId: 'auto',
				useDefaults: false,
				$data: true,
			});
			expect(validator).toBeInstanceOf(Ajv);
		});

		it('should load lisk validation formats after initialized .', () => {
			// Assert
			Object.keys(ZSchema.formatsCache).forEach(zSchemaType => {
				expect(validator.addFormat).toHaveBeenCalledWith(
					zSchemaType,
					ZSchema.formatsCache[zSchemaType]
				);
			});
		});
	});

	describe('Ajv instance with keyword parser', () => {
		it('should be created by given arguments.', () => {
			// Assert
			expect(Ajv).toHaveBeenCalledWith({
				allErrors: true,
				schemaId: 'auto',
				useDefaults: false,
				$data: true,
			});
			expect(parserAndValidator).toBeInstanceOf(Ajv);
		});

		it('should load lisk validation formats after initialized .', () => {
			// Assert
			Object.keys(formats).forEach(formatType => {
				expect(parserAndValidator.addFormat).toHaveBeenCalledWith(
					formatType,
					formats[formatType]
				);
			});
		});

		it('should load env keyword after initialized .', () => {
			expect(parserAndValidator.addKeyword).toHaveBeenCalledWith('env', env);
		});

		it('should load arg keyword after initialized .', () => {
			expect(parserAndValidator.addKeyword).toHaveBeenCalledWith('arg', arg);
		});
	});

	describe('loadSchema()', () => {
		it('should add given schemas', () => {
			// Arrange
			const schema = {
				dummy1: {
					id: 'dummyId1',
					type: 'string',
				},
				dummy2: {
					id: 'dummyId2',
					type: 'string',
				},
			};

			// Act
			loadSchema(schema);

			// Assert
			expect(validator.addSchema).toHaveBeenCalledWith(
				schema.dummy1,
				schema.dummy1.id
			);

			expect(validator.addSchema).toHaveBeenCalledWith(
				schema.dummy2,
				schema.dummy2.id
			);
		});
	});

	describe('validate()', () => {
		it('should call validate method with given arguments', () => {
			// Arrange
			const schema = '#SCHEMA';
			const data = '#DATA';
			jest.spyOn(validator, 'validate').mockImplementation(() => true);

			// Act
			validate(schema, data);

			// Assert
			expect(validator.validate).toHaveBeenCalledWith(schema, data);
		});

		it('should throw "SchemaValidationError" when validation fails', () => {
			// Arrange
			jest.spyOn(validator, 'validate').mockImplementation(() => false);

			// Act & Assert
			expect(validate).toThrow(SchemaValidationError);
		});
	});

	describe('parseEnvArgAndValidate()', () => {
		it('should call validate method with given arguments', () => {
			// Arrange
			const schema = '#SCHEMA';
			const data = { myData: '#DATA' };
			jest.spyOn(parserAndValidator, 'validate').mockImplementation(() => true);

			// Act
			parseEnvArgAndValidate(schema, data);

			// Assert
			expect(parserAndValidator.validate).toHaveBeenCalledWith(schema, data);
		});

		it('should throw "SchemaValidationError" when validation fails', () => {
			// Arrange
			jest
				.spyOn(parserAndValidator, 'validate')
				.mockImplementation(() => false);

			// Act & Assert
			expect(() => {
				parseEnvArgAndValidate({});
			}).toThrow(SchemaValidationError);
		});
	});
});
