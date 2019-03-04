/*
 * Copyright © 2018 Lisk Foundation
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

const path = require('path');
const _ = require('lodash');
const queryParser = require('express-query-int');
const Bignum = require('bignumber.js');
const SwaggerRunner = require('swagger-node-runner');
const swaggerHelper = require('../helpers/swagger');
const checkIpInList = require('./check_ip_in_list');
const apiCodes = require('./api_codes');

// Its necessary to require this file to extend swagger validator with our custom formats
require('./swagger').getValidator();

/**
 * A utility helper module to provide different express middleware to be used in http request cycle
 *
 * @module
 * @see Parent: {@link helpers}
 * @requires extend
 * @requires lodash
 * @requires api_codes
 * @requires helpers/check_ip_in_list
 * @property {Object} middleware
 * @todo Add description for the module and the properties
 */

/**
 * Middleware functions connection logging, api access rules and others.
 * and setup router.
 *
 * @namespace middleware
 * @see Parent: {@link module:helpers/http_api}
 * @memberof module:helpers/http_api
 */
const middleware = {
	/**
	 * Logs all api errors.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Logger} logger
	 * @param {Error} err
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	errorLogger(logger, err, req, res, next) {
		if (!err) {
			return next();
		}
		if (err.status === 400 && err.name === 'SyntaxError') {
			// Express JSON body-parser throws an error with status === 400 if the
			// payload cannot be parsed to valid JSON, in this case we want to send
			// a response with status code 400.
			return res.status(400).send({
				message: 'Parse errors',
				errors: [
					{
						code: 'INVALID_REQUEST_PAYLOAD',
						name: 'payload',
						in: 'query',
						message: err.message,
					},
				],
			});
		}
		logger.error(`API error ${req.url}`, err.message);
		logger.trace(err);
		return res
			.status(500)
			.send({ success: false, error: `API error: ${err.message}` });
	},

	/**
	 * Logs api client connections.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Logger} logger
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	logClientConnections(logger, req, res, next) {
		// Log client connections
		logger.log(`${req.method} ${req.url} from ${req.ip}`);

		return next();
	},

	/**
	 * Attachs header to response.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {string} headerKey
	 * @param {string} headerValue
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	attachResponseHeader(headerKey, headerValue, req, res, next) {
		res.setHeader(headerKey, headerValue);
		return next();
	},

	/**
	 * Applies rules of public / internal API described in config.json.
	 *
	 * @memberof module:helpers/http_api.middleware
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	applyAPIAccessRules(config, req, res, next) {
		if (!config.api.enabled) {
			return res.status(apiCodes.FORBIDDEN).send({
				message: 'API access disabled',
				errors: ['API is not enabled in this node.'],
			});
		}

		if (
			!config.api.access.public &&
			!checkIpInList(config.api.access.whiteList, req.ip)
		) {
			return res.status(apiCodes.FORBIDDEN).send({
				message: 'API access denied',
				errors: ['API access blocked.'],
			});
		}

		if (config.api.mode === 'READONLY' && req.method !== 'GET') {
			return res.status(apiCodes.FORBIDDEN).send({
				message: 'API write access denied',
				errors: ['API write access blocked.'],
			});
		}
		return next();
	},

	queryParser() {
		const ignoredPramList = [
			'id',
			'name',
			'username',
			'blockId',
			'transactionId',
			'address',
			'recipientId',
			'senderId',
			'search',
			'data',
		];

		return queryParser({
			parser(value, radix, name) {
				if (ignoredPramList.indexOf(name) >= 0) {
					return value;
				}

				// Ignore conditional fields for transactions list
				if (/^.+?:(blockId|recipientId|senderId)$/.test(name)) {
					return value;
				}

				if (
					Number.isNaN(value) ||
					parseInt(value).toString() !== String(value) ||
					Number.isNaN(parseInt(value, radix))
				) {
					return value;
				}

				return parseInt(value);
			},
		});
	},
};

// TODO: Move this method to better directory structure, as its not directly related to HTTP
function calculateApproval(votersBalance, totalSupply) {
	// votersBalance and totalSupply are sent as strings,
	// we convert them into bignum and send the response as number as well
	const votersBalanceBignum = new Bignum(votersBalance || 0);
	const totalSupplyBignum = new Bignum(totalSupply);
	const approvalBignum = votersBalanceBignum
		.dividedBy(totalSupplyBignum)
		.multipliedBy(100)
		.decimalPlaces(2);

	return !approvalBignum.isNaN() ? approvalBignum.toNumber() : 0;
}

/**
 * Configure swagger node runner with the app.
 * It loads the swagger specification and maps everything with an active express app.
 *
 * @module
 * @see Parent: {@link config}
 * @requires fs
 * @requires js-yaml
 * @requires path
 * @requires swagger-node-runner
 * @param {Object} config - Application Configurations
 * @param {Object} logger - Application Logger
 * @param {Object} scope - Application Scope
 * @param {function} cb - Callback function
 */
function bootstrapSwagger(config, logger, scope, cb) {
	// Register modules to be used in swagger fittings
	require('../helpers/swagger_module_registry').bind(scope);

	const swaggerConfig = {
		appRoot: config.root,
		configDir: `${config.root}/config/swagger`,
		swaggerFile: path.join(`${config.root}/schema/swagger.yml`),
		enforceUniqueOperationId: true,
		startWithErrors: false,
		startWithWarnings: true,
	};

	// Swagger express middleware
	SwaggerRunner.create(swaggerConfig, errors => {
		if (errors) {
			// Ignore unused definition warning
			errors.validationWarnings = _.filter(
				errors.validationWarnings,
				error => error.code !== 'UNUSED_DEFINITION'
			);

			// Some error occurred in configuring the swagger
			if (!_.isEmpty(errors.validationErrors)) {
				logger.error('Swagger Validation Errors:');
				logger.error(errors.validationErrors);
			}

			if (!_.isEmpty(errors.validationWarnings)) {
				logger.error('Swagger Validation Warnings:');
				logger.error(errors.validationWarnings);
			}

			if (
				!_.isEmpty(errors.validationErrors) ||
				!_.isEmpty(errors.validationWarnings)
			) {
				cb(errors);
				return;
			}
		}

		swaggerHelper
			.getResolvedSwaggerSpec()
			.then(resolvedSchema => {
				// Successfully mounted the swagger runner
				cb(null, {
					definitions: resolvedSchema.definitions,
				});
			})
			.catch(reason => {
				logger.error(reason.toString());
				cb(reason);
			});
	});
}

module.exports = {
	middleware,
	bootstrapSwagger,
	calculateApproval,
};
