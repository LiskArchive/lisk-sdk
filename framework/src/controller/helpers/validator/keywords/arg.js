const debug = require('debug')('lisk:validator:arg');
const commandLineArguments = require('yargs').argv;
const _ = require('lodash');
const formatters = require('./formatters');

const metaSchema = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-][a-z][a-z0-9]*)(,[-]{2}[a-z][a-z0-9-]*)?$',
		},
		{
			type: 'array',
			items: [
				{
					type: 'string',
					pattern: '^([-][a-z][a-z0-9]*)(,[-]{2}[a-z][a-z0-9-]*)?$',
				},
				{
					type: 'string',
					enum: Object.keys(formatters),
				},
			],
			minItems: 2,
			maxItems: 2,
		},
	],
};

const extractArgsNames = arg => {
	const args = arg.split(',');
	if (args.length === 1) {
		const option = _.camelCase(args[0]);
		return [option];
	}

	if (args.length === 2) {
		const option = _.camelCase(args[0]);
		const alias = _.camelCase(args[1]);
		return [option, alias];
	}

	return [];
};

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);
	let argNames;
	let argsFormatter;

	if (typeof schema === 'string') {
		argNames = extractArgsNames(schema);
		argsFormatter = null;
	} else if (Array.isArray(schema)) {
		argNames = extractArgsNames(schema[0]);
		argsFormatter = formatters[schema[1]] || null;
	}

	return function(data, dataPath, object, key) {
		let argValue;

		argNames.forEach(argName => {
			if (!argValue) {
				argValue = commandLineArguments[argName] || undefined;
			}
		});

		if (argValue) {
			object[key] = argsFormatter ? argsFormatter(argValue) : argValue;
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
