'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/delegates`
 * - Public API:
 * 	- get 	/
 * 	- get 	/count
 * 	- get 	/search
 * 	- get 	/voters
 * 	- get 	/get
 * 	- get 	/fee
 * 	- get 	/forging/getForgedByAccount
 * 	- get	/getNextForgers
 * - Private API:
 * 	- post 	/forging/enable
 * 	- post 	/forging/disable
 * 	- get 	/forging/status
 * - Debug API:
 * 	- get	/forging/disableAll
 * 	- get	/forging/enableAll
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
		'get /count': 'count',
		'get /search': 'search',
		'get /voters': 'getVoters',
		'get /get': 'getDelegate',
		'get /fee': 'getFee',
		'get /forging/getForgedByAccount': 'getForgedByAccount',
		'get /getNextForgers': 'getNextForgers'
	});

	router.map(delegatesModule.internal, {
		'post /forging/enable': 'forgingEnable',
		'post /forging/disable': 'forgingDisable',
		'get /forging/status': 'forgingStatus'
	});

	if (process.env.DEBUG) {
		router.map(delegatesModule.internal, {
			'get /forging/disableAll': 'forgingDisableAll',
			'get /forging/enableAll': 'forgingEnableAll'
		});
	}

	httpApi.registerEndpoint('/api/delegates', app, router, delegatesModule.isLoaded);
}

module.exports = DelegatesHttpApi;
