const Ajv = require('ajv');
const { SchemaValidationError } = require('../../errors');

const validator = new Ajv({ allErrors: true, schemaId: 'auto' });

module.exports = {
	loadSchema: schema => {
		Object.keys(schema).forEach(key => {
			validator.addSchema(schema[key], schema[key].id);
		});
	},

	validate: (schema, data) => {
		if (!validator.validate(schema, data)) {
			throw new SchemaValidationError(validator.errors);
		}

		return true;
	},
};
