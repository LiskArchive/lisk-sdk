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
					name: schema[0],
					formatter: formatters[schema[1]] || null,
				};

	return function(data, dataPath, object, key) {
		const variableValue = process.env[envVariable.name];

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
