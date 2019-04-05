const debug = require('debug')('lisk:validator:arg');
const yargs = require('yargs');
const _ = require('lodash');
const formatters = require('../formatters');
const metaSchema = require('./meta_schema');

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);

	const argVariable =
		typeof schema === 'string'
			? {
					names: schema.split(',') || [],
					formatter: null,
				}
			: {
					names: schema.name.split(',') || [],
					formatter: formatters[schema.formatter] || null,
				};

	return function(data, dataPath, object, key) {
		let argValue;
		const commandLineArguments = yargs.argv;

		argVariable.names.forEach(argName => {
			if (!argValue) {
				argValue = commandLineArguments[_.camelCase(argName)] || undefined;
			}
		});

		if (argValue) {
			object[key] = argVariable.formatter
				? argVariable.formatter(argValue)
				: argValue;
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
