'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/signatures`
 * - Public API:
 * 	- post	/
 * @memberof module:signatures
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} signaturesModule - Module signatures instance.
 * @param {scope} app - Network app.
 */
function SignaturesHttpApi (signaturesModule, app) {

	var router = new Router();

	router.map(signaturesModule.shared, {
		'post /': 'postSignatures'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/signatures', app, router, signaturesModule.isLoaded);
}

module.exports = SignaturesHttpApi;
