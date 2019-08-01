/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const _ = require('lodash');
const yargs = require('yargs');
const { applicationConfigSchema } = require('../schema');

const { parseEnvArgAndValidate } = require('./../validator');

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
		this.configSchema = _.cloneDeep(applicationConfigSchema);
		this.metaInfo = {};
		this.listOfArgs = new Set();

		this.customData = [];
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
				['_', '$0'],
			);

			if (diff.length) {
				console.error(
					'Invalid command line arguments specified: ',
					diff.join(),
				);
				console.info(this.helpBanner());
				process.exit(1);
			}
		}

		return parseEnvArgAndValidate(
			this.configSchema,
			_.mergeWith(
				{},
				...this.customData,
				overrideValues,
				(objValue, srcValue) => (_.isArray(objValue) ? srcValue : undefined),
			),
		);
	}

	loadConfigFile(configFilePath, destinationPath) {
		// To allow loading up JS exports and JSON files
		// we used the dynamic require instead of fs
		// eslint-disable-next-line import/no-dynamic-require,global-require
		this.loadConfig(require(configFilePath), destinationPath);
	}

	loadConfig(data, destinationPath) {
		this.customData.push(
			destinationPath ? _.set({}, destinationPath, data) : data,
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
						// Yarg is keeping two arguments in case passed in long format
						// Example --http-port, will parse as "httpPort" and "http-port"
						// So we also have to keep both values to check any invalid command line argument
						this.listOfArgs.add(_.camelCase(arg));
						this.listOfArgs.add(arg.replace(/(^--)(.*)/, '$2'));
					});
				}
			}
		});
	}

	helpBanner() {
		const message = [];
		message.push(
			'Your can customize the configuration runtime with following env variables and command line options:\n',
		);
		Object.keys(this.metaInfo).forEach(key => {
			message.push(
				`${(this.metaInfo[key].arg || '').padEnd(15)} ${(
					this.metaInfo[key].env || ''
				).padEnd(25)} ${key}`,
			);
		});

		message.push(
			'\nFor rest of configuration, please modify those directly to your custom config file.\n\n',
		);
		return message.join('\n');
	}

	registerSchema(schema, key) {
		const clonedSchema = _.cloneDeep(schema);

		if (key) {
			_.set(
				this.configSchema,
				`properties.${key.split('.').join('.properties.')}`,
				clonedSchema,
			);
			_.set(this.configSchema, `default.${key}`, clonedSchema.default);
			delete clonedSchema.default;
		} else {
			_.defaultsDeep(this.configSchema, clonedSchema);
		}
		this.extractMetaInformation();
	}
}

module.exports = Configurator;
