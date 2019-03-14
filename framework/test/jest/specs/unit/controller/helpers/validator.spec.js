const Ajv = require('ajv');
const {
	validator,
	loadSchema,
	validate,
	ZSchema,
} = require('../../../../../../src/controller/helpers/validator');
const { SchemaValidationError } = require('../../../../../../src/errors');

jest.mock('ajv');

describe('helpers/validator.js', () => {
	describe('Ajv instance', () => {
		it('should be created by given arguments.', () => {
			// Assert
			expect(Ajv).toHaveBeenCalledWith({ allErrors: true, schemaId: 'auto' });
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
});
