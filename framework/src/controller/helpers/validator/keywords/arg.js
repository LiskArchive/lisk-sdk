const debug = require('debug')('lisk:validator:arg');
const formatters = require('./formatters');

const metaSchema = {
	title: 'Command line arguments',
	anyOf: [
		{
			type: 'string',
			pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
		},
		{
			type: 'array',
			items: [
				{
					type: 'string',
					pattern: '^([-][a-z]{1,1})(,[-]{2}[a-z][a-z0-9-]*)?$',
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

const compile = (schema, parentSchema) => {
	debug('compile: schema: %j', schema);
	debug('compile: parent schema: %j', parentSchema);
	let argNames;
	let argsFormatter;

	if (typeof schema === 'string') {
		argNames = schema.split(',');
		argsFormatter = null;
	} else if (Array.isArray(schema)) {
		argNames = schema[0].split(',');
		argsFormatter = formatters[schema[1]] || null;
	}

	argNames = argNames || [];

	return function(data, dataPath, object, key) {
		let argValue;

		const commandLineArguments = _reduceProcessArgvArray();
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

/**
 * First two argv elements are always the same and we can skip them:
 * 0 - Node interpreter path
 * 1 - application entry file
 * The following arguments match into aggregated map.
 * For instance array ["-n", "testnet", "-c", "config.json"]
 * is converted into {"-n": "testnet", "-c", "config.json"}
 * @private
 */
const _reduceProcessArgvArray = () =>
	process.argv.slice(2).reduce((argvAsMap, argvElement, index, argvArray) => {
		if (index % 2 === 1) {
			argvAsMap[argvArray[index - 1]] = argvElement;
		}
		return argvAsMap;
	}, {});

const envKeyword = {
	compile,
	errors: false,
	modifying: true,
	valid: true,
	metaSchema,
};

module.exports = envKeyword;
