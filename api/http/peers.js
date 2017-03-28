'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

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
