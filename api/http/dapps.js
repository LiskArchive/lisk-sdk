'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/dapps');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/dapps`
 * - Sanitized
 * 	- get /
 * @memberof module:dapps
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} dappsModule - Module dapps instance.
 * @param {scope} app - Network app.
 */
// Constructor
function DappsHttpApi (dappsModule, app) {

	var router = new Router();

	router.map(dappsModule.shared, {
		'get /': 'list'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/dapps', app, router, dappsModule.isLoaded);
}

module.exports = DappsHttpApi;
