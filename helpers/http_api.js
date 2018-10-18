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

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var bodyParser = require('body-parser');
var queryParser = require('express-query-int');
var methodOverride = require('method-override');
var SwaggerRunner = require('swagger-node-runner');
var swaggerHelper = require('../helpers/swagger');
var checkIpInList = require('./check_ip_in_list');
var apiCodes = require('./api_codes');

// Its necessary to require this file to extend swagger validator with our custom formats
require('./swagger').getValidator();

/**
 * A utility helper module to provide different express middleware to be used in http request cycle
 *
 * @module
 * @see Parent: {@link helpers}
 * @requires extend
 * @requires lodash
 * @requires helpers/api_codes
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
var middleware = {
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
			res.status(400).send({
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
		} else {
			logger.error(`API error ${req.url}`, err.message);
			logger.trace(err);
			res
				.status(500)
				.send({ success: false, error: `API error: ${err.message}` });
		}
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
			res
				.status(apiCodes.INTERNAL_SERVER_ERROR)
				.send({ success: false, error: 'API access disabled' });
		} else if (
			!config.api.access.public &&
			!checkIpInList(config.api.access.whiteList, req.ip)
		) {
			res
				.status(apiCodes.FORBIDDEN)
				.send({ success: false, error: 'API access denied' });
		} else {
			next();
		}
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
					isNaN(value) ||
					parseInt(value) != value ||
					isNaN(parseInt(value, radix))
				) {
					return value;
				}

				return parseInt(value);
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
 * @returns {void}
 */
function bootstrapSwagger(app, config, logger, scope, cb) {
	// Register modules to be used in swagger fittings
	require('../helpers/swagger_module_registry').bind(scope);

	// Register the express middleware(s)

	// Restrict access based on rules
	app.use(middleware.applyAPIAccessRules.bind(null, config));

	// Bind each request/response pair to its own domain
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
		})
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
		middleware.attachResponseHeader.bind(null, 'X-Frame-Options', 'DENY')
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
			"frame-ancestors 'none'"
		)
	);

	// Log if there is any error
	app.use(middleware.errorLogger.bind(null, logger));

	// Load Swagger controllers and bind the scope
	var controllerFolder = '/api/controllers/';
	fs.readdirSync(config.root + controllerFolder).forEach(file => {
		if (path.basename(file) !== 'index.js') {
			// eslint-disable-next-line import/no-dynamic-require
			require(config.root + controllerFolder + file)(scope);
		}
	});

	var swaggerConfig = {
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

		// Swagger express middleware
		var swaggerExpress = runner.expressMiddleware();

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
			.getResolvedSwaggerSpec()
			.then(resolvedSchema => {
				// Successfully mounted the swagger runner
				cb(null, {
					swaggerRunner: runner,
					definitions: resolvedSchema.definitions,
				});
			})
			.catch(reason => {
				cb(reason);
			});
	});
}

module.exports = {
	middleware,
	bootstrapSwagger,
};
