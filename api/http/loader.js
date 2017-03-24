'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

// Constructor
function LoaderHttpApi (loaderModule, app) {

	var router = new Router();

	router.map(loaderModule.shared, {
		'get /status': 'status',
		'get /status/sync': 'sync'
	});

	router.get('/status/ping', function (req, res) {
		var status = loaderModule.internal.statusPing();
		return res.status(status ? 200 : 503).json({success: status});
	});

	httpApi.registerEndpoint('/api/loader', app, router, loaderModule.isLoaded);
}

module.exports = LoaderHttpApi;
