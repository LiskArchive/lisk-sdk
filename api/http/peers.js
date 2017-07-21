'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/peers`
 * - Public API:
 * 	- get	/
 * 	- get	/version
 * 	- get	/get
 * 	- get	/count
 * @memberof module:peers
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} peersModule - Module peers instance.
 * @param {scope} app - Network app.
 */
// Constructor
function PeersHttpApi (peersModule, app) {

	var router = new Router();

	router.map(peersModule.shared, {
		'get /': 'getPeers',
		'get /version': 'version',
		'get /get': 'getPeer',
		'get /count': 'count'
	});

	httpApi.registerEndpoint('/api/peers', app, router, peersModule.isLoaded);
}

module.exports = PeersHttpApi;
