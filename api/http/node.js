'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/node`
 * - Public API:
 * 	- get	/constants
 * 	- get	/status
 * @memberof module:node
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} nodeModule - Module node instance.
 * @param {scope} app - Network app.
 */
// Constructor
function NodeHttpApi (nodeModule, app) {

	var router = new Router();

	router.map(nodeModule.shared, {
		'get /constants': 'getConstants',
		'get /status': 'getStatus'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/node', app, router, nodeModule.isLoaded);
}

module.exports = NodeHttpApi;
