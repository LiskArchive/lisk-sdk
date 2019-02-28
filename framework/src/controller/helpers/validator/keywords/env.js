const debug = require('debug')('lisk:validator:env');

const formatters = {
	format1: value => value,
};

const metaSchema = {
	title: 'Env variables',
	anyOf: [
		{
			type: 'string',
			pattern: '^[A-Z_0-9]{3,}$',
		},
		{
			type: 'array',
			items: [
				{
					type: 'string',
					pattern: '^[A-Z_0-9]{3,}$',
				},
				{
					type: 'string',
					enum: Object.keys(formatters),
				},
			],
			minItems: 1,
			maxItems: 2,
		},
	],
};

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);

	let envVariableName;
	let variableFormatter;

	if (typeof schema === 'string') {
		envVariableName = schema;
		variableFormatter = null;
	} else {
		envVariableName = schema[0];
		variableFormatter = formatters[schema[1]] || null;
	}

	return function(data, dataPath, object, key) {
		const variableValue = process.env[envVariableName];

		if (variableValue) {
			object[key] = variableFormatter
				? variableFormatter(variableValue)
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
