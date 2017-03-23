'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

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
