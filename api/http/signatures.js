'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var config = require('../../config.json');

// Constructor
function SignaturesHttpApi (signaturesModule, app) {

	var router = new Router(config.api);

	router.map(signaturesModule.shared, {
		'get /fee': 'getFee',
		'put /': 'addSignature'
	});

	httpApi.registerEndpoint('/api/signatures', app, router, signaturesModule.isLoaded);
}

module.exports = SignaturesHttpApi;
