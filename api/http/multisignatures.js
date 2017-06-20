'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/multisignatures`
 * - Public API:
 * 	- get	/pending
 * 	- post	/sign
 * 	- put	/
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
function MultisignaturesHttpApi (mutlisignaturesModule, app) {

	var router = new Router();

	router.map(mutlisignaturesModule.shared, {
		'get /pending': 'pending',
		'post /sign': 'sign',
		'put /': 'addMultisignature',
		'get /accounts': 'getAccounts'
	});

	httpApi.registerEndpoint('/api/multisignatures', app, router, mutlisignaturesModule.isLoaded);
}

module.exports = MultisignaturesHttpApi;
