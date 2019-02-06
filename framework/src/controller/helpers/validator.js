const Ajv = require('ajv');
const { SchemaValidationError } = require('../../errors');

const validator = new Ajv({ allErrors: true, schemaId: 'auto' });

/**
 * @namespace Framework.helpers
 * @type {{loadSchema: module.exports.loadSchema, validate: (function(*=, *=): boolean)}}
 */
module.exports = {
	/**
	 * Load schema objects to cache and able to resolve the $ref
	 *
	 * @param {Object} schema - All schema objects that you want to cache before validating actual data
	 */
	loadSchema: schema => {
		Object.keys(schema).forEach(key => {
			validator.addSchema(schema[key], schema[key].id);
		});
	},

	/**
	 * Validate data against provided schema
	 *
	 * @param {Object} schema - JSON Schema object
	 * @param {Object} data - Data object you want to validate
	 * @return {boolean}
	 * @throws Framework.errors.SchemaValidationError
	 */
	validate: (schema, data) => {
		if (!validator.validate(schema, data)) {
			throw new SchemaValidationError(validator.errors);
		}

		return true;
	},
};
