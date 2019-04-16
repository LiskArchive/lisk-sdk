const _ = require('lodash');
const yargs = require('yargs');
const { config: loggerConfig } = require('../../components/logger/defaults');
const { config: storageConfig } = require('../../components/storage/defaults');
const { config: cacheConfig } = require('../../components/cache/defaults');
const chainModule = require('../../modules/chain');
const APIModule = require('../../modules/http_api');
const { config: appConfig } = require('../schema/application');

const { parseEnvArgAndValidate } = require('./validator');

const sanitizeSchemaKeys = (keyString, extraKeyToRemove) =>
	keyString.replace(new RegExp(`properties.|(${extraKeyToRemove})`, 'g'), '');

const traverseObject = (o, func, parent = undefined) => {
	Object.keys(o).forEach(key => {
		func.apply(o, [key, o[key], parent]);
		if (o[key] !== null && typeof o[key] === 'object') {
			if (parent) {
				traverseObject(o[key], func, `${parent}.${key}`);
			} else {
				traverseObject(o[key], func, key);
			}
		}
	});
};

class Configurator {
	constructor() {
		this.configSchema = appConfig;
		this.metaInfo = {};
		this.listOfArgs = new Set();

		this.customData = [];

		this.registerSchema(loggerConfig, 'components.logger');
		this.registerSchema(storageConfig, 'components.storage');
		this.registerSchema(cacheConfig, 'components.cache');
	}

	registerModule(moduleKlass) {
		this.registerSchema(moduleKlass.defaults, `modules.${moduleKlass.alias}`);
	}

	/**
	 * Parse env variables and command line options and merge them together with defaults
	 * to generate one final unified configuration
	 *
	 * @param {Object} overrideValues - Object to override the values
	 * @param {Object} options - Options
	 * @param {boolean} options.failOnInvalidArg - Check all arguments against schema and fail if invalid argument passed to script
	 */
	getConfig(overrideValues = {}, options = { failOnInvalidArg: true }) {
		if (options.failOnInvalidArg) {
			const diff = _.difference(
				Object.keys(yargs.argv),
				[...this.listOfArgs],
				['_', '$0']
			);

			if (diff.length) {
				console.error(
					'Invalid command line arguments specified: ',
					diff.join()
				);
				console.info(this.helpBanner());
				process.exit(1);
			}
		}

		return parseEnvArgAndValidate(
			this.configSchema,
			_.defaultsDeep(...[...this.customData, overrideValues])
		);
	}

	loadConfigFile(configFilePath, destinationPath) {
		// To allow loading up JS exports and JSON files
		// we used the dynamic require instead of fs
		// eslint-disable-next-line import/no-dynamic-require
		this.loadConfig(require(configFilePath), destinationPath);
	}

	loadConfig(data, destinationPath) {
		this.customData.push(
			destinationPath ? _.set({}, destinationPath, data) : data
		);
	}

	extractMetaInformation() {
		this.metaInfo = {};

		traverseObject(this.configSchema, (key, value, parentPath) => {
			if (key === 'env' || key === 'arg') {
				const parentHumanPath = sanitizeSchemaKeys(parentPath);
				this.metaInfo[parentHumanPath] = this.metaInfo[parentHumanPath] || {};
				this.metaInfo[parentHumanPath].description =
					_.get(this.configSchema, parentPath).description || '';

				if (key === 'env') {
					this.metaInfo[parentHumanPath].env =
						typeof value === 'object' ? value.variable : value;
				} else {
					this.metaInfo[parentHumanPath].arg =
						typeof value === 'object' ? value.name : value;

					this.metaInfo[parentHumanPath].arg.split(',').forEach(arg => {
						this.listOfArgs.add(_.camelCase(arg));
					});
				}
			}
		});
	}

	helpBanner() {
		const message = [];
		message.push(
			'Your can customize the configuration runtime with following env variables and command line options:\n'
		);
		Object.keys(this.metaInfo).forEach(key => {
			message.push(
				`${(this.metaInfo[key].arg || '').padEnd(15)} ${(
					this.metaInfo[key].env || ''
				).padEnd(25)} ${key}`
			);
		});

		message.push(
			'\nFor rest of configuration, please modify those directly to your custom config file.\n\n'
		);
		return message.join('\n');
	}

	registerSchema(schema, key) {
		if (key) {
			_.set(
				this.configSchema,
				`properties.${key.split('.').join('.properties.')}`,
				schema
			);
			_.set(this.configSchema, `default.${key}`, schema.default);
			delete schema.default;
		} else {
			_.defaultsDeep(this.configSchema, schema);
		}
		this.extractMetaInformation();
	}
}

const configurator = new Configurator();

configurator.registerModule(chainModule);
configurator.registerModule(APIModule);

yargs.command(
	'usage',
	'Show list of supported command line arguments and environment variables.',
	() => {
		console.info(configurator.helpBanner());
		process.exit();
	}
);
yargs.help('help', 'Run the "usage" command to see full list of options');

module.exports = configurator;
