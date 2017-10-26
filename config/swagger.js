'use strict';

var SwaggerRunner = require('swagger-node-runner');
var path = require('path');
var fs = require('fs');
var YAML = require('js-yaml');

/**
 * Configure swagger node runner with the app.
 * It loads swagger specification and map every thing with an active express app
 * @requires swagger-node-runner
 * @requires path
 * @requires fs
 * @requires js-yaml
 * @module config:swagger
 * @param {object} app - An express app to which map the swagger details 
 * @param {object} config - Application Configurations
 * @param {object} logger - Application Logger
 * @param {function} cb - Callback function.
 * @returns {void} 
 */
function bootstrapSwagger(app, config, logger, cb) {

	var swagger = YAML.safeLoad(fs.readFileSync(path.join(config.root + '/schema/swagger.yml')).toString());

	var swaggerConfig = {
		appRoot: config.root,
		configDir: config.root + '/config/swagger',
		swagger: swagger,
		enforceUniqueOperationId: true,
		startWithErrors: false,
		startWithWarnings: true
	  };

	  SwaggerRunner.create(swaggerConfig, function(err, runner) {
		
		if (err) {
			// Some error occured in configuring the swagger
			cb('Swagger Runner Error : ' + err);
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
		cb(null, { swaggerRunner: runner });
	});
}

module.exports = bootstrapSwagger;
