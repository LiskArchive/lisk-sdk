'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

// Constructor
function SignaturesHttpApi (signaturesModule, app) {

	var router = new Router();

	router.map(signaturesModule.shared, {
		'get /fee': 'getFee',
		'put /': 'addSignature'
	});

	httpApi.registerEndpoint('/api/signatures', app, router, signaturesModule.isLoaded);
}

module.exports = SignaturesHttpApi;
