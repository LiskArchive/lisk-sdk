const debug = require('debug')('lisk:validator:env');
const formatters = require('../formatters');
const metaSchema = require('./meta_schema');

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);

	const envVariable =
		typeof schema === 'string'
			? {
					name: schema,
					formatter: null,
			  }
			: {
					name: schema.variable,
					formatter: formatters[schema.formatter] || null,
			  };

	return function(data, dataPath, object, key) {
		let variableValue = process.env[envVariable.name];

		// Formatting logic to automatically format the CLI value to the expected type
		// Only format if the variable exist
		if (process.env[envVariable.name] !== undefined) {
			// eslint-disable-next-line default-case
			switch (parentSchema.type) {
				case 'array':
					variableValue = variableValue.split(',');
					break;
				case 'integer':
					variableValue = parseInt(variableValue, 10);
					break;
				case 'boolean':
					variableValue = JSON.parse(variableValue);
			}
		}

		if (variableValue) {
			object[key] = envVariable.formatter
				? envVariable.formatter(variableValue)
				: variableValue;
		}
	};
};

const envKeyword = {
	compile,
	errors: false,
	modifying: true,
	valid: true,
	metaSchema,
};

module.exports = envKeyword;
