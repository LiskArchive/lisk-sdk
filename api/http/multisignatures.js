'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/multisignatures`
 * - Public API:
 * 	- get	/pending
 * 	- get	/accounts
 * @memberof module:multisignatures
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} mutlisignaturesModule - Module multisignatures instance.
 * @param {scope} app - Network app.
 * @todo correct typo mutlisignaturesModule
 */
// Constructor
function MultisignaturesHttpApi (multisignaturesModule, app) {

	var router = new Router();

	router.map(multisignaturesModule.shared, {
		'get /pending': 'pending',
		'get /accounts': 'getAccounts'
	});

	httpApi.registerEndpoint('/api/multisignatures', app, router, multisignaturesModule.isLoaded);
}

module.exports = MultisignaturesHttpApi;
