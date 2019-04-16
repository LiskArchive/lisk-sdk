const _ = require('lodash');
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
	 * @param {Object | Array.<Object>} data - Array of
	 */
	parseMergeAndValidate(data) {
		return parseEnvArgAndValidate(
			this.configSchema,
			_.defaultsDeep(..._.flatten([data]).reverse())
		);
	}

	/**
	 * Parse env variables and command line options and merge them together with defaults
	 * to generate one final unified configuration
	 *
	 * @param {Object | Array.<Object>} data - Array of
	 */
	validate(data) {
		return parseEnvArgAndValidate(
			this.configSchema,
			..._.defaultsDeep(_.flatten([data]).reverse())
		);
	}

	extractMetaInformation() {
		this.metaInfo = {};

		traverseObject(this.configSchema, (key, value, parentPath) => {
			if (key === 'env' || key === 'arg') {
				const parentHumanPath = sanitizeSchemaKeys(parentPath);
				this.metaInfo[parentHumanPath] = this.metaInfo[parentHumanPath] || {};
				this.metaInfo[parentHumanPath].description = _.get(this.configSchema, parentPath).description || '';

				if (key === 'env') {
					this.metaInfo[parentHumanPath].env = (typeof value === 'object') ? value.variable : value;
				} else {
					this.metaInfo[parentHumanPath].arg = (typeof value === 'object') ? value.name : value;
				}
			}
		});
	}

	helpBanner() {
		const message = [];
		message.push('Your can customize the configuration runtime with following env variables and command line options:');
		Object.keys(this.metaInfo).forEach(key => {
			message.push(`${[this.metaInfo[key].arg, this.metaInfo[key].env].filter(Boolean).join()}				${key}`);
		});

		message.push('For rest of configuration, please modify those directly to your custom config file.');
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

module.exports = configurator;
