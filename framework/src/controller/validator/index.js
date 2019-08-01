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

'use strict';

const assert = require('assert');
const _ = require('lodash');

/**
 * Custom Lisk Framework Validator implemented on top of Ajv (https://github.com/epoberezkin/ajv)
 */
const Ajv = require('ajv');
const ajvKeywords = require('ajv-keywords');
const { SchemaValidationError } = require('../../errors');
const formats = require('./formats');
const ZSchema = require('./z_schema');
const { env: envKeyword, arg: argKeyword } = require('./keywords');

const validator = new Ajv({
	allErrors: true,
	schemaId: 'auto',
	useDefaults: false,
	$data: true,
});

ajvKeywords(validator, 'typeof');

const parserAndValidator = new Ajv({
	allErrors: true,
	schemaId: 'auto',
	useDefaults: false,
	$data: true,
});

ajvKeywords(parserAndValidator, 'typeof');

parserAndValidator.addKeyword('env', envKeyword);
parserAndValidator.addKeyword('arg', argKeyword);

Object.keys(formats).forEach(formatId => {
	validator.addFormat(formatId, formats[formatId]);
});

Object.keys(formats).forEach(formatId => {
	parserAndValidator.addFormat(formatId, formats[formatId]);
});

/**
 * Function helps with loading and validating schemas.
 *
 * @type {{loadSchema: module.exports.loadSchema, validate: (function(*=, *=): boolean)}}
 */
const validatorInterface = {
	/**
	 * Load schema objects to cache and able to resolve the $ref
	 *
	 * @param {Object} schema - All schema objects that you want to cache before validating actual data
	 */
	loadSchema: schema => {
		Object.keys(schema).forEach(key => {
			validator.addSchema(schema[key], schema[key].id);
		});

		Object.keys(schema).forEach(key => {
			parserAndValidator.addSchema(schema[key], schema[key].id);
		});
	},

	/**
	 * Validate data against provided schema.
	 *
	 * @param {Object} schema - JSON Schema object
	 * @param {Object} data - Data object you want to validate
	 * @return {boolean}
	 * @throws Framework.errors.SchemaValidationError
	 */
	validate: (schema, data) => {
		if (!validator.validate(schema, data)) {
			throw new SchemaValidationError(validator.errors);
		}

		return true;
	},

	/**
	 * Validate data against provided schema as well populate the default values
	 *
	 * @param {Object} schema - JSON Schema object
	 * @param {Object} data - Data object you want to validate
	 * @param {Object} defaultValues - Default values you want to use
	 * @return {Object} - Modified data with default values
	 * @throws Framework.errors.SchemaValidationError
	 */
	parseEnvArgAndValidate: (schema, data, defaultValues = schema.default) => {
		const dataCopy = defaultValues
			? _.defaultsDeep(data, defaultValues)
			: { ...data };

		if (!parserAndValidator.validate(schema, dataCopy)) {
			throw new SchemaValidationError(parserAndValidator.errors);
		}

		return dataCopy;
	},

	formats: Object.freeze(formats),

	/**
	 * Validate modules spec.
	 *
	 * @param {Object} moduleSpec - Module Class
	 * @return {boolean}
	 * @throws assert.AssertionError
	 */
	validateModuleSpec: moduleSpec => {
		assert(moduleSpec.constructor.alias, 'Module alias is required.');
		assert(moduleSpec.constructor.info.name, 'Module name is required.');
		assert(moduleSpec.constructor.info.author, 'Module author is required.');
		assert(moduleSpec.constructor.info.version, 'Module version is required.');
		assert(moduleSpec.defaults, 'Module default options are required.');
		assert(moduleSpec.events, 'Module events are required.');
		assert(moduleSpec.actions, 'Module actions are required.');
		assert(moduleSpec.load, 'Module load action is required.');
		assert(moduleSpec.unload, 'Module unload actions is required.');

		return true;
	},

	validator,
	parserAndValidator,

	// TODO: Old interface for validation, must be removed.
	ZSchema,
};

module.exports = validatorInterface;
