'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var config = require('../../config.json');

// Constructor
function MultisignaturesHttpApi (mutlisignaturesModule, app) {

	var router = new Router(config.api);

	router.map(mutlisignaturesModule.shared, {
		'get /pending': 'pending',
		'post /sign': 'sign',
		'put /': 'addMultisignature',
		'get /accounts': 'getAccounts'
	});

	httpApi.registerEndpoint('/api/multisignatures', app, router, mutlisignaturesModule.isLoaded);
}

module.exports = MultisignaturesHttpApi;
