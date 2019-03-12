const debug = require('debug')('lisk:validator:arg');
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
					names: schema[0].split(',') || [],
					formatter: formatters[schema[1]] || null,
				};

	return function(data, dataPath, object, key) {
		let argValue;

		const commandLineArguments = _reduceProcessArgvArray();
		argVariable.names.forEach(argName => {
			if (!argValue) {
				argValue = commandLineArguments[argName] || undefined;
			}
		});

		if (argValue) {
			object[key] = argVariable.formatter
				? argVariable.formatter(argValue)
				: argValue;
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
