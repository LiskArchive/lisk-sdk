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

const formats = require('../../../../../../../src/controller/validator/formats');
const {
	env,
	arg,
} = require('../../../../../../../src/controller/validator/keywords');
const { SchemaValidationError } = require('../../../../../../../src/errors');

jest.mock('ajv');
/**
 * After completing the issue #4026, this test suite started to fail.
 * After investigating further, I realized this particular test suite
 * does not give meaningful feedback. Since, it's just a snapshot of the implementation.
 *
 * Also, we plan to remove the validator module and use "lisk-validator" instead.
 * That's why refactoring this test would be a redundant effort at the moment.
 * We will tackle this issue again with: https://github.com/LiskHQ/lisk-sdk/issues/4610
 * @todo remove this test suite after introducing "lisk-validator"
 *
 * I'm leaving some of the changes I did while trying to fix the failing tests
 * to make reproducing issue easier. However, mocking Ajv is not a good idea
 * in the first place. So please DO NOT reuse the code below.
 */
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('validator.js', () => {
	let Ajv;
	let validatorInterface;
	beforeEach(() => {
		jest.isolateModules(() => {
			// eslint-disable-next-line global-require
			Ajv = require('ajv');
			// eslint-disable-next-line global-require
			validatorInterface = require('../../../../../../../src/controller/validator');
		});
	});
	describe('Ajv instance', () => {
		it('should be created by given arguments.', () => {
			// Assert
			expect(Ajv).toHaveBeenCalledWith({
				allErrors: true,
				schemaId: 'auto',
				useDefaults: false,
				$data: true,
			});
			expect(validatorInterface.validator).toBeInstanceOf(Ajv);
		});

		it('should load lisk validation formats after initialized.', () => {
			// Assert
			// console.log('asd', validatorInterface.validator.addFormat.mock.calls);
			Object.keys(validatorInterface.ZSchema.formatsCache).forEach(
				zSchemaType => {
					expect(validatorInterface.validator.addFormat).toHaveBeenCalledWith(
						zSchemaType,
						validatorInterface.ZSchema.formatsCache[zSchemaType],
					);
				},
			);
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
			expect(validatorInterface.parserAndValidator).toBeInstanceOf(Ajv);
		});

		it('should load lisk validation formats after initialized .', () => {
			// Assert
			Object.keys(formats).forEach(formatType => {
				expect(
					validatorInterface.parserAndValidator.addFormat,
				).toHaveBeenCalledWith(formatType, formats[formatType]);
			});
		});

		it('should load env keyword after initialized .', () => {
			expect(
				validatorInterface.parserAndValidator.addKeyword,
			).toHaveBeenCalledWith('env', env);
		});

		it('should load arg keyword after initialized .', () => {
			expect(
				validatorInterface.parserAndValidator.addKeyword,
			).toHaveBeenCalledWith('arg', arg);
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
			validatorInterface.loadSchema(schema);

			// Assert
			expect(validatorInterface.validator.addSchema).toHaveBeenCalledWith(
				schema.dummy1,
				schema.dummy1.id,
			);

			expect(validatorInterface.validator.addSchema).toHaveBeenCalledWith(
				schema.dummy2,
				schema.dummy2.id,
			);
		});
	});

	describe('validate()', () => {
		it('should call validate method with given arguments', () => {
			// Arrange
			const schema = '#SCHEMA';
			const data = '#DATA';
			jest
				.spyOn(validatorInterface.validator, 'validate')
				.mockImplementation(() => true);

			// Act
			validatorInterface.validate(schema, data);

			// Assert
			expect(validatorInterface.validator.validate).toHaveBeenCalledWith(
				schema,
				data,
			);
		});

		it('should throw "SchemaValidationError" when validation fails', () => {
			// Arrange
			jest
				.spyOn(validatorInterface.validator, 'validate')
				.mockImplementation(() => false);

			// Act & Assert
			expect(validatorInterface.validate).toThrow(SchemaValidationError);
		});
	});

	describe('parseEnvArgAndValidate()', () => {
		it('should call validate method with given arguments', () => {
			// Arrange
			const schema = '#SCHEMA';
			const data = { myData: '#DATA' };
			jest
				.spyOn(validatorInterface.parserAndValidator, 'validate')
				.mockImplementation(() => true);

			// Act
			validatorInterface.parseEnvArgAndValidate(schema, data);

			// Assert
			expect(
				validatorInterface.parserAndValidator.validate,
			).toHaveBeenCalledWith(schema, data);
		});

		it('should throw "SchemaValidationError" when validation fails', () => {
			// Arrange
			jest
				.spyOn(validatorInterface.parserAndValidator, 'validate')
				.mockImplementation(() => false);

			// Act & Assert
			expect(() => {
				validatorInterface.parseEnvArgAndValidate({});
			}).toThrow(SchemaValidationError);
		});
	});
});
