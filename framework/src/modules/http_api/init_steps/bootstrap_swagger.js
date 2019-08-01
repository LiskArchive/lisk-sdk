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

const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const bodyParser = require('body-parser');
const queryParser = require('express-query-int');
const methodOverride = require('method-override');
const SwaggerRunner = require('swagger-node-runner');
const swaggerHelper = require('../helpers/swagger');
const { convertErrorsToString } = require('../helpers/error_handlers.js');
const checkIpInList = require('../helpers/check_ip_in_list');
const apiCodes = require('../api_codes');

// Its necessary to require this file to extend swagger validator with our custom formats
require('../helpers/swagger').getValidator();

/**
 * Middleware functions connection logging, api access rules and others.
 * and setup router.
 *
 * @namespace middleware
 * @memberof module:helpers/http_api
 */
const middleware = {
	/**
	 * Logs all api errors.
	 *
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
						message: convertErrorsToString(err),
					},
				],
			});
		}
		logger.error(`API error ${req.url}`, convertErrorsToString(err));
		logger.trace(err);
		return res.status(500).send({
			success: false,
			error: `API error: ${convertErrorsToString(err)}`,
		});
	},

	/**
	 * Logs api client connections.
	 *
	 * @param {Logger} logger
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	logClientConnections(logger, req, res, next) {
		// Log client connections
		logger.debug(`${req.method} ${req.url} from ${req.ip}`);

		return next();
	},

	/**
	 * Attachs header to response.
	 *
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
	 * @param {Object} config
	 * @param {Object} req
	 * @param {Object} res
	 * @param {function} next
	 * @todo Add description for the params
	 * @todo Add @returns tag
	 */
	applyAPIAccessRules(config, req, res, next) {
		if (!config.enabled) {
			return res.status(apiCodes.FORBIDDEN).send({
				message: 'API access disabled',
				errors: ['API is not enabled in this node.'],
			});
		}

		if (
			!config.access.public &&
			!checkIpInList(config.access.whiteList, req.ip)
		) {
			return res.status(apiCodes.FORBIDDEN).send({
				message: 'API access denied',
				errors: ['API access blocked.'],
			});
		}

		if (config.mode === 'READONLY' && req.method !== 'GET') {
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
					parseInt(value, 10).toString() !== String(value) ||
					Number.isNaN(parseInt(value, radix))
				) {
					return value;
				}

				return parseInt(value, 10);
			},
		});
	},
};

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
 * @param {Object} app - An express app to which map the swagger details
 * @param {Object} config - Application Configurations
 * @param {Object} logger - Application Logger
 * @param {Object} scope - Application Scope
 * @param {function} cb - Callback function
 */
function bootstrapSwagger(app, config, logger, scope, cb) {
	// Register modules to be used in swagger fittings
	// eslint-disable-next-line global-require
	require('../helpers/swagger_module_registry').bind(scope);

	// Register the express middleware(s)

	// Restrict access based on rules
	app.use(middleware.applyAPIAccessRules.bind(null, config));

	// Bind each request/response pair to its own domain
	// eslint-disable-next-line global-require
	app.use(require('express-domain-middleware'));

	// Maximum 2mb body size for POST type requests
	app.use(bodyParser.raw({ limit: '2mb' }));

	// Maximum 2mb body size for json type requests
	app.use(bodyParser.json({ limit: '2mb' }));

	// Maximum 2mb body size for URL encoded requests
	app.use(
		bodyParser.urlencoded({
			extended: true,
			limit: '2mb',
			parameterLimit: 5000,
		}),
	);

	// Allow method override for any request
	app.use(methodOverride());

	// Custom query param parsing
	app.use(middleware.queryParser());

	// Log request message
	app.use(middleware.logClientConnections.bind(null, logger));

	/**
	 * Instruct browser to deny display of <frame>, <iframe> regardless of origin.
	 *
	 * RFC -> https://tools.ietf.org/html/rfc7034
	 */
	app.use(
		middleware.attachResponseHeader.bind(null, 'X-Frame-Options', 'DENY'),
	);

	/**
	 * Set Content-Security-Policy headers.
	 *
	 * frame-ancestors - Defines valid sources for <frame>, <iframe>, <object>, <embed> or <applet>.
	 *
	 * W3C Candidate Recommendation -> https://www.w3.org/TR/CSP/
	 */
	app.use(
		middleware.attachResponseHeader.bind(
			null,
			'Content-Security-Policy',
			"frame-ancestors 'none'",
		),
	);

	// Log if there is any error
	app.use(middleware.errorLogger.bind(null, logger));

	// Load Swagger controllers and bind the scope
	const controllerFolder = '/controllers/';
	fs.readdirSync(config.root + controllerFolder).forEach(file => {
		if (path.basename(file) !== 'index.js') {
			// eslint-disable-next-line import/no-dynamic-require,global-require
			require(config.root + controllerFolder + file)(scope);
		}
	});

	const swaggerConfig = {
		appRoot: config.root,
		configDir: `${config.root}/config/swagger`,
		swaggerFile: path.join(`${config.root}/schema/swagger.yml`),
		enforceUniqueOperationId: true,
		startWithErrors: false,
		startWithWarnings: true,
	};

	// Swagger express middleware
	SwaggerRunner.create(swaggerConfig, (errors, runner) => {
		if (errors) {
			// Ignore unused definition warning
			errors.validationWarnings = _.filter(
				errors.validationWarnings,
				error => error.code !== 'UNUSED_DEFINITION',
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

		// Swagger express middleware
		const swaggerExpress = runner.expressMiddleware();

		// Check the response and act appropriately on error
		runner.on('responseValidationError', validationResponse => {
			// TODO: Troubleshoot why default validation hook considers json response as string response
			if (validationResponse.errors[0].code !== 'INVALID_RESPONSE_BODY') {
				logger.error('Swagger Response Validation Errors:');
				logger.error(validationResponse.errors[0].errors);
			}
		});

		// Install middleware
		swaggerExpress.register(app);

		// To be used in test cases or getting configuration runtime
		app.swaggerRunner = runner;

		// Managing all the queries which were not caught by previous middlewares.
		app.use((req, res, next) => {
			// We need to check if the response is already handled by some other middlewares/fittings/controllers
			// In case not, we consider it as 404 and send default response
			// res.headersSent is a patch, and only works if above middlewares set some header no matter the status code
			// Another possible workaround would be res.bodySize === 0
			if (!res.headersSent) {
				res.status(404);
				res.json({ description: 'Page not found' });
			}
			next();
		});

		swaggerHelper
			.getSchemaAsJSON()
			.then(resolvedSchema => {
				// Successfully mounted the swagger runner
				cb(null, {
					swaggerRunner: runner,
					definitions: resolvedSchema.definitions,
				});
			})
			.catch(reason => {
				logger.error(reason.toString());
				cb(reason);
			});
	});
}

const promisifiedBootstrapSwagger = promisify(bootstrapSwagger);

module.exports = (scope, expressApp) =>
	promisifiedBootstrapSwagger(
		expressApp,
		scope.config,
		scope.components.logger,
		scope,
	);
