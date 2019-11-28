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

const fs = require('fs');
const path = require('path');
const jsonRefs = require('json-refs');
const _ = require('lodash');
const YAML = require('js-yaml');
const SwayHelpers = require('sway/lib/helpers');
const { formats } = require('../../../controller/validator');

// Used as private member to cache the spec resolution process
let resolvedSwaggerSpec = null;

function getValidator() {
	// Get validator instace attached to Swagger
	const validator = SwayHelpers.getJSONSchemaValidator();

	// Register lisk formats with swagger
	Object.keys(formats).forEach(formatName => {
		// Extend swagger validator with our formats
		validator.constructor.registerFormat(formatName, formats[formatName]);
	});

	return validator;
}

function getSchema() {
	return YAML.safeLoad(
		fs.readFileSync(path.join(__dirname, '..', 'schema', 'swagger.yml')),
	);
}

function getSchemaAsJSON() {
	if (resolvedSwaggerSpec) {
		return Promise.resolve(resolvedSwaggerSpec);
	}
	const content = getSchema();

	const options = {
		includeInvalid: true,
		loaderOptions: {
			processContent(processedContent, callback) {
				callback(null, YAML.safeLoad(processedContent.text));
			},
		},
	};

	return jsonRefs.resolveRefs(content, options).then(results => {
		resolvedSwaggerSpec = results.resolved;
		return resolvedSwaggerSpec;
	});
}

function generateParamsErrorObject(params, messages, codes) {
	if (!codes) {
		codes = [];
	}

	const error = new Error('Validation errors');
	error.statusCode = 400;

	error.errors = params.map((p, i) => {
		const def = p.parameterObject;

		if (def) {
			return {
				name: def.name,
				message: messages[i],
				in: def.in,
				code: codes[i] || 'INVALID_PARAM',
			};
		}
		return {
			name: p,
			message: 'Unknown request parameter',
			in: 'query',
			code: codes[i] || 'UNKNOWN_PARAM',
		};
	});

	return error;
}

function invalidParams(request) {
	const swaggerParams = Object.keys(request.swagger.params);
	const requestParams = Object.keys(request.query);

	return _.difference(requestParams, swaggerParams);
}

module.exports = {
	getValidator,
	getSchemaAsJSON,
	getSchema,
	generateParamsErrorObject,
	invalidParams,
};
