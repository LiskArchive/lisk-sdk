'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/delegates`
 * - Public API:
 * 	- get 	/
 * 	- get	/forgers
 * - Private API:
 * 	- put 	/forging
 * 	- get 	/forging
 * @memberof module:delegates
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} delegatesModule - Module delegate instance.
 * @param {scope} app - Network app.
 */
// Constructor
function DelegatesHttpApi (delegatesModule, app, logger, cache) {

	var router = new Router();

	// attach a middlware to endpoints
	router.attachMiddlwareForUrls(httpApi.middleware.useCache.bind(null, logger, cache), ['get /']);

	router.map(delegatesModule.shared, {
		'get /': 'getDelegates',
		'get /forgers': 'getForgers'
	}, {responseWithCode: true});

	router.map(delegatesModule.internal, {
		'put /forging': 'forgingToggle',
		'get /forging': 'forgingStatus'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/delegates', app, router, delegatesModule.isLoaded);
}

module.exports = DelegatesHttpApi;
