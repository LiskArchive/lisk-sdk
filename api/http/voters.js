'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/voters`
 * - Public API:
 * 	- get	/
 * @memberof module:node
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} votersModule - Module node instance.
 * @param {scope} app - Network app.
 */
// Constructor
function VotersHttpApi (votersModule, app) {

	var router = new Router();

	router.map(votersModule.shared, {
		'get /': 'getVoters'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/voters', app, router, votersModule.isLoaded);
}

module.exports = VotersHttpApi;
