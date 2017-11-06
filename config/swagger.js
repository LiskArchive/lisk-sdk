'use strict';

var SwaggerRunner = require('swagger-node-runner');
var path = require('path');
var fs = require('fs');
var YAML = require('js-yaml');

// Its necessary to require this file to extend swagger validator with our custom formats
var validator = require('../helpers/swagger').getValidator();

/**
 * Configure swagger node runner with the app.
 * It loads swagger specification and map every thing with an active express app
 * @requires swagger-node-runner
 * @requires path
 * @requires fs
 * @requires js-yaml
 * @module config:swagger
 * @param {Object} app - An express app to which map the swagger details
 * @param {Object} config - Application Configurations
 * @param {Object} logger - Application Logger
 * @param {Object} scope - Application Scope
 * @param {function} cb - Callback function.
 * @returns {void} 
 */
function bootstrapSwagger (app, config, logger, scope, cb) {

	// Load Swagger controllers and bind the scope
	var controllerFolder = '/api/controllers/';
	fs.readdirSync(config.root + controllerFolder).forEach(function (file) {
		require(config.root + controllerFolder + file)(scope);
	});

	var swagger = YAML.safeLoad(fs.readFileSync(path.join(config.root + '/schema/swagger.yml')).toString());

	var swaggerConfig = {
		appRoot: config.root,
		configDir: config.root + '/config/swagger',
		swagger: swagger,
		enforceUniqueOperationId: true,
		startWithErrors: false,
		startWithWarnings: false
	  };

	  SwaggerRunner.create(swaggerConfig, function (err, runner) {
		
		if (err) {
			// Some error occurred in configuring the swagger
			if (err.validationErrors) {
				logger.error('Swagger Validation Errors:');
				logger.error(err.validationErrors);
			}
			if (err.validationWarnings) {
				logger.error('Swagger Validation Warnings:');
				logger.error(err.validationWarnings);
			}
			cb(err);
			return;
		}

		// Swagger Express Middleware
		var swaggerExpress = runner.expressMiddleware();

		// Check the response and do appropriate on error
		runner.on('responseValidationError', function (validationResponse, request, response) {
			logger.error(validationResponse.errors);
		});
				
		// install middleware
		swaggerExpress.register(app);

		// To be used in test cases or getting configuration runtime
		app.swaggerRunner = runner;

		// Successfully mounted the swagger runner
		cb(null, {swaggerRunner: runner});
	});
}

module.exports = bootstrapSwagger;
